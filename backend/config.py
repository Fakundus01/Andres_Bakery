import os


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

    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5174")
    BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL", "")

    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@bakery.local")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
    ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
    SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@bakery.local")
    DELIVERY_ZONE_NAME = os.getenv("DELIVERY_ZONE_NAME", "Villa Maip\u00fa")
    DELIVERY_FEE = os.getenv("DELIVERY_FEE", "2500")
    PICKUP_ADDRESS = os.getenv("PICKUP_ADDRESS", "Andres Bakery, Villa Maip\u00fa, General San Mart\u00edn")
