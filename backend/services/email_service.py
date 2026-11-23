import os
import random
import logging
import threading
from datetime import datetime, timedelta, timezone
import requests

logger = logging.getLogger("shortlistiq.email")

OTP_VALIDITY_MINUTES = 2
BREVO_API_URL = os.getenv("BREVO_API_URL", "https://api.brevo.com/v3/smtp/email")


def get_brevo_config() -> tuple[str, str, str]:
    """
    Retrieves the Brevo API configuration from environment variables.
    Returns: (api_key, sender_email, sender_name)
    """
    api_key = os.getenv("BREVO_API_KEY", "").strip()
    sender_email = os.getenv("BREVO_SENDER_EMAIL", "shortlistiq.official@gmail.com").strip()
    sender_name = os.getenv("BREVO_SENDER_NAME", "ShortlistIQ").strip()
    return api_key, sender_email, sender_name


def generate_otp() -> str:
    """Generates a secure 6-digit numeric OTP."""
    return str(random.randint(100000, 999999))


def get_otp_expiry(minutes: int = OTP_VALIDITY_MINUTES) -> datetime:
    """Returns the expiration datetime for an OTP in UTC."""
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)


def is_test_domain(email: str) -> bool:
    """Checks if an email belongs to a simulated testing domain."""
    lower = (email or '').lower()
    return (
        lower.endswith('@test.com')
        or lower.endswith('@example.com')
        or lower.endswith('.test')
        or lower.endswith('@localhost')
    )


def _dispatch_fallback_smtp(
    recipients: list[dict],
    subject: str,
    plain_text: str | None,
    html_content: str | None,
    sender_payload: dict
) -> bool:
    """
    Fallback transport using verified sender SMTP credentials.
    Automatically active while Brevo account transactional activation is pending,
    ensuring critical emails (OTPs, notifications) are never lost.
    """
    host = os.getenv('FALLBACK_SMTP_HOST') or os.getenv('SMTP_HOST')
    port = int(os.getenv('FALLBACK_SMTP_PORT') or os.getenv('SMTP_PORT', '587'))
    user = os.getenv('FALLBACK_SMTP_USER') or os.getenv('SMTP_USER')
    password = os.getenv('FALLBACK_SMTP_PASSWORD') or os.getenv('SMTP_PASSWORD')

    if not host or not user or not password:
        return False

    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    try:
        msg = MIMEMultipart('alternative')
        sender_email = sender_payload.get('email') or user
        sender_name = sender_payload.get('name') or 'ShortlistIQ'
        msg['From'] = f"{sender_name} <{sender_email}>"
        msg['Subject'] = subject

        if plain_text:
            msg.attach(MIMEText(plain_text, 'plain', 'utf-8'))
        if html_content:
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        to_emails = [r['email'] for r in recipients if 'email' in r]
        msg['To'] = ", ".join(to_emails)

        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(sender_email, to_emails, msg.as_string())

        print(f"[ShortlistIQ Email Transport] [OK] Successfully delivered via verified transport fallback to {', '.join(to_emails)}")
        return True
    except Exception as ex:
        print(f"[ShortlistIQ Email Transport] [ERROR] Fallback transport failed: {ex}")
        return False


def dispatch_brevo_email(
    to: str | list[dict | str],
    subject: str,
    plain_text: str | None = None,
    html_content: str | None = None,
    sender: dict | None = None,
    timeout: int = 10
) -> dict:
    """
    Centralized Brevo Transactional Email API dispatcher.
    Sends an email via POST https://api.brevo.com/v3/smtp/email.

    Returns:
        dict: {
            "success": bool,
            "message_id": str | None,
            "status_code": int | None,
            "error": str | None
        }
    """
    api_key, default_sender_email, default_sender_name = get_brevo_config()

    if not api_key:
        error_msg = "Brevo API key is not configured. Set BREVO_API_KEY in .env"
        print(f"[ShortlistIQ Brevo] [WARNING] {error_msg}")
        logger.warning(error_msg)
        return {
            "success": False,
            "message_id": None,
            "status_code": None,
            "error": error_msg
        }

    # Normalize sender
    if not sender:
        sender_payload = {
            "name": default_sender_name,
            "email": default_sender_email
        }
    elif isinstance(sender, dict):
        sender_payload = {
            "name": sender.get("name") or default_sender_name,
            "email": sender.get("email") or default_sender_email
        }
    else:
        sender_payload = {
            "name": default_sender_name,
            "email": str(sender).strip()
        }

    # Normalize recipients
    recipients = []
    if isinstance(to, str):
        recipients = [{"email": to.strip()}]
    elif isinstance(to, list):
        for item in to:
            if isinstance(item, str):
                recipients.append({"email": item.strip()})
            elif isinstance(item, dict) and "email" in item:
                recipients.append(item)
    else:
        error_msg = f"Invalid recipient specification: {to}"
        logger.error(f"[ShortlistIQ Brevo] {error_msg}")
        return {
            "success": False,
            "message_id": None,
            "status_code": None,
            "error": error_msg
        }

    if not recipients:
        error_msg = "No valid recipients specified."
        logger.error(f"[ShortlistIQ Brevo] {error_msg}")
        return {
            "success": False,
            "message_id": None,
            "status_code": None,
            "error": error_msg
        }

    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = {
        "sender": sender_payload,
        "to": recipients,
        "subject": subject
    }

    if html_content:
        payload["htmlContent"] = html_content
    if plain_text:
        payload["textContent"] = plain_text
    elif not html_content:
        payload["textContent"] = ""

    recipients_summary = ", ".join([r.get("email", "") for r in recipients])
    print(f"[ShortlistIQ Brevo] Sending email to '{recipients_summary}' | Subject: '{subject}'...")

    try:
        response = requests.post(
            BREVO_API_URL,
            headers=headers,
            json=payload,
            timeout=timeout
        )

        if response.status_code in (200, 201, 202):
            try:
                res_data = response.json()
            except Exception:
                res_data = {}
            message_id = res_data.get("messageId", "")
            print(f"[ShortlistIQ Brevo] [OK] Email accepted by Brevo. Message ID: {message_id}")
            logger.info(f"Email sent successfully to {recipients_summary}. MessageId: {message_id}")
            return {
                "success": True,
                "message_id": message_id,
                "status_code": response.status_code,
                "error": None
            }

        # Handle Brevo API errors
        try:
            err_data = response.json()
            err_code = err_data.get("code", f"http_{response.status_code}")
            err_msg = err_data.get("message", response.text)
        except Exception:
            err_code = f"http_{response.status_code}"
            err_msg = response.text

        detailed_error = f"{err_code}: {err_msg}"
        print(f"[ShortlistIQ Brevo] [FAILED] HTTP {response.status_code} - {detailed_error}")
        logger.error(f"Brevo API error for {recipients_summary} ({response.status_code}): {detailed_error}")

        # Attempt verified fallback transport while Brevo is pending activation
        fallback_ok = _dispatch_fallback_smtp(recipients, subject, plain_text, html_content, sender_payload)
        if fallback_ok:
            return {
                "success": True,
                "message_id": "fallback-transport",
                "status_code": 200,
                "error": None,
                "fallback_used": True
            }

        return {
            "success": False,
            "message_id": None,
            "status_code": response.status_code,
            "error": detailed_error
        }

    except requests.exceptions.Timeout:
        err_msg = f"Request timed out after {timeout} seconds connecting to Brevo API."
        print(f"[ShortlistIQ Brevo] [ERROR] {err_msg}")
        logger.error(err_msg)
        if _dispatch_fallback_smtp(recipients, subject, plain_text, html_content, sender_payload):
            return {"success": True, "message_id": "fallback-transport", "status_code": 200, "error": None, "fallback_used": True}
        return {
            "success": False,
            "message_id": None,
            "status_code": None,
            "error": err_msg
        }
    except requests.exceptions.RequestException as req_ex:
        err_msg = f"Network or connection error communicating with Brevo: {req_ex}"
        print(f"[ShortlistIQ Brevo] [ERROR] {err_msg}")
        logger.error(err_msg)
        if _dispatch_fallback_smtp(recipients, subject, plain_text, html_content, sender_payload):
            return {"success": True, "message_id": "fallback-transport", "status_code": 200, "error": None, "fallback_used": True}
        return {
            "success": False,
            "message_id": None,
            "status_code": None,
            "error": err_msg
        }
    except Exception as ex:
        err_msg = f"Unexpected error dispatching Brevo email: {ex}"
        print(f"[ShortlistIQ Brevo] [ERROR] {err_msg}")
        logger.error(err_msg)
        if _dispatch_fallback_smtp(recipients, subject, plain_text, html_content, sender_payload):
            return {"success": True, "message_id": "fallback-transport", "status_code": 200, "error": None, "fallback_used": True}
        return {
            "success": False,
            "message_id": None,
            "status_code": None,
            "error": err_msg
        }


# Top-level alias
send_brevo_email = dispatch_brevo_email


def send_otp_email(to_email: str, otp: str, name: str) -> bool:
    """
    Sends the 6-digit OTP verification code via Brevo Transactional Email API.
    Preserves existing email subject, template structure, and test bypass.
    """
    if is_test_domain(to_email):
        print(f"[ShortlistIQ OTP - TEST BYPASS] Email: {to_email} | OTP: {otp}")
        return True

    api_key, _, _ = get_brevo_config()
    if not api_key:
        print(f"[ShortlistIQ OTP - DEV MODE] Email: {to_email} | OTP: {otp}")
        print("  [WARNING] Brevo not configured. Set BREVO_API_KEY in .env")
        return True

    subject = "ShortlistIQ — Your Email Verification Code"
    plain = (
        f"Hello {name},\n\n"
        f"Your ShortlistIQ verification OTP is: {otp}.\n\n"
        f"This OTP is valid for {OTP_VALIDITY_MINUTES} minutes.\n\n"
        f"Regards,\n"
        f"ShortlistIQ Team"
    )

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e7ff; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">ShortlistIQ</h1>
            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">AI-Powered Resume Shortlisting System</p>
        </div>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">Hello <strong>{name}</strong>,</p>
            <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Thank you for joining ShortlistIQ. To verify your email address and activate your account, please use the following one-time verification code:
            </p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4338ca; background-color: #eef2ff; padding: 14px 32px; border-radius: 8px; border: 2px dashed #818cf8;">
                {otp}
            </div>
        </div>
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
                ⏱ This code will expire in <strong>{OTP_VALIDITY_MINUTES} minutes</strong>. If you did not request this verification, you can safely disregard this email.
            </p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            &copy; {datetime.now().year} ShortlistIQ. Delivered securely via Brevo API.
        </p>
    </div>
    """

    res = dispatch_brevo_email(to=to_email, subject=subject, plain_text=plain, html_content=html)
    if not res["success"]:
        # Log failure with full details and print fallback OTP for development/testing
        print(f"[ShortlistIQ OTP Fallback] Email: {to_email} | OTP: {otp}")
        print(f"  [NOTE] Brevo rejected message: {res['error']}")
        # We do not crash the user experience if Brevo account is pending activation,
        # but accurately record the failure status in logs
    return res["success"]


def send_shortlist_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    company_name: str = "ShortlistIQ",
    match_score: float = None
) -> bool:
    """
    Sends shortlisting notification email to a candidate via Brevo API.
    Runs asynchronously in a background thread to prevent blocking recruitment actions.
    """
    if is_test_domain(to_email):
        print(f"[ShortlistIQ Shortlist - TEST BYPASS] Email to: {to_email}")
        return True

    candidate_name = candidate_name or "Candidate"
    subject = f"Congratulations! You've been shortlisted for {job_title} at {company_name}"
    shortlist_date = datetime.now().strftime("%d %B %Y")
    score_display = f" (Match Score: {round(match_score)}%)" if match_score is not None else ""

    plain_text = (
        f"Dear {candidate_name},\n\n"
        f"Congratulations! We are pleased to inform you that you have been shortlisted for the following position:\n\n"
        f"Job Role: {job_title}\n"
        f"Company: {company_name}\n"
        f"Shortlisted On: {shortlist_date}\n\n"
        f"Based on your application and resume evaluation{score_display}, you have successfully qualified for the next stage of the recruitment process. "
        f"Our hiring team will contact you soon with further details regarding the interview process.\n\n"
        f"Thank you for your interest in joining {company_name}. We wish you all the best.\n\n"
        f"Best Regards,\n"
        f"{company_name} Recruitment Team via ShortlistIQ"
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #dcfce7; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 12px; margin-bottom: 8px;">
                <span style="font-size: 28px;">🎉</span>
            </div>
            <h1 style="color: #15803d; margin: 0; font-size: 24px; font-weight: 800;">Congratulations, You're Shortlisted!</h1>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">{company_name} &bull; ShortlistIQ ATS</p>
        </div>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0; color: #166534; font-size: 16px;">Dear <strong>{candidate_name}</strong>,</p>
            <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.6;">
                We are thrilled to inform you that following dynamic resume screening and evaluation, you have been shortlisted for:
            </p>
            <div style="background-color: #ffffff; border-radius: 6px; padding: 14px 18px; margin: 16px 0 0 0; border: 1px solid #86efac;">
                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #14532d;">{job_title}</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #4ade80;">Company: <strong style="color: #166534;">{company_name}</strong> &bull; Date: {shortlist_date}</p>
            </div>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Our hiring team is currently reviewing next-round schedules and will reach out to you with details regarding the technical interview.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            We wish you the very best in the upcoming selection stages!
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            ShortlistIQ &bull; Powered by Brevo Transactional Email API
        </p>
    </div>
    """

    def _send():
        try:
            dispatch_brevo_email(to=to_email, subject=subject, plain_text=plain_text, html_content=html_content)
        except Exception as ex:
            print(f"[ShortlistIQ Brevo] [ERROR] Shortlist email background task error: {ex}")

    threading.Thread(target=_send, daemon=True).start()
    return True


def send_approval_email(to_email: str, name: str, temp_password: str) -> bool:
    """
    Sends recruiter account approval notification with temporary login credentials via Brevo API.
    Runs asynchronously in a background thread.
    """
    if is_test_domain(to_email):
        print(f"[ShortlistIQ Approval - TEST BYPASS] Email to: {to_email} | Temp Password: {temp_password}")
        return True

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

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e7ff; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">Recruiter Account Approved!</h1>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Welcome to ShortlistIQ</p>
        </div>
        <p style="color: #1e293b; font-size: 15px;">Dear <strong>{name}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Your recruiter registration request has been reviewed and approved by the platform administrator. You can now access your recruiter dashboard using your temporary credentials below:
        </p>
        <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; color: #334155; font-size: 14px;"><strong>Login Email:</strong> <code style="color: #0f172a;">{to_email}</code></p>
            <p style="margin: 0; color: #334155; font-size: 14px;"><strong>Temporary Password:</strong> <code style="color: #4f46e5; font-size: 16px; font-weight: bold;">{temp_password}</code></p>
        </div>
        <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 0; color: #9a3412; font-size: 13px;">
                🔒 <strong>Security Notice:</strong> You will be required to choose a new password upon your first sign in before dashboard access is granted.
            </p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            ShortlistIQ Recruitment Platform &bull; Powered by Brevo API
        </p>
    </div>
    """

    def _send():
        try:
            dispatch_brevo_email(to=to_email, subject=subject, plain_text=plain_text, html_content=html_content)
        except Exception as ex:
            print(f"[ShortlistIQ Brevo] [ERROR] Approval email background task error: {ex}")

    threading.Thread(target=_send, daemon=True).start()
    return True


def send_rejection_email(to_email: str, name: str) -> bool:
    """
    Sends recruiter account rejection notification via Brevo API.
    Runs asynchronously in a background thread.
    """
    if is_test_domain(to_email):
        print(f"[ShortlistIQ Rejection - TEST BYPASS] Email to: {to_email}")
        return True

    subject = "ShortlistIQ — Recruiter Registration Status"
    plain_text = (
        f"Dear {name},\n\n"
        f"Thank you for your interest in registering as a recruiter on ShortlistIQ.\n\n"
        f"After reviewing your company registration details, we regret to inform you that your registration request could not be approved at this time. "
        f"If you believe this is a mistake or have additional documentation, please reach out to our support team.\n\n"
        f"Regards,\n"
        f"ShortlistIQ Team"
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fecaca; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 800;">Recruiter Registration Update</h1>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">ShortlistIQ Platform</p>
        </div>
        <p style="color: #1e293b; font-size: 15px;">Dear <strong>{name}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Thank you for applying to recruit on ShortlistIQ. Following a review of the submitted company credentials, we regret to inform you that your registration request could not be approved at this time.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            If you have additional verification details or believe this decision was made in error, please contact our support team.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            ShortlistIQ Administration &bull; Powered by Brevo API
        </p>
    </div>
    """

    def _send():
        try:
            dispatch_brevo_email(to=to_email, subject=subject, plain_text=plain_text, html_content=html_content)
        except Exception as ex:
            print(f"[ShortlistIQ Brevo] [ERROR] Rejection email background task error: {ex}")

    threading.Thread(target=_send, daemon=True).start()
    return True


def send_application_confirmation_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    company_name: str = "ShortlistIQ"
) -> bool:
    """
    Sends application confirmation email to candidate when they apply for a job via Brevo API.
    Runs asynchronously in a background thread.
    """
    if is_test_domain(to_email):
        print(f"[ShortlistIQ Confirmation - TEST BYPASS] Email to: {to_email}")
        return True

    candidate_name = candidate_name or "Candidate"
    subject = f"Application Received: {job_title} at {company_name}"
    applied_date = datetime.now().strftime("%d %B %Y")

    plain_text = (
        f"Dear {candidate_name},\n\n"
        f"Thank you for applying for the position of {job_title} at {company_name}.\n\n"
        f"We have successfully received your application and resume on {applied_date}. "
        f"Our recruitment team and AI evaluation engine are currently reviewing your profile.\n\n"
        f"You can track your application status anytime from your ShortlistIQ Candidate Dashboard.\n\n"
        f"Best regards,\n"
        f"{company_name} Hiring Team via ShortlistIQ"
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e7ff; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin: 0 0 16px 0;">Application Received</h2>
        <p>Dear <strong>{candidate_name}</strong>,</p>
        <p style="color: #475569; line-height: 1.6;">
            Your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been successfully submitted on {applied_date}.
        </p>
        <p style="color: #475569; line-height: 1.6;">
            You will receive email notifications as your application progresses through our screening and interview stages.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">ShortlistIQ &bull; Powered by Brevo API</p>
    </div>
    """

    def _send():
        try:
            dispatch_brevo_email(to=to_email, subject=subject, plain_text=plain_text, html_content=html_content)
        except Exception as ex:
            print(f"[ShortlistIQ Brevo] [ERROR] Confirmation email error: {ex}")

    threading.Thread(target=_send, daemon=True).start()
    return True


def send_status_update_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    status: str,
    company_name: str = "ShortlistIQ"
) -> bool:
    """
    Sends application status progression updates (interview, selected, hired, rejected) via Brevo API.
    Runs asynchronously in a background thread.
    """
    if is_test_domain(to_email):
        print(f"[ShortlistIQ Status Update - TEST BYPASS] Email to: {to_email}")
        return True

    candidate_name = candidate_name or "Candidate"
    formatted_status = status.replace('_', ' ').capitalize()
    subject = f"Application Status Update: {job_title} ({formatted_status})"

    plain_text = (
        f"Dear {candidate_name},\n\n"
        f"Your application status for the position of {job_title} at {company_name} has been updated to: {formatted_status}.\n\n"
        f"Please check your candidate dashboard on ShortlistIQ for details and upcoming schedule information.\n\n"
        f"Best regards,\n"
        f"{company_name} Hiring Team"
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e7ff; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin: 0 0 16px 0;">Application Status Update</h2>
        <p>Dear <strong>{candidate_name}</strong>,</p>
        <p style="color: #475569; line-height: 1.6;">
            Your application status for <strong>{job_title}</strong> at <strong>{company_name}</strong> has been updated to:
        </p>
        <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; padding: 8px 20px; font-weight: bold; font-size: 16px; border-radius: 6px; background-color: #e0e7ff; color: #4338ca;">
                {formatted_status}
            </span>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">ShortlistIQ &bull; Powered by Brevo API</p>
    </div>
    """

    def _send():
        try:
            dispatch_brevo_email(to=to_email, subject=subject, plain_text=plain_text, html_content=html_content)
        except Exception as ex:
            print(f"[ShortlistIQ Brevo] [ERROR] Status update email error: {ex}")

    threading.Thread(target=_send, daemon=True).start()
    return True
