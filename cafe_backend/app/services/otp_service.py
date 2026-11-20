import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone
from pathlib import Path
from fastapi import HTTPException, status
import os

OTP_EXPIRY_MINUTES = 10
TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "otp_email.html"


def generate_otp() -> str:
    """Generate a random 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def render_html_email(email: str, otp: str, purpose: str) -> tuple[str, str, str]:
    """
    Render both HTML and Plain Text versions of the artisan email template.
    Loads HTML structure from app/templates/otp_email.html.
    Returns: (subject, html_content, text_content)
    """
    configs = {
        "register": {
            "subject": "☕ Verify Your Admin Account - The Artisan Café",
            "headline": "Welcome to The Artisan Team",
            "subheadline": "ADMINISTRATOR REGISTRATION VERIFICATION",
            "message": "You are registering a new administrator account for <strong>The Artisan Café Operations Portal</strong>. Please use the single-use verification code below to complete your registration:",
            "action_note": "Once verified, you will have access to live menu customization, orders, and real-time inventory management.",
        },
        "login": {
            "subject": "🔑 Your One-Time Login Code - The Artisan Café",
            "headline": "Sign In Verification",
            "subheadline": "SINGLE-USE ADMIN PORTAL ACCESS",
            "message": "A sign-in request was initiated for your administrator account. Enter the one-time authentication code below to enter the portal:",
            "action_note": "If you did not attempt to sign in, please secure your account immediately.",
        },
        "reset_password": {
            "subject": "🛡️ Password Reset Verification - The Artisan Café",
            "headline": "Reset Your Password",
            "subheadline": "ACCOUNT SECURITY RECOVERY",
            "message": "We received a request to reset the password for your administrator account. Use the verification code below to set a new password:",
            "action_note": "If you did not request a password reset, you can safely ignore this email. Your existing password remains unchanged.",
        },
    }

    cfg = configs.get(purpose, configs["login"])

    # Format OTP as spaced digit pills
    otp_digits = list(otp)
    otp_pills_html = "".join(
        f'<span style="display:inline-block; width:38px; height:46px; line-height:46px; margin:0 4px; background:#FAF6F0; border:1.5px solid #D9C8B5; border-radius:6px; font-family:\'Courier New\', monospace, sans-serif; font-size:24px; font-weight:700; color:#8C4835; text-align:center;">{d}</span>'
        for d in otp_digits
    )

    # Load standalone HTML template file
    if TEMPLATE_PATH.exists():
        raw_html = TEMPLATE_PATH.read_text(encoding="utf-8")
        html_content = (
            raw_html.replace("{{subject}}", cfg["subject"])
            .replace("{{headline}}", cfg["headline"])
            .replace("{{subheadline}}", cfg["subheadline"])
            .replace("{{message}}", cfg["message"])
            .replace("{{otp_pills}}", otp_pills_html)
            .replace("{{expiry_minutes}}", str(OTP_EXPIRY_MINUTES))
            .replace("{{action_note}}", cfg["action_note"])
            .replace("{{year}}", str(datetime.now().year))
        )
    else:
        # Fallback inline minimal HTML if template file is not found
        html_content = f"<h2>{cfg['headline']}</h2><p>{cfg['message']}</p><h1>{otp}</h1>"

    text_content = f"""
THE ARTISAN CAFÉ - {cfg['subheadline']}
==================================================

{cfg['headline']}

{cfg['message'].replace('<strong>', '').replace('</strong>', '')}

YOUR VERIFICATION CODE:
>>> {otp} <<<

(This code is valid for {OTP_EXPIRY_MINUTES} minutes)

{cfg['action_note']}

SECURITY REMINDER:
Never share this code with anyone.

--
The Artisan Café
18 Park Street, Kolkata
Good Food • Better Days
"""

    return cfg["subject"], html_content, text_content


from app.config import settings


def send_otp_email(email: str, otp: str, purpose: str):
    """
    Send richly formatted HTML + Text email via SMTP using credentials in settings,
    and output formatted console block for local development.
    """
    smtp_host = settings.smtp_host
    smtp_port = settings.smtp_port or 587
    smtp_user = settings.smtp_user
    smtp_password = settings.smtp_password
    sender_name_email = settings.emails_from or (f"The Artisan Café <{smtp_user}>" if smtp_user else "noreply@theartisancafe.com")

    subject, html_content, text_content = render_html_email(email, otp, purpose)

    # Always log OTP in terminal console for easy development & testing
    print("\n" + "╔" + "═" * 58 + "╗")
    print(f"║ ☕ THE ARTISAN CAFÉ - EMAIL OTP DISPATCH")
    print(f"║ To: {email}")
    print(f"║ Purpose: {purpose.upper()}")
    print(f"║ OTP CODE: [ {otp} ] (Valid {OTP_EXPIRY_MINUTES} mins)")
    print("╚" + "═" * 58 + "╝\n")

    if smtp_host and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender_name_email
            msg["To"] = email

            # Attach plain text fallback first, then HTML
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12) as server:
                    server.login(smtp_user, smtp_password.strip())
                    server.sendmail(smtp_user, [email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_password.strip())
                    server.sendmail(smtp_user, [email], msg.as_string())

            print(f"✅ Email successfully delivered to {email} via SMTP ({smtp_host}:{smtp_port})")
        except Exception as e:
            print(f"⚠️ SMTP Send Failed to {email}: {type(e).__name__} - {e}")
    else:
        print("ℹ️ SMTP credentials not configured in settings. Check .env (SMTP_HOST, SMTP_USER, SMTP_PASSWORD).")



def create_and_send_otp(db, email: str, purpose: str) -> dict:
    """
    Generate OTP, store in database, and dispatch to email.
    """
    email_clean = email.strip().lower()
    otp = generate_otp()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    # Invalidate previous unused OTPs for this email and purpose
    db.otps.update_many(
        {"email": email_clean, "purpose": purpose, "used": False},
        {"$set": {"used": True, "invalidated_at": now}},
    )

    db.otps.insert_one({
        "email": email_clean,
        "otp": otp,
        "purpose": purpose,
        "expires_at": expires_at,
        "created_at": now,
        "used": False,
        "attempts": 0,
    })

    send_otp_email(email_clean, otp, purpose)
    return {
        "message": f"Verification code sent to {email_clean}",
        "expires_in_minutes": OTP_EXPIRY_MINUTES,
    }


def verify_otp_code(db, email: str, otp: str, purpose: str) -> bool:
    """
    Verify OTP validity, expiration, and mark as consumed.
    """
    email_clean = email.strip().lower()
    otp_clean = otp.strip()
    now = datetime.now(timezone.utc)

    record = db.otps.find_one({
        "email": email_clean,
        "purpose": purpose,
        "used": False,
    }, sort=[("created_at", -1)])

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification code found. Please request a new code.",
        )

    # Check expiration
    exp = record["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if now > exp:
        db.otps.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code.",
        )

    # Check max attempts (defend against brute force)
    attempts = record.get("attempts", 0) + 1
    db.otps.update_one({"_id": record["_id"]}, {"$set": {"attempts": attempts}})

    if attempts > 5:
        db.otps.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please request a new code.",
        )

    if record["otp"] != otp_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect verification code. Please try again.",
        )

    # Mark as used
    db.otps.update_one({"_id": record["_id"]}, {"$set": {"used": True, "verified_at": now}})
    return True
