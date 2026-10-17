import os
import re
import secrets
from pathlib import Path

from .env_file import load_env_file


# Primero el archivo, despues todo lo demas: `Config` resuelve sus `os.getenv`
# al importarse, asi que el .env tiene que estar cargado antes (D12).
ENV_FILE = os.getenv("ENV_FILE") or Path(__file__).resolve().parent / ".env"
LOADED_FROM_ENV_FILE = load_env_file(ENV_FILE)


def _parse_origins(raw_value: str) -> list[str]:
    if raw_value.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


def _flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///bakery.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Sin JWT_SECRET_KEY en el entorno se usa uno al azar por proceso: reiniciar
    # el back cierra las sesiones, pero nadie puede firmar un token de admin
    # con una clave que esta publicada en el repo.
    JWT_SECRET_FROM_ENV = bool(os.getenv("JWT_SECRET_KEY"))
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or secrets.token_urlsafe(48)

    MAIL_SERVER = os.getenv("MAIL_SERVER")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = _flag("MAIL_USE_TLS", "true")
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "no-reply@bakery.local")

    MERCADO_PAGO_ACCESS_TOKEN = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
    MERCADO_PAGO_PUBLIC_KEY = os.getenv("MERCADO_PAGO_PUBLIC_KEY")
    MERCADO_PAGO_API_BASE_URL = os.getenv("MERCADO_PAGO_API_BASE_URL", "https://api.mercadopago.com")
    PAYMENT_CURRENCY = os.getenv("PAYMENT_CURRENCY", "ars")
    PAYMENTS_ENABLED = _flag("PAYMENTS_ENABLED")

    FRONTEND_ORIGIN = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    )
    FRONTEND_ORIGINS = _parse_origins(FRONTEND_ORIGIN)
    BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "")

    # Sin default a proposito: el repo es publico y un usuario con clave conocida
    # es una puerta abierta el dia del deploy (D13). Si falta, no se crea admin.
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
    ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
    ADMIN_PASSWORD_RESET = _flag("ADMIN_PASSWORD_RESET")

    SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@bakery.local")
    DELIVERY_ZONE_NAME = os.getenv("DELIVERY_ZONE_NAME", "Villa Maipú")
    DELIVERY_FEE = os.getenv("DELIVERY_FEE", "2500")
    PICKUP_ADDRESS = os.getenv("PICKUP_ADDRESS", "Andres Bakery, Villa Maipú, General San Martín")

    # Solo digitos con pais. Si queda vacio, la UI dice que falta en vez de
    # armar un wa.me roto.
    WHATSAPP_PHONE = re.sub(r"\D", "", os.getenv("WHATSAPP_PHONE", ""))
