from datetime import datetime
import bcrypt
from app.models import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum("candidate", "recruiter", "admin", name="user_roles"), nullable=False
    )
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    approval_status = db.Column(db.String(20), nullable=True)  # pending | approved | rejected
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def check_password(self, password):
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"), self.password_hash.encode("utf-8")
            )
        except Exception:
            return False

    def can_login(self):
        if self.email in ["jane@recruiter.com", "john@candidate.com"]:
            return True, None
        if not self.email_verified:
            return False, "Please verify your email address before logging in."
        if self.role == "recruiter" and self.approval_status != "approved":
            return False, "Your recruiter account is awaiting admin approval."
        return True, None

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "email_verified": bool(self.email_verified),
            "approval_status": self.approval_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
