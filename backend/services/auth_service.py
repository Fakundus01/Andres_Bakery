from __future__ import annotations

from flask_jwt_extended import create_access_token  # type: ignore

from ..extensions import db
from ..models import User
from .base import ServiceBase
from .exceptions import AuthenticationError, ValidationError
from .serializers import Serializer


class AuthService(ServiceBase):
    def register(self, data: dict) -> dict:
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")

        if not name or not email or not password:
            raise ValidationError("name, email and password are required")
        if User.query.filter_by(email=email).first():
            raise ValidationError("email already registered")

        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return {
            "access_token": create_access_token(identity=str(user.id)),
            "user_id": user.id,
        }

    def login(self, data: dict) -> dict:
        email = (data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")

        if not email or not password:
            raise ValidationError("email and password are required")

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            raise AuthenticationError("invalid credentials")

        return {
            "access_token": create_access_token(identity=str(user.id)),
            "user_id": user.id,
        }

    def get_profile(self, user_identity: int | str | None) -> dict:
        user = self.require_entity(User, self.parse_identity(user_identity), "user")
        return Serializer.user(user)

    def list_users(self) -> list[dict]:
        users = User.query.order_by(User.created_at.desc()).all()
        return [
            Serializer.user(user, include_created_at=True)
            for user in users
        ]


auth_service = AuthService()
