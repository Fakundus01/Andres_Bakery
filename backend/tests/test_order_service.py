from __future__ import annotations

from decimal import Decimal

from backend.extensions import db
from backend.models import Order
from backend.services.exceptions import AuthorizationError, ValidationError
from backend.services.order_service import OrderService
from backend.tests.support import BackendServiceTestCase


class FakeNotificationService:
    def __init__(self) -> None:
        self.sent_order_ids: list[int] = []

    def send_order_created_notifications(
        self, order: Order, *, avisar_al_cliente: bool = True
    ) -> dict[str, str]:
        self.sent_order_ids.append(order.id)
        return {"customer": "sent", "admin": "sent"}


class OrderServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.notifications = FakeNotificationService()
        self.service = OrderService(notifications=self.notifications)

    def build_payload(self, *, product_id: int, neighborhood: str = "Villa Maipu") -> dict:
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

    def test_create_order_accepts_delivery_zone_without_accent(self) -> None:
        user = self.create_user()
        product = self.create_product(price="3200.00")

        response = self.service.create_order(user.id, self.build_payload(product_id=product.id))

        order = db.session.get(Order, response["order_id"])
        self.assertIsNotNone(order)
        self.assertEqual(order.delivery.neighborhood, "Villa Maipu")
        self.assertEqual(order.delivery.payment_method, "visa")
        self.assertEqual(order.total_amount, Decimal("8900.00"))
        self.assertEqual(response["emails"], {"customer": "sent", "admin": "sent"})
        self.assertEqual(self.notifications.sent_order_ids, [order.id])

    def test_create_order_rejects_unavailable_products(self) -> None:
        user = self.create_user(email="otro@test.local")
        product = self.create_product(available=False)

        with self.assertRaises(ValidationError):
            self.service.create_order(user.id, self.build_payload(product_id=product.id))

    def test_get_order_blocks_other_customers(self) -> None:
        owner = self.create_user(email="owner@test.local")
        intruder = self.create_user(email="intruder@test.local")
        order = self.create_order(user=owner, product=self.create_product(name="Torta owner"))

        with self.assertRaises(AuthorizationError):
            self.service.get_order(intruder.id, order.id)

    def test_list_orders_returns_all_orders_for_admin(self) -> None:
        admin = self.create_user(email="admin2@test.local", is_admin=True)
        user_a = self.create_user(email="a@test.local")
        user_b = self.create_user(email="b@test.local")
        product = self.create_product(name="Box premium")
        self.create_order(user=user_a, product=product)
        self.create_order(user=user_b, product=product, quantity=3)

        orders = self.service.list_orders(admin.id)

        self.assertEqual(len(orders), 2)
        self.assertEqual({order["user"]["email"] for order in orders}, {"a@test.local", "b@test.local"})

    def test_order_rejects_a_quantity_below_the_minimum(self) -> None:
        # El carrito ya lo impide, pero el que decide es el servidor (V4).
        user = self.create_user(email="minimo@test.local")
        product = self.create_product(name="Cookies de a 6", min_qty=6, qty_step=6)

        with self.assertRaises(ValidationError):
            self.service.create_order(user.id, self._payload(product, quantity=2))

    def test_order_rejects_a_quantity_off_the_step(self) -> None:
        user = self.create_user(email="salto@test.local")
        product = self.create_product(name="Cookies de a 6", min_qty=6, qty_step=6)

        with self.assertRaises(ValidationError):
            self.service.create_order(user.id, self._payload(product, quantity=7))

    def test_order_accepts_a_multiple_and_records_the_channel(self) -> None:
        user = self.create_user(email="multiplo@test.local")
        product = self.create_product(name="Cookies de a 6", min_qty=6, qty_step=6)

        response = self.service.create_order(
            user.id, self._payload(product, quantity=12) | {"channel": "whatsapp"}
        )

        order = db.session.get(Order, response["order_id"])
        self.assertEqual(order.channel, "whatsapp")
        self.assertEqual(order.items[0].quantity, 12)

    def test_order_rejects_an_invented_channel(self) -> None:
        user = self.create_user(email="canal@test.local")
        product = self.create_product(name="Box")

        with self.assertRaises(ValidationError):
            self.service.create_order(user.id, self._payload(product, quantity=1) | {"channel": "paloma"})

    @staticmethod
    def _payload(product, *, quantity: int) -> dict:
        return {
            "items": [{"product_id": product.id, "quantity": quantity}],
            "customer": {"name": "Cliente", "email": "cliente@test.local", "phone": "1122334455"},
            "delivery": {
                "method": "delivery",
                "address": "Calle 123",
                "neighborhood": "Villa Maipu",
                "city": "General San Martin",
            },
            "payment_method": "visa",
        }
