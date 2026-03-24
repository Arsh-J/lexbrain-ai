from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
from main import limiter
import random
import string
import logging
import json
from email_service import send_otp_email

logger = logging.getLogger(__name__)

# ── Redis helpers (mirrored from query.py pattern) ────────────────────────────
from redis_client import redis_client, REDIS_AVAILABLE

if not REDIS_AVAILABLE:
    try:
        import fakeredis
        redis_client = fakeredis.FakeRedis(decode_responses=True)
        logger.info("auth.py: Falling back to fakeredis automatically.")
    except ImportError:
        pass

def _redis_get(key: str):
    if redis_client is None: return None
    try: return redis_client.get(key)
    except Exception as e: logger.warning("Redis GET error (%s): %s", key, e); return None

def _redis_set(key: str, value: str, ex: int):
    if redis_client is None: return
    try: redis_client.set(key, value, ex=ex)
    except Exception as e: logger.warning("Redis SET error (%s): %s", key, e)

def _redis_delete(key: str):
    if redis_client is None: return
    try: redis_client.delete(key)
    except Exception as e: logger.warning("Redis DELETE error (%s): %s", key, e)

router = APIRouter()

@router.post("/signup", response_model=schemas.UserOut, status_code=201)
@limiter.limit("10/hour")
def signup(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        password=hash_password(user_data.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    # New users start with empty history — no cache pre-population
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    # Fast-fail before bcrypt: minimum password length we enforce at signup is 6
    if len(creds.password) < 6:
        raise HTTPException(status_code=401, detail="The password you entered is incorrect")

    user = db.query(models.User).filter(models.User.email == creds.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="This email is not registered with us")
    if not verify_password(creds.password, user.password):
        raise HTTPException(status_code=401, detail="The password you entered is incorrect")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user)):
    """Invalidate the user's Redis history cache on logout."""
    _redis_delete(f"history:{current_user.id}")
    logger.info("Cleared Redis cache for user %s on logout", current_user.id)
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
def forgot_password(body: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generate a 6-digit OTP and store it in Redis (TTL 600s / 10 min).
    Always returns success to prevent email enumeration.
    """
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if user:
        otp_code = "".join(random.choices(string.digits, k=6))
        _redis_set(f"otp:{body.email}", otp_code, ex=600)
        # Send OTP via Resend email service (falls back to console print if unavailable)
        email_sent = send_otp_email(body.email, otp_code)
        if email_sent:
            logger.info("OTP email sent to %s", body.email)
        else:
            logger.warning("OTP email failed for %s. Code: %s", body.email, otp_code)
    else:
        logger.info("Forgot-password called for unknown email — silent no-op")

    return {"message": "If this email exists, an OTP has been sent"}

@router.post("/verify-otp")
def verify_otp(body: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    """
    Verify OTP from Redis, then reset the user's password.
    """
    stored_otp = _redis_get(f"otp:{body.email}")
    if stored_otp is None or stored_otp != body.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user.password = hash_password(body.new_password)
    db.commit()
    _redis_delete(f"otp:{body.email}")
    logger.info("Password reset successful for user %s", user.id)
    return {"message": "Password reset successful"}
