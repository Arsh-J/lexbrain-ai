from fastapi import APIRouter, Depends, HTTPException, Request
import json
import logging
import os
from datetime import date, datetime, timedelta
import redis as redis_lib
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user
from main import limiter
import models, schemas
from agents.orchestrator import run_legal_analysis

logger = logging.getLogger(__name__)

from redis_client import redis_client, REDIS_AVAILABLE

if not REDIS_AVAILABLE:
    try:
        import fakeredis
        redis_client = fakeredis.FakeRedis(decode_responses=True)
        logger.info("query.py: Falling back to fakeredis automatically.")
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

def _redis_incr_with_ttl(key: str, ex: int) -> int | None:
    if redis_client is None: return None
    try:
        pipe = redis_client.pipeline()
        pipe.incr(key)
        pipe.ttl(key)
        new_val, ttl = pipe.execute()
        if ttl == -1: redis_client.expire(key, ex)
        elif ttl == -2: redis_client.expire(key, ex)
        return new_val
    except Exception as e: logger.warning("Redis INCR error (%s): %s", key, e); return None
router = APIRouter()

@router.post("/analyze", response_model=schemas.QueryResponse)
@limiter.limit("10/hour")
def analyze_query(
    request: Request,
    body: schemas.QueryRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # ── Session analyze limit (Redis) ─────────────────────────────────────────
    session_analyze_key = f"session_analyze:{current_user.id}"
    session_count = _redis_incr_with_ttl(session_analyze_key, ex=3600)
    if session_count is not None and session_count > 10:
        raise HTTPException(
            status_code=429,
            detail="Session analysis limit reached (10 cases per session). Please wait for a new session or try again in an hour."
        )

    # ── Impenetrable Database Limits (Survives Logout/Restarts) ───────────────
    # 1. Rolling 1-Hour strict limit (Max 10 per hour)
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    hourly_count = (
        db.query(models.UserQuery)
        .filter(models.UserQuery.user_id == current_user.id, models.UserQuery.timestamp >= one_hour_ago)
        .count()
    )
    if hourly_count >= 10:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. You can strictly analyze maximum 10 cases per hour. Please try again later."
        )

    # 2. Daily absolute limit (Max 15 per day)
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_count = (
        db.query(models.UserQuery)
        .filter(models.UserQuery.user_id == current_user.id, models.UserQuery.timestamp >= today_start)
        .count()
    )
    if today_count >= 15:
        raise HTTPException(
            status_code=429,
            detail="Daily limit of 15 cases reached. Please try again tomorrow."
        )

    if not body.query_text.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    analysis = run_legal_analysis(body.query_text)

    sections = []
    for s in analysis.get("relevant_sections", []):
        sections.append(schemas.IPCSectionOut(
            section_number=s.get("section_number", "N/A"),
            title=s.get("title", ""),
            description=s.get("description", ""),
            punishment=s.get("punishment", ""),
            fine=s.get("fine"),
            reference_link=s.get("reference_link")
        ))

    analysis_obj = schemas.LegalAnalysis(
        legal_category=analysis["legal_category"],
        summary=analysis["summary"],
        relevant_sections=sections,
        possible_outcomes=analysis.get("possible_outcomes", []),
        precautions=analysis.get("precautions", []),
        recommended_actions=analysis.get("recommended_actions", [])
    )

    db_query = models.UserQuery(
        user_id=current_user.id,
        query_text=body.query_text,
        analysis_result=analysis_obj.model_dump_json()
    )
    db.add(db_query)
    db.commit()
    db.refresh(db_query)

    # Invalidate cache
    _redis_delete(f"history:{current_user.id}")

    return schemas.QueryResponse(
        query_id=db_query.query_id,
        query_text=db_query.query_text,
        analysis=analysis_obj,
        timestamp=db_query.timestamp
    )


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    cache_key = f"history:{current_user.id}"

    # STEP 1: Redis first — always
    cached = _redis_get(cache_key)
    if cached is not None:
        logger.info("Cache HIT %s", cache_key)
        try:
            return json.loads(cached)
        except Exception:
            pass  # corrupted cache — fall through to DB

    # STEP 2: Cache miss — hit the database (filtered strictly by this user)
    logger.info("Cache MISS %s — querying DB", cache_key)
    queries = db.query(models.UserQuery).filter(
        models.UserQuery.user_id == current_user.id,
        models.UserQuery.query_text != ""
    ).order_by(models.UserQuery.timestamp.desc()).limit(50).all()

    result = [
        {
            "query_id": q.query_id,
            "query_text": q.query_text,
            "timestamp": q.timestamp.isoformat() if q.timestamp else "",
        }
        for q in queries
    ]

    # STEP 3: Store in Redis immediately (5 minute TTL)
    _redis_set(cache_key, json.dumps(result), ex=300)
    logger.info("Cached %s for 300s (%d items)", cache_key, len(result))

    # STEP 4: Return
    return result


@router.get("/{query_id}")
def get_query(
    query_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # ── Session case-open limit ───────────────────────────────────────────────
    session_key = f"session:{current_user.id}"
    opens = _redis_incr_with_ttl(session_key, ex=3600)
    if opens is not None and opens > 20:
        raise HTTPException(
            status_code=429,
            detail="Session case limit reached (20 cases per session). Please start a new session or try again later."
        )

    q = db.query(models.UserQuery).filter(
        models.UserQuery.query_id == query_id,
        models.UserQuery.user_id == current_user.id,
        models.UserQuery.query_text != ""
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")

    analysis_data = json.loads(q.analysis_result) if q.analysis_result else {}
    return {
        "query_id": q.query_id,
        "query_text": q.query_text,
        "analysis": analysis_data,
        "timestamp": q.timestamp.isoformat() if q.timestamp else "",
    }


@router.delete("/history")
def delete_all_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db.query(models.UserQuery).filter(
        models.UserQuery.user_id == current_user.id
    ).update({
        "query_text": "",
        "analysis_result": ""
    }, synchronize_session=False)
    db.commit()
    _redis_delete(f"history:{current_user.id}")
    return {"message": "All history deleted"}


@router.delete("/{query_id}")
def delete_query(
    query_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.UserQuery).filter(
        models.UserQuery.query_id == query_id,
        models.UserQuery.user_id == current_user.id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")
    q.query_text = ""
    q.analysis_result = ""
    db.commit()
    _redis_delete(f"history:{current_user.id}")
    return {"message": "Deleted"}
