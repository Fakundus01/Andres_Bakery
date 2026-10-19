from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from pathlib import Path
import unittest
from uuid import uuid4

from backend.app_factory import create_app
from backend.tests.fabricas import FabricasDeDatos
from backend.extensions import db
from backend.models import (
    Ingredient,
    Option,
    OptionGroup,
    Order,
    OrderDelivery,
    OrderItem,
    Payment,
    Product,
    ProductVariant,
    Tag,
    User,
)
from backend.services.slug import unique_slug


class BackendServiceTestCase(FabricasDeDatos, unittest.TestCase):
    def setUp(self) -> None:
        tmp_root = Path(__file__).resolve().parent / ".tmp"
        tmp_root.mkdir(parents=True, exist_ok=True)
        self.database_path = tmp_root / f"services-{uuid4().hex}.db"
        database_path = self.database_path.resolve()
        self.app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
                "JWT_SECRET_KEY": "clave-de-test-de-32-bytes-o-mas-para-hmac",
                "ADMIN_EMAIL": "admin@test.local",
                "ADMIN_PASSWORD": "admin123",
                "ADMIN_NAME": "Admin Test",
                "MAIL_SERVER": None,
                "MAIL_DEFAULT_SENDER": "no-reply@test.local",
                "FRONTEND_ORIGIN": "http://localhost:5174",
                "DELIVERY_ZONE_NAME": "Villa Maipú",
                "DELIVERY_FEE": "2500",
                "PAYMENT_CURRENCY": "ars",
                "PAYMENTS_ENABLED": True,
                # Apagado por default: si no, 10 logins de una suite agotan el
                # tope y el test que falla no es el que mide el limite (ADR-026).
                "RATE_LIMIT_ENABLED": False,
            }
        )
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self) -> None:
        try:
            db.session.remove()
            db.drop_all()
            for engine in db.engines.values():
                engine.dispose()
            self._borrar_la_base()
        finally:
            self.app_context.pop()

    def _borrar_la_base(self) -> None:
        # Cada test deja su SQLite en `tests/.tmp`. Sin esto se acumulan ~190
        # archivos por corrida: habia 4644 cuando lo noto la review.
        try:
            self.database_path.unlink(missing_ok=True)
        except OSError:
            pass


class ApiTestCase(unittest.TestCase):
    """App de test + cliente HTTP + los atajos de autenticacion.

    Vive aca y no en `test_api.py` porque lo usan varios archivos de tests: si
    uno heredara del otro, unittest correria la suite entera del padre de nuevo
    en cada hijo (pasó: 13 tests nuevos aparecian como 23).
    """

    def setUp(self) -> None:
        tmp_root = Path(__file__).resolve().parent / ".tmp"
        tmp_root.mkdir(parents=True, exist_ok=True)
        self.database_path = tmp_root / f"api-{uuid4().hex}.db"
        database_path = self.database_path.resolve()
        self.app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path.as_posix()}",
                "JWT_SECRET_KEY": "clave-de-test-de-32-bytes-o-mas-para-hmac",
                "ADMIN_EMAIL": "admin@test.local",
                "ADMIN_PASSWORD": "admin123",
                "ADMIN_NAME": "Admin Test",
                "MAIL_SERVER": None,
                "FRONTEND_ORIGIN": "http://localhost:5173,http://localhost:5174",
                "DELIVERY_ZONE_NAME": "Villa Maipú",
                "DELIVERY_FEE": "2500",
                "PAYMENTS_ENABLED": True,
                # Apagado por default: si no, 10 logins de una suite agotan el
                # tope y el test que falla no es el que mide el limite (ADR-026).
                "RATE_LIMIT_ENABLED": False,
            }
        )
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            for engine in db.engines.values():
                engine.dispose()
            self._borrar_la_base()

    def _borrar_la_base(self) -> None:
        try:
            self.database_path.unlink(missing_ok=True)
        except OSError:
            pass

    def auth_headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def register_user(self, *, name: str = "Cliente Test", email: str = "cliente@test.local") -> str:
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": name,
                "email": email,
                "password": "secret123",
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.get_json()["access_token"]

    def first_product_id(self) -> int:
        with self.app.app_context():
            product = Product.query.order_by(Product.id.asc()).first()
            self.assertIsNotNone(product)
            return product.id

    def admin_token(self) -> str:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "admin@test.local", "password": "admin123"},
        )
        self.assertEqual(response.status_code, 200)
        return response.get_json()["access_token"]

    def build_order_payload(self, *, product_id: int, neighborhood: str = "Villa Maipú") -> dict:
        return {
            "items": [{"product_id": product_id, "quantity": 2}],
            "customer": {
                "name": "Cliente Test",
                "email": "cliente@test.local",
                "phone": "1122334455",
            },
            "delivery": {
                "method": "delivery",
                "address": "Calle 123",
                "neighborhood": neighborhood,
                "city": "General San Martin",
                "notes": "Timbre 2",
            },
            "payment_method": "visa",
        }
