import os
import requests
import random
import smtplib
import ssl
import threading
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import Config

# ── OTP validity constant (2 minutes) ─────────────────────────────────────────
OTP_VALIDITY_MINUTES = 2


def generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"


def get_otp_expiry(minutes: int = OTP_VALIDITY_MINUTES) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)


def _build_otp_html(name: str, otp: str) -> str:
    """Return a premium HTML email body for OTP delivery."""
    # Render each OTP digit in its own styled box for large, clear display
    otp_digits_html = "".join(
        f'<span style="display:inline-block;width:52px;height:64px;line-height:64px;'
        f'text-align:center;background:#ffffff;border:2.5px solid #4f46e5;'
        f'border-radius:12px;font-size:38px;font-weight:800;color:#0f172a;'
        f'font-family:\'Courier New\',monospace;margin:0 6px;'
        f'box-shadow:0 4px 10px rgba(0,0,0,0.15);">{d}</span>'
        for d in otp
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Verification — ShortlistIQ</title>
</head>
<body style="margin:0;padding:0;background:#060d1f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:linear-gradient(180deg,#060d1f 0%,#0a1628 100%);padding:48px 0 56px;">
    <tr>
      <td align="center">

        <!-- ════ Card ════ -->
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#0f1e36;border-radius:20px;
                      border:1px solid #1e3a5f;
                      box-shadow:0 32px 80px rgba(0,0,0,0.6);">

          <!-- ── Top accent bar ── -->
          <tr>
            <td style="padding:0;">
              <div style="height:4px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#06b6d4);
                          border-radius:20px 20px 0 0;"></div>
            </td>
          </tr>

          <!-- ── Logo / Brand ── -->
          <tr>
            <td align="center" style="padding:40px 48px 24px;">

              <!-- Logo badge -->
              <div style="display:inline-flex;align-items:center;gap:10px;
                          background:linear-gradient(135deg,#312e81 0%,#1e1b4b 100%);
                          border:1px solid #4338ca;border-radius:14px;
                          padding:12px 24px;">
                <!-- SVG icon -->
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"
                     xmlns="http://www.w3.org/2000/svg">
                  <rect width="28" height="28" rx="8" fill="url(#g1)"/>
                  <path d="M7 14 C7 10.134 10.134 7 14 7 C17.866 7 21 10.134 21 14"
                        stroke="#a5b4fc" stroke-width="2.5" stroke-linecap="round"/>
                  <circle cx="14" cy="14" r="3" fill="#818cf8"/>
                  <path d="M14 17 L14 21" stroke="#a5b4fc" stroke-width="2.5"
                        stroke-linecap="round"/>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="28" y2="28"
                                    gradientUnits="userSpaceOnUse">
                      <stop stop-color="#4f46e5"/>
                      <stop offset="1" stop-color="#7c3aed"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span style="color:#fff;font-size:20px;font-weight:800;
                             letter-spacing:0.5px;font-family:'Segoe UI',Arial,sans-serif;">
                  Shortlist<span style="color:#818cf8;">IQ</span>
                </span>
              </div>

              <!-- Tagline under logo -->
              <p style="margin:10px 0 0;font-size:11px;color:#475569;
                        letter-spacing:1.5px;text-transform:uppercase;">
                Secure Recruitment Platform
              </p>
            </td>
          </tr>

          <!-- ── Heading ── -->
          <tr>
            <td style="padding:0 48px 6px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#4f46e5;
                        letter-spacing:2px;text-transform:uppercase;font-weight:600;">
                Welcome to ShortlistIQ
              </p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;
                         color:#f1f5f9;line-height:1.2;">
                Verify Your Email Address
              </h1>
              <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.65;">
                Hi <strong style="color:#e2e8f0;">{name}</strong>,<br/>
                Use the one-time code below to activate your ShortlistIQ account.
              </p>
            </td>
          </tr>

          <!-- ── OTP box ── -->
          <tr>
            <td align="center" style="padding:32px 48px 12px;">
              <div style="background:#0a1628;border:2px solid #312e81;
                          border-radius:16px;padding:32px 40px;display:inline-block;">
                <p style="margin:0 0 14px;font-size:11px;color:#475569;
                           letter-spacing:2.5px;text-transform:uppercase;font-weight:600;">
                  One-Time Verification Code
                </p>
                <!-- Individual digit boxes -->
                <div style="display:block;white-space:nowrap;">
                  {otp_digits_html}
                </div>
              </div>
            </td>
          </tr>

          <!-- ── Branding line ── -->
          <tr>
            <td align="center" style="padding:18px 48px 0;">
              <p style="margin:0;font-size:11px;color:#334155;
                        letter-spacing:1px;text-transform:uppercase;">
                For Candidates &bull; Recruiters &bull; Administrators
              </p>
            </td>
          </tr>

          <!-- ── Expiry notice ── -->
          <tr>
            <td style="padding:20px 48px 32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.8;">
                ⏱&nbsp; This code expires in
                <strong style="color:#f59e0b;">2 minutes</strong>. Do not share it.<br/>
                If you did not create a ShortlistIQ account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="padding:0 48px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#1e3a5f,transparent);"></div>
            </td>
          </tr>

          <!-- ── Support + Footer ── -->
          <tr>
            <td style="padding:24px 48px 36px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#475569;font-weight:600;">
                Need help?
              </p>
              <p style="margin:0 0 14px;font-size:12px;color:#475569;">
                Contact us at&nbsp;
                <a href="mailto:shortlistiq.official@gmail.com"
                   style="color:#6366f1;text-decoration:none;font-weight:600;">
                  shortlistiq.official@gmail.com
                </a>
              </p>
              <p style="margin:0;font-size:11px;color:#334155;line-height:1.7;">
                &copy; 2026 ShortlistIQ &bull; AI-Powered Recruitment Platform<br/>
                <span style="color:#1e3a5f;">
                  For Candidates, Recruiters &amp; Administrators
                </span>
              </p>
            </td>
          </tr>

          <!-- ── Bottom accent bar ── -->
          <tr>
            <td style="padding:0;">
              <div style="height:3px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#06b6d4);
                          border-radius:0 0 20px 20px;opacity:0.5;"></div>
            </td>
          </tr>

        </table>
        <!-- /card -->

      </td>
    </tr>
  </table>
</body>
</html>"""


def _smtp_send(to_email: str, otp: str, name: str) -> None:
    subject = "ShortlistIQ — Your Email Verification Code"

    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {os.environ['RESEND_API_KEY']}",
            "Content-Type": "application/json",
        },
        json={
            "from": "onboarding@resend.dev",
            "to": [to_email],
            "subject": subject,
            "html": _build_otp_html(name, otp),
            "text": f"Your OTP is {otp}",
        },
    )

    if response.status_code not in (200, 201):
        raise RuntimeError(response.text)

    print(f"[ShortlistIQ] [OK] OTP email delivered to {to_email}")

def send_otp_email(to_email: str, otp: str, name: str) -> bool:
    """
    Dispatch the OTP email synchronously.
    - If SMTP credentials are set → send synchronously so we can raise
      RuntimeError on SMTP failure and roll back database transactions.
    - Falls back to console log when running without credentials (dev mode)
      or when sending to test domains to avoid hitting rate limits.
    """
    # ── Test domain bypass (e.g., @test.com or @example.com) ─────────────
    if to_email.lower().endswith(('@test.com', '@example.com', '.test')):
        print(f"[ShortlistIQ OTP - TEST BYPASS] Email: {to_email} | OTP: {otp}")
        return True

    smtp_host = Config.SMTP_HOST
    smtp_user = Config.SMTP_USER
    smtp_password = Config.SMTP_PASSWORD

    # ── Dev fallback (no SMTP configured) ────────────────────────────────
    if not smtp_host or not smtp_user or not smtp_password:
        print(f"[ShortlistIQ OTP - DEV] Email: {to_email} | OTP: {otp}")
        print("  [WARNING] SMTP not configured. Set SMTP_HOST / SMTP_USER / SMTP_PASSWORD in .env")
        return True

    # ── Send synchronously ───────────────────────────────────────────────
    try:
        _smtp_send(to_email, otp, name)
        return True
    except Exception as exc:
        raise RuntimeError(f"Email delivery failed: {str(exc)}")


def send_shortlist_email(to_email: str, candidate_name: str, job_title: str, company_name: str = "Our Company", match_score: float = None) -> bool:
    """
    Sends a shortlist email notification to a candidate.
    """
    # ── Test domain bypass (e.g., @test.com or @example.com) ─────────────
    if to_email.lower().endswith(('@test.com', '@example.com', '.test')):
        print(f"[ShortlistIQ Shortlist - TEST BYPASS] Email to: {to_email}")
        return True

    smtp_host = Config.SMTP_HOST
    smtp_user = Config.SMTP_USER
    smtp_password = Config.SMTP_PASSWORD
    smtp_port = Config.SMTP_PORT
    smtp_from = Config.SMTP_FROM or smtp_user

    candidate_name = candidate_name or "Candidate"
    subject = f"Congratulations! You've been shortlisted for {job_title} at {company_name}"

    shortlist_date = datetime.now().strftime("%d %B %Y")

    plain_text = (
        f"Dear {candidate_name},\n\n"
        f"Congratulations! We are pleased to inform you that you have been shortlisted for the following position:\n\n"
        f"Job Role: {job_title}\n"
        f"Company: {company_name}\n"
        f"Shortlisted On: {shortlist_date}\n\n"
        f"Based on your application and resume evaluation, you have successfully qualified for the next stage of the recruitment process. Our hiring team will contact you soon with further details regarding the interview process.\n\n"
        f"Thank you for your interest in joining {company_name}. We wish you all the best.\n\n"
        f"Best Regards,\n"
        f"ShortlistIQ Recruitment Team"
    )

    if not smtp_host or not smtp_user or not smtp_password:
        print(f"[ShortlistIQ Shortlist - DEV] Email to: {to_email}")
        print(plain_text)
        print("  [WARNING] SMTP not configured. Set SMTP_HOST / SMTP_USER / SMTP_PASSWORD in .env")
        return True

    msg = MIMEMultipart("alternative")
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(plain_text, "plain"))

    def _bg_send():
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, [to_email], msg.as_string())
            print(f"[ShortlistIQ] [OK] Shortlist email delivered to {to_email}")
        except Exception as exc:
            print(f"[ShortlistIQ] [ERROR] Shortlist email error: {exc}")

    thread = threading.Thread(target=_bg_send, daemon=True)
    thread.start()
    return True


def send_approval_email(to_email: str, name: str, temp_password: str) -> bool:
    """
    Sends an approval email containing the temporary password.
    """
    if to_email.lower().endswith(('@test.com', '@example.com', '.test')):
        print(f"[ShortlistIQ Approval - TEST BYPASS] Email to: {to_email} | Temp Password: {temp_password}")
        return True

    smtp_host = Config.SMTP_HOST
    smtp_user = Config.SMTP_USER
    smtp_password = Config.SMTP_PASSWORD
    smtp_port = Config.SMTP_PORT
    smtp_from = Config.SMTP_FROM or smtp_user

    subject = "ShortlistIQ — Recruiter Account Approved!"
    plain_text = (
        f"Dear {name},\n\n"
        f"Congratulations! Your recruiter account has been approved by the Administrator.\n\n"
        f"You can now log in using the following credentials:\n"
        f"Login Email: {to_email}\n"
        f"Temporary Password: {temp_password}\n\n"
        f"Important: For security reasons, you will be required to change your password during your first login before you can access the dashboard.\n\n"
        f"Regards,\n"
        f"ShortlistIQ Team"
    )

    if not smtp_host or not smtp_user or not smtp_password:
        print(f"[ShortlistIQ Approval - DEV] Email to: {to_email} | Temp Password: {temp_password}")
        print(plain_text)
        return True

    msg = MIMEMultipart("alternative")
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(plain_text, "plain"))

    def _bg_send():
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, [to_email], msg.as_string())
            print(f"[ShortlistIQ] [OK] Approval email delivered to {to_email}")
        except Exception as exc:
            print(f"[ShortlistIQ] [ERROR] Approval email error: {exc}")

    thread = threading.Thread(target=_bg_send, daemon=True)
    thread.start()
    return True


def send_rejection_email(to_email: str, name: str) -> bool:
    """
    Sends a rejection email explaining the recruiter registration request was not approved.
    """
    if to_email.lower().endswith(('@test.com', '@example.com', '.test')):
        print(f"[ShortlistIQ Rejection - TEST BYPASS] Email to: {to_email}")
        return True

    smtp_host = Config.SMTP_HOST
    smtp_user = Config.SMTP_USER
    smtp_password = Config.SMTP_PASSWORD
    smtp_port = Config.SMTP_PORT
    smtp_from = Config.SMTP_FROM or smtp_user

    subject = "ShortlistIQ — Recruiter Registration Status"
    plain_text = (
        f"Dear {name},\n\n"
        f"Thank you for your interest in registering as a recruiter on ShortlistIQ.\n\n"
        f"After reviewing your company registration details, we regret to inform you that your registration request could not be approved at this time. If you believe this is a mistake, please reach out to us.\n\n"
        f"Regards,\n"
        f"ShortlistIQ Team"
    )

    if not smtp_host or not smtp_user or not smtp_password:
        print(f"[ShortlistIQ Rejection - DEV] Email to: {to_email}")
        print(plain_text)
        return True

    msg = MIMEMultipart("alternative")
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(plain_text, "plain"))

    def _bg_send():
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, [to_email], msg.as_string())
            print(f"[ShortlistIQ] [OK] Rejection email delivered to {to_email}")
        except Exception as exc:
            print(f"[ShortlistIQ] [ERROR] Rejection email error: {exc}")

    thread = threading.Thread(target=_bg_send, daemon=True)
    thread.start()
    return True

