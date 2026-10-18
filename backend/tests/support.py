from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from pathlib import Path
import unittest
from uuid import uuid4

from backend.app_factory import create_app
from backend.extensions import db
from backend.models import Ingredient, Order, OrderDelivery, OrderItem, Payment, Product, Tag, User
from backend.services.slug import unique_slug


class BackendServiceTestCase(unittest.TestCase):
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

    def create_user(
        self,
        *,
        name: str = "Cliente Test",
        email: str = "cliente@test.local",
        password: str = "secret123",
        is_admin: bool = False,
    ) -> User:
        user = User(name=name, email=email, is_admin=is_admin)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    def create_ingredient(self, *, name: str, unit: str = "u") -> Ingredient:
        ingredient = Ingredient(name=name, unit=unit)
        db.session.add(ingredient)
        db.session.commit()
        return ingredient

    def create_product(
        self,
        *,
        name: str = "Cookie Test",
        price: str = "1500.00",
        category: str = "cookies",
        available: bool = True,
        unit_label: str = "unidad",
        min_qty: int = 1,
        qty_step: int = 1,
        ingredients: list[Ingredient] | None = None,
        tags: list[Tag] | None = None,
    ) -> Product:
        product = Product(
            name=name,
            slug=unique_slug(Product, name),
            description=f"Descripcion de {name}",
            price=Decimal(price),
            category=category,
            available=available,
            unit_label=unit_label,
            min_qty=min_qty,
            qty_step=qty_step,
            image_url="https://example.com/product.jpg",
        )
        if ingredients is not None:
            product.ingredients = list(ingredients)
        if tags is not None:
            product.tags = list(tags)
        db.session.add(product)
        db.session.commit()
        return product

    def create_tag(self, *, name: str = "sin TACC", color_token: str = "acento") -> Tag:
        tag = Tag(name=name, slug=unique_slug(Tag, name, fallback="etiqueta"), color_token=color_token)
        db.session.add(tag)
        db.session.commit()
        return tag

    def create_order(
        self,
        *,
        user: User,
        product: Product,
        quantity: int = 1,
        status: str = "pending",
        delivery_method: str = "delivery",
        neighborhood: str = "Villa Maipu",
        payment_method: str = "visa",
        shipping_amount: str = "2500.00",
        created_at: datetime | None = None,
    ) -> Order:
        shipping = Decimal(shipping_amount) if delivery_method == "delivery" else Decimal("0.00")
        unit_price = Decimal(str(product.price))
        order = Order(user_id=user.id, status=status, total_amount=(unit_price * quantity) + shipping)
        # Sin fecha explicita vale `utcnow`, y un test que fija "hoy" a mano
        # queda atado al reloj: los dos del resumen de metricas se pusieron
        # rojos solos al cruzar la medianoche UTC.
        if created_at is not None:
            order.created_at = created_at
        db.session.add(order)
        db.session.flush()
        db.session.add(OrderItem(order=order, product=product, quantity=quantity, unit_price=unit_price))
        order.delivery = OrderDelivery(
            customer_name=user.name,
            customer_email=user.email,
            customer_phone="1122334455",
            delivery_method=delivery_method,
            address="Calle 123" if delivery_method == "delivery" else None,
            neighborhood=neighborhood,
            city="General San Martin",
            shipping_amount=shipping,
            notes="Timbre 2",
            payment_method=payment_method,
        )
        db.session.commit()
        return order

    def create_payment(
        self,
        *,
        order: Order,
        provider_payment_id: str = "pay-1",
        status: str = "pending",
        amount: str | None = None,
    ) -> Payment:
        payment = Payment(
            order_id=order.id,
            provider="mercado_pago",
            provider_payment_id=provider_payment_id,
            amount=Decimal(amount or str(order.total_amount)),
            currency="ars",
            status=status,
        )
        db.session.add(payment)
        db.session.commit()
        return payment


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
