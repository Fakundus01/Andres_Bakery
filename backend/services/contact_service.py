from __future__ import annotations

from flask import current_app
from flask_mail import Message  # type: ignore

from ..extensions import mail
from .exceptions import ConfigurationError, ExternalServiceError, ValidationError


class ContactService:
    def send(self, data: dict) -> dict:
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        message = (data.get("message") or "").strip()

        if not name or not email or not message:
            raise ValidationError("name, email and message are required")
        if not current_app.config.get("MAIL_SERVER"):
            raise ConfigurationError("mail service not configured")

        msg = Message(
            subject=f"Consulta de {name}",
            sender=current_app.config["MAIL_DEFAULT_SENDER"],
            recipients=[current_app.config["SUPPORT_EMAIL"]],
            body=f"De: {name} <{email}>\n\n{message}",
        )
        try:
            mail.send(msg)
        except Exception as exc:  # pragma: no cover - depends on SMTP configuration
            raise ExternalServiceError(str(exc)) from exc
        return {"status": "sent"}


contact_service = ContactService()
