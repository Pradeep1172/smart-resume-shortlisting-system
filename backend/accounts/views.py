import os
import time
import json
from datetime import datetime, timezone
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from accounts.models import User
from accounts.auth import generate_token, auth_required
from services.email_service import (
    generate_otp, get_otp_expiry, send_otp_email, OTP_VALIDITY_MINUTES
)

ALLOWED_LOGO_EXTS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}


def _get_uploads_dir():
    folder = getattr(settings, 'MEDIA_ROOT', None)
    if not folder:
        folder = os.path.abspath(os.path.join(os.path.dirname(settings.BASE_DIR), 'uploads'))
    os.makedirs(folder, exist_ok=True)
    return folder


@api_view(['POST'])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def register(request):
    data = request.data
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    role = (data.get('role') or '').strip().lower()

    if not name or not email or not password or not role:
        return JsonResponse({"message": "All fields are required (name, email, password, role)"}, status=400)

    if role not in ('candidate', 'recruiter'):
        return JsonResponse({"message": "Invalid role. Choose candidate or recruiter."}, status=400)

    company_name = None
    comp_details = {}

    if role == 'recruiter':
        company_details_raw = data.get('company_details')
        if company_details_raw:
            if isinstance(company_details_raw, str):
                try:
                    comp_details = json.loads(company_details_raw)
                except Exception:
                    comp_details = {}
            elif isinstance(company_details_raw, dict):
                comp_details = company_details_raw

        check_keys = [
            "company_name", "company_website", "company_email", "hr_email",
            "phone", "company_address", "industry", "company_size", "company_description"
        ]
        for k in check_keys:
            val = data.get(k)
            if val and not comp_details.get(k):
                comp_details[k] = val

        if comp_details.get("company_name"):
            company_name = str(comp_details["company_name"])

    logo_file = request.FILES.get('logo')
    if logo_file:
        ext = logo_file.name.rsplit('.', 1)[-1].lower() if '.' in logo_file.name else ''
        if ext not in ALLOWED_LOGO_EXTS:
            return JsonResponse({"message": "Invalid logo file type. Allowed: jpg, jpeg, png, webp, gif"}, status=400)

    existing = User.objects.filter(email=email).first()
    if existing:
        if existing.email_verified:
            return JsonResponse({"message": "User with this email already exists!"}, status=409)

        try:
            existing.name = name
            existing.set_password(password)
            existing.role = role
            existing.approval_status = "pending" if role == "recruiter" else None

            if role == "recruiter":
                existing.company = company_name
                existing.company_details = json.dumps(comp_details)

                if logo_file:
                    ext = logo_file.name.rsplit('.', 1)[-1].lower()
                    timestamp = int(time.time())
                    filename = f"recruiter_{existing.id}_{timestamp}.{ext}"
                    logos_dir = os.path.join(_get_uploads_dir(), "logos")
                    os.makedirs(logos_dir, exist_ok=True)
                    file_path = os.path.join(logos_dir, filename)
                    with open(file_path, 'wb') as dest:
                        for chunk in logo_file.chunks():
                            dest.write(chunk)
                    existing.company_logo_path = file_path

            otp = generate_otp()
            existing.otp_code = otp
            existing.otp_expires_at = get_otp_expiry(OTP_VALIDITY_MINUTES)
            existing.save()

            send_otp_email(existing.email, otp, existing.name)

            return JsonResponse({
                "message": "A pending registration already exists for this email. A new verification code has been sent to your inbox.",
                "needs_verification": True,
                "email": existing.email,
                "role": existing.role,
                "otp": otp
            }, status=200)
        except Exception as ex:
            return JsonResponse({"message": f"Pending registration update failed: {ex}"}, status=500)

    try:
        new_user = User(
            name=name,
            email=email,
            role=role,
            email_verified=False,
            approval_status="pending" if role == "recruiter" else None,
            created_at=datetime.now(timezone.utc)
        )
        new_user.set_password(password)

        if role == "recruiter":
            new_user.company = company_name
            new_user.company_details = json.dumps(comp_details)

        new_user.save()

        if role == "recruiter" and logo_file:
            ext = logo_file.name.rsplit('.', 1)[-1].lower()
            timestamp = int(time.time())
            filename = f"recruiter_{new_user.id}_{timestamp}.{ext}"
            logos_dir = os.path.join(_get_uploads_dir(), "logos")
            os.makedirs(logos_dir, exist_ok=True)
            file_path = os.path.join(logos_dir, filename)
            with open(file_path, 'wb') as dest:
                for chunk in logo_file.chunks():
                    dest.write(chunk)
            new_user.company_logo_path = file_path

        otp = generate_otp()
        new_user.otp_code = otp
        new_user.otp_expires_at = get_otp_expiry(OTP_VALIDITY_MINUTES)
        new_user.save()

        send_otp_email(new_user.email, otp, new_user.name)

        return JsonResponse({
            "message": "Registration successful. Please verify your email with the OTP sent to your inbox.",
            "needs_verification": True,
            "email": new_user.email,
            "role": new_user.role,
            "otp": otp
        }, status=201)
    except Exception as ex:
        return JsonResponse({"message": f"Registration failed: {ex}"}, status=500)


@api_view(['POST'])
def verify_otp(request):
    data = request.data
    email = (data.get('email') or '').strip().lower()
    otp = (data.get('otp') or '').strip()

    if not email or not otp:
        return JsonResponse({"message": "Email and OTP are required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"message": "Account not found"}, status=404)

    if user.email_verified:
        return JsonResponse({
            "message": "Email already verified.",
            "role": user.role,
            "verified": True
        }, status=200)

    if not user.otp_code or user.otp_code != otp:
        return JsonResponse({"message": "Invalid verification code. Please try again."}, status=400)

    now = datetime.now(timezone.utc)
    # Ensure otp_expires_at is timezone-aware
    exp = user.otp_expires_at
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if not exp or exp < now:
        return JsonResponse({"message": "Verification code has expired. Please request a new one."}, status=400)

    user.email_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    user.save()

    if user.role == "recruiter":
        return JsonResponse({
            "message": "Email verified successfully. Your recruiter account is awaiting admin approval.",
            "role": user.role,
            "verified": True,
            "awaiting_approval": True
        }, status=200)

    return JsonResponse({
        "message": "Email verified successfully. You can now sign in.",
        "role": user.role,
        "verified": True,
        "awaiting_approval": False
    }, status=200)


@api_view(['POST'])
def resend_otp(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return JsonResponse({"message": "Email is required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"message": "Account not found"}, status=404)

    if user.email_verified:
        return JsonResponse({"message": "Email is already verified."}, status=400)

    try:
        otp = generate_otp()
        user.otp_code = otp
        user.otp_expires_at = get_otp_expiry(OTP_VALIDITY_MINUTES)
        user.save()

        send_otp_email(user.email, otp, user.name)

        return JsonResponse({
            "message": f"A new verification code has been sent to your email. It expires in {OTP_VALIDITY_MINUTES} minutes."
        }, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to resend code: {ex}"}, status=500)


@api_view(['POST'])
def login(request):
    data = request.data
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not email or not password:
        return JsonResponse({"message": "Email and password are required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user or not user.check_password(password):
        return JsonResponse({"message": "Invalid email or password!"}, status=401)

    can_login, block_message = user.check_can_login()
    if not can_login:
        payload = {"message": block_message}
        if user.role == "recruiter" and user.email_verified and user.approval_status != "approved":
            payload["awaiting_approval"] = True
        if not user.email_verified:
            payload["needs_verification"] = True
        return JsonResponse(payload, status=403)

    try:
        user.last_login_at = datetime.now(timezone.utc)
        user.save(update_fields=['last_login_at'])
    except Exception as ex:
        print(f"Failed to update last login: {ex}")

    token = generate_token(user)

    return JsonResponse({
        "message": "Login successful!",
        "token": token,
        "user": user.to_dict()
    }, status=200)


@api_view(['GET'])
@auth_required()
def get_profile(request):
    return JsonResponse({
        "user": request.current_user.to_dict()
    }, status=200)


@api_view(['POST'])
@auth_required()
def change_password(request):
    new_password = (request.data.get('new_password') or '').strip()
    if not new_password or len(new_password) < 6:
        return JsonResponse({"message": "New password must be at least 6 characters long."}, status=400)

    try:
        user = request.current_user
        user.set_password(new_password)
        user.must_change_password = False
        user.save()

        return JsonResponse({
            "message": "Password updated successfully!",
            "user": user.to_dict()
        }, status=200)
    except Exception as ex:
        return JsonResponse({"message": f"Failed to update password: {ex}"}, status=500)
