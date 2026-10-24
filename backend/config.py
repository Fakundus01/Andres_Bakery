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

    # Topes del pedido publico (F23, ADR-025). No son reglas de negocio: son
    # anti-basura de una ruta que cualquiera puede llamar. Andrea los puede
    # subir por entorno si algun dia le encargan 40 productos distintos.
    ORDER_MAX_LINES = int(os.getenv("ORDER_MAX_LINES", "30"))
    ORDER_MAX_UNITS = int(os.getenv("ORDER_MAX_UNITS", "1000"))

    # Tope de requests por IP (D2, ADR-026). En memoria del proceso: ver las
    # limitaciones en services/rate_limit.py antes de confiarse.
    RATE_LIMIT_ENABLED = _flag("RATE_LIMIT_ENABLED", "true")

    # Subida de fotos (F45, ADR-018). UPLOAD_DIR vacio => <raiz>/instance/uploads.
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "")
    UPLOAD_MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", str(4 * 1024 * 1024)))
    # El tope de Flask corta la request antes de leerla entera; el margen deja
    # pasar el resto del multipart (bordes, headers de la parte) sin recortar
    # una imagen que si entra en el tope real del servicio.
    MAX_CONTENT_LENGTH = UPLOAD_MAX_BYTES + 512 * 1024

    # Fotos en Cloudinary (ADR-032). Sin las tres primeras, las fotos van al
    # disco local: la capa de almacenamiento lo decide sola.
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")
    CLOUDINARY_FOLDER = os.getenv("CLOUDINARY_FOLDER", "Andres_Bakery")

    # Foto de referencia del cliente (F59). Mas chica que la del panel a
    # proposito: la sube un anonimo. 0 en la cuota = sin tope (no recomendado
    # con la ruta publica prendida).
    REFERENCE_UPLOAD_MAX_BYTES = int(os.getenv("REFERENCE_UPLOAD_MAX_BYTES", str(2 * 1024 * 1024)))
    UPLOAD_QUOTA_BYTES = int(os.getenv("UPLOAD_QUOTA_BYTES", str(500 * 1024 * 1024)))
    # Techo propio de lo que sube cualquiera, para que el anonimo no le
    # coma el lugar a las fotos de la carta (review de T18).
    REFERENCE_UPLOAD_QUOTA_BYTES = int(
        os.getenv("REFERENCE_UPLOAD_QUOTA_BYTES", str(100 * 1024 * 1024))
    )
    REFERENCE_UPLOAD_TTL_HOURS = int(os.getenv("REFERENCE_UPLOAD_TTL_HOURS", "24"))

    # Asistente de recetas (F46, ADR-020). Sin llave no se prende ni con
    # AI_ENABLED=true: cuesta plata por llamada y el default es apagado.
    AI_ENABLED = _flag("AI_ENABLED")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    AI_MODEL = os.getenv("AI_MODEL", "claude-opus-5-5")
    AI_DAILY_LIMIT = int(os.getenv("AI_DAILY_LIMIT", "25"))
