import os


def _parse_origins(raw_value: str) -> list[str]:
    if raw_value.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///bakery.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change")

    MAIL_SERVER = os.getenv("MAIL_SERVER")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "no-reply@bakery.local")

    MERCADO_PAGO_ACCESS_TOKEN = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
    MERCADO_PAGO_PUBLIC_KEY = os.getenv("MERCADO_PAGO_PUBLIC_KEY")
    MERCADO_PAGO_API_BASE_URL = os.getenv("MERCADO_PAGO_API_BASE_URL", "https://api.mercadopago.com")
    PAYMENT_CURRENCY = os.getenv("PAYMENT_CURRENCY", "ars")

    FRONTEND_ORIGIN = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    )
    FRONTEND_ORIGINS = _parse_origins(FRONTEND_ORIGIN)
    BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "")

    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "andreacastilloarraez18@gmail.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
    ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
    SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@bakery.local")
    DELIVERY_ZONE_NAME = os.getenv("DELIVERY_ZONE_NAME", "Villa Maipú")
    DELIVERY_FEE = os.getenv("DELIVERY_FEE", "2500")
    PICKUP_ADDRESS = os.getenv("PICKUP_ADDRESS", "Andres Bakery, Villa Maipú, General San Martín")
