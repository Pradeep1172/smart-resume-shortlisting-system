import os
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from django.http import JsonResponse
from accounts.models import User

JWT_SECRET_KEY = (
    os.getenv('JWT_SECRET_KEY')
    or os.getenv('SECRET_KEY')
    or "and0X3NlY3JldF9rZXlfZm9yX3Jlc3VtZV9zaG9ydGxpc3Rpbmc="
)


def generate_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": str(user.id),
        "nameid": str(user.id),
        "role": user.role,
        "email": user.email,
        "name": user.name,
        "exp": now + timedelta(hours=24),
        "iat": now
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
    except Exception:
        return None


class JwtAuthMiddleware:
    """
    Middleware that reads JWT from Authorization: Bearer <token> or ?token=<token>
    and sets request.current_user.
    Also blocks users with must_change_password=True except on allowed endpoints.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
        elif "token" in request.GET:
            token = request.GET.get("token")

        request.current_user = None

        if token:
            payload = decode_token(token)
            if payload:
                user_id = payload.get("user_id") or payload.get("nameid")
                if user_id:
                    try:
                        user = User.objects.filter(id=int(user_id)).first()
                        if user:
                            request.current_user = user

                            # Check must_change_password
                            if user.must_change_password:
                                path = request.path.rstrip('/')
                                if path not in ("/api/auth/change-password", "/api/auth/me"):
                                    return JsonResponse({
                                        "message": "You must change your temporary password before accessing the system.",
                                        "must_change_password": True
                                    }, status=403)
                    except Exception:
                        pass

        return self.get_response(request)


def auth_required(*allowed_roles):
    """
    Decorator for views requiring authentication and optional role checking.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, 'current_user', None)
            if not user:
                return JsonResponse({"message": "Authentication required!"}, status=401)

            if allowed_roles and user.role not in allowed_roles:
                return JsonResponse({"message": "Access forbidden: unauthorized role!"}, status=403)

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
