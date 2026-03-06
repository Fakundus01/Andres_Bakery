from __future__ import annotations

from decimal import Decimal

from backend.extensions import db
from backend.models import Order, Payment
from backend.services.exceptions import AuthorizationError
from backend.services.payment_service import PaymentService
from backend.tests.support import BackendServiceTestCase


class FakeMercadoPagoClient:
    def __init__(self) -> None:
        self.preference_calls: list[tuple[int, str]] = []
        self.payment_payloads: dict[str, dict] = {}

    def create_preference(self, order: Order, requested_method: str) -> dict:
        self.preference_calls.append((order.id, requested_method))
        return {
            "id": f"pref-{order.id}",
            "init_point": f"https://mp.local.test/checkout/{order.id}",
            "sandbox_init_point": f"https://sandbox.mp.local.test/checkout/{order.id}",
        }

    def get_payment(self, payment_id: str) -> dict:
        return self.payment_payloads[payment_id]


class PaymentServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.client = FakeMercadoPagoClient()
        self.service = PaymentService(client=self.client)

    def test_create_checkout_persists_payment_record(self) -> None:
        user = self.create_user()
        order = self.create_order(user=user, product=self.create_product(price="4000.00"), quantity=2)

        response = self.service.create_checkout(user.id, {"order_id": order.id, "payment_method": "mastercard"})

        payment = db.session.get(Payment, response["payment_id"])
        self.assertIsNotNone(payment)
        self.assertEqual(payment.provider_payment_id, f"pref-{order.id}")
        self.assertEqual(payment.amount, Decimal("10500.00"))
        self.assertEqual(payment.status, "checkout_created")
        self.assertEqual(response["selected_method"], "mastercard")
        self.assertEqual(self.client.preference_calls, [(order.id, "mastercard")])

    def test_create_checkout_rejects_orders_from_other_user(self) -> None:
        owner = self.create_user(email="owner@test.local")
        intruder = self.create_user(email="intruder@test.local")
        order = self.create_order(user=owner, product=self.create_product(name="Brownie test"))

        with self.assertRaises(AuthorizationError):
            self.service.create_checkout(intruder.id, {"order_id": order.id, "payment_method": "visa"})

    def test_process_webhook_updates_existing_payment_and_order_status(self) -> None:
        user = self.create_user(email="pagos@test.local")
        order = self.create_order(user=user, product=self.create_product(price="5200.00"))
        payment = self.create_payment(order=order, provider_payment_id="pay-123", status="checkout_created", amount="7700.00")
        self.client.payment_payloads["pay-123"] = {
            "id": "pay-123",
            "external_reference": str(order.id),
            "transaction_amount": 7700.00,
            "currency_id": "ARS",
            "status": "approved",
        }

        payload, status_code = self.service.process_webhook({"type": "payment", "data.id": "pay-123"}, {})

        db.session.refresh(payment)
        db.session.refresh(order)
        self.assertEqual(status_code, 200)
        self.assertEqual(payload["status"], "processed")
        self.assertEqual(payment.status, "approved")
        self.assertEqual(payment.currency, "ars")
        self.assertEqual(order.status, "paid")

    def test_process_webhook_ignores_unknown_events(self) -> None:
        payload, status_code = self.service.process_webhook({"type": "topic"}, {})

        self.assertEqual(status_code, 200)
        self.assertEqual(payload, {"status": "ignored"})
