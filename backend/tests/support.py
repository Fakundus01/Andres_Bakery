from __future__ import annotations

from decimal import Decimal
from pathlib import Path
import unittest
from uuid import uuid4

from backend.app_factory import create_app
from backend.extensions import db
from backend.models import Ingredient, Order, OrderDelivery, OrderItem, Payment, Product, User


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
                "JWT_SECRET_KEY": "test-secret",
                "ADMIN_EMAIL": "admin@test.local",
                "ADMIN_PASSWORD": "admin123",
                "ADMIN_NAME": "Admin Test",
                "MAIL_SERVER": None,
                "MAIL_DEFAULT_SENDER": "no-reply@test.local",
                "FRONTEND_ORIGIN": "http://localhost:5174",
                "DELIVERY_ZONE_NAME": "Villa Maipú",
                "DELIVERY_FEE": "2500",
                "PAYMENT_CURRENCY": "ars",
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
        finally:
            self.app_context.pop()

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
        ingredients: list[Ingredient] | None = None,
    ) -> Product:
        product = Product(
            name=name,
            description=f"Descripcion de {name}",
            price=Decimal(price),
            category=category,
            available=available,
            image_url="https://example.com/product.jpg",
        )
        if ingredients is not None:
            product.ingredients = list(ingredients)
        db.session.add(product)
        db.session.commit()
        return product

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
    ) -> Order:
        shipping = Decimal(shipping_amount) if delivery_method == "delivery" else Decimal("0.00")
        unit_price = Decimal(str(product.price))
        order = Order(user_id=user.id, status=status, total_amount=(unit_price * quantity) + shipping)
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
