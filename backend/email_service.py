import resend
import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load .env once at module init with override=True so it always wins over
# any stale system env vars. uvicorn --reload restarts the worker process,
# so this runs fresh on every hot-reload.
load_dotenv(override=True)

# ── Pre-built HTML template (no per-call string building) ─────────────────────
_OTP_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0F172A;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#0F172A;padding:40px 0;">
    <tr><td align="center">
      <table width="500" cellpadding="0" cellspacing="0"
             style="background:#1A1F2E;border-radius:12px;
                    padding:40px;border:1px solid #2D3748;">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="color:#E8A838;margin:0;font-size:28px;">&#9878;&#65039; LexBrain AI</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h2 style="color:#FFF;margin:0;font-size:20px;">Password Reset Request</h2>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="color:#9CA3AF;margin:0;font-size:14px;line-height:1.6;">
            You requested to reset your LexBrain AI password.<br/>
            Use the OTP below. It expires in <strong style="color:#E8A838;">10 minutes</strong>.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <div style="background:#0F172A;border:2px solid #E8A838;
                      border-radius:10px;padding:24px 48px;display:inline-block;">
            <span style="font-size:40px;font-weight:bold;
                         color:#E8A838;letter-spacing:10px;">__OTP__</span>
          </div>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <p style="color:#6B7280;margin:0;font-size:12px;">
            Expires in <strong style="color:#E8A838;">10 minutes</strong>.
          </p>
        </td></tr>
        <tr><td align="center">
          <p style="color:#4B5563;margin:0;font-size:11px;">
            If you did not request this, ignore this email.<br/>
            Your account remains secure.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP via Resend API. Returns True on success, False on any failure."""
    api_key    = os.getenv("RESEND_API_KEY", "").strip()
    from_email = os.getenv("FROM_EMAIL", "onboarding@resend.dev").strip()

    if not api_key or api_key == "re_your_api_key_here":
        logger.warning(
            "RESEND_API_KEY not set. "
            "Edit backend/.env → RESEND_API_KEY=re_xxxx → restart uvicorn."
        )
        print(f"[EMAIL NOT SENT — no key] OTP for {to_email}: {otp}")
        return False

    try:
        resend.api_key = api_key
        resend.Emails.send({
            "from":    from_email,
            "to":      [to_email],
            "subject": "LexBrain AI — Password Reset OTP",
            "html":    _OTP_HTML_TEMPLATE.replace("__OTP__", otp),
        })
        logger.info("OTP email sent to %s", to_email)
        return True

    except Exception as e:
        logger.error("Resend failed for %s: %s", to_email, e)
        print(f"[EMAIL FAILED] OTP for {to_email}: {otp}")
        return False
