from __future__ import annotations

from pathlib import Path
import unittest
from uuid import uuid4
from unittest.mock import patch

from backend.app_factory import create_app
from backend.extensions import db
from backend.models import Product
from backend.services.payment_service import payment_service


class FakeMercadoPagoClient:
    def __init__(self) -> None:
        self.order_id: int | None = None
        self.order_total: float = 0.0

    def create_preference(self, order, requested_method: str) -> dict:
        self.order_id = order.id
        self.order_total = float(order.total_amount)
        return {
            "id": f"pref-{order.id}",
            "init_point": "https://mp.local.test/checkout",
            "sandbox_init_point": "https://sandbox.mp.local.test/checkout",
            "requested_method": requested_method,
        }

    def get_payment(self, payment_id: str) -> dict:
        return {
            "id": payment_id,
            "external_reference": str(self.order_id),
            "transaction_amount": self.order_total,
            "currency_id": "ARS",
            "status": "approved",
        }


class BackendApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        tmp_root = Path(__file__).resolve().parent / ".tmp"
        tmp_root.mkdir(parents=True, exist_ok=True)
        self.database_path = tmp_root / f"api-{uuid4().hex}.db"
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
                "FRONTEND_ORIGIN": "http://localhost:5173,http://localhost:5174",
                "DELIVERY_ZONE_NAME": "Villa Maipú",
                "DELIVERY_FEE": "2500",
                "PAYMENTS_ENABLED": True,
            }
        )
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            for engine in db.engines.values():
                engine.dispose()

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

    def test_cors_reflects_allowed_origin(self) -> None:
        response = self.client.options(
            "/api/products",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertIn(response.status_code, {200, 204})
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")
        self.assertEqual(response.headers.get("Vary"), "Origin")

    def test_register_login_and_profile_roundtrip(self) -> None:
        token = self.register_user()

        profile_response = self.client.get("/api/auth/me", headers=self.auth_headers(token))
        self.assertEqual(profile_response.status_code, 200)
        profile_data = profile_response.get_json()
        self.assertEqual(profile_data["name"], "Cliente Test")
        self.assertEqual(profile_data["email"], "cliente@test.local")

        login_response = self.client.post(
            "/api/auth/login",
            json={
                "email": "cliente@test.local",
                "password": "secret123",
            },
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertIn("access_token", login_response.get_json())

    def test_order_creation_persists_history(self) -> None:
        token = self.register_user()
        payload = self.build_order_payload(product_id=self.first_product_id())

        create_response = self.client.post(
            "/api/orders",
            json=payload,
            headers=self.auth_headers(token),
        )
        self.assertEqual(create_response.status_code, 201)
        create_data = create_response.get_json()
        self.assertEqual(create_data["emails"]["customer"], "skipped: mail service not configured")
        self.assertGreater(create_data["total"], 0)

        history_response = self.client.get("/api/orders", headers=self.auth_headers(token))
        self.assertEqual(history_response.status_code, 200)
        orders = history_response.get_json()
        self.assertEqual(len(orders), 1)
        order = orders[0]
        self.assertEqual(order["delivery"]["neighborhood"], "Villa Maipú")
        self.assertEqual(order["delivery"]["payment_method"], "visa")
        self.assertEqual(order["items"][0]["quantity"], 2)

    def test_order_creation_rejects_delivery_outside_villa_maipu(self) -> None:
        token = self.register_user(email="otro@test.local")
        payload = self.build_order_payload(product_id=self.first_product_id(), neighborhood="Caseros")

        response = self.client.post(
            "/api/orders",
            json=payload,
            headers=self.auth_headers(token),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Villa Maipú", response.get_json()["error"])

    def test_payment_checkout_and_webhook_mark_order_paid(self) -> None:
        token = self.register_user(email="pagos@test.local")
        order_response = self.client.post(
            "/api/orders",
            json=self.build_order_payload(product_id=self.first_product_id()),
            headers=self.auth_headers(token),
        )
        self.assertEqual(order_response.status_code, 201)
        order_id = order_response.get_json()["order_id"]

        fake_client = FakeMercadoPagoClient()
        with patch.object(payment_service, "client", fake_client):
            checkout_response = self.client.post(
                "/api/payments/checkout",
                json={"order_id": order_id, "payment_method": "mastercard"},
                headers=self.auth_headers(token),
            )
            self.assertEqual(checkout_response.status_code, 200)
            checkout_data = checkout_response.get_json()
            self.assertEqual(checkout_data["selected_method"], "mastercard")
            self.assertEqual(checkout_data["checkout_url"], "https://mp.local.test/checkout")

            webhook_response = self.client.post(
                "/api/payments/webhook?type=payment&data.id=pay-123",
                json={},
            )
            self.assertEqual(webhook_response.status_code, 200)
            self.assertEqual(webhook_response.get_json()["status"], "processed")

        history_response = self.client.get("/api/orders", headers=self.auth_headers(token))
        self.assertEqual(history_response.status_code, 200)
        order = history_response.get_json()[0]
        self.assertEqual(order["status"], "paid")
        self.assertTrue(any(payment["status"] == "approved" for payment in order["payments"]))

    def admin_token(self) -> str:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "admin@test.local", "password": "admin123"},
        )
        self.assertEqual(response.status_code, 200)
        return response.get_json()["access_token"]

    def test_delivery_config_is_served_from_one_place(self) -> None:
        response = self.client.get("/api/site/delivery")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["fee"], 2500.0)
        self.assertEqual(payload["zone_name"], "Villa Maipú")
        self.assertIn("pickup_address", payload)

    def test_product_detail_answers_by_slug(self) -> None:
        listed = self.client.get("/api/products").get_json()
        slug = listed[0]["slug"]

        response = self.client.get(f"/api/products/{slug}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["slug"], slug)

    def test_unknown_slug_is_a_404(self) -> None:
        self.assertEqual(self.client.get("/api/products/no-existe").status_code, 404)

    def test_only_the_admin_creates_tags(self) -> None:
        client_token = self.register_user(email="otro@test.local")
        anonymous = self.client.post("/api/tags", json={"name": "sin TACC"})
        self.assertEqual(anonymous.status_code, 401)

        as_client = self.client.post(
            "/api/tags", json={"name": "sin TACC"}, headers=self.auth_headers(client_token)
        )
        self.assertEqual(as_client.status_code, 403)

        as_admin = self.client.post(
            "/api/tags", json={"name": "sin TACC"}, headers=self.auth_headers(self.admin_token())
        )
        self.assertEqual(as_admin.status_code, 201)
        self.assertEqual(as_admin.get_json()["slug"], "sin-tacc")

    def test_the_catalog_filters_by_tag(self) -> None:
        token = self.admin_token()
        tag_id = self.client.post(
            "/api/tags", json={"name": "vegano"}, headers=self.auth_headers(token)
        ).get_json()["id"]
        self.client.post(
            "/api/products",
            json={"name": "Budin vegano", "price": "5400", "tag_ids": [tag_id]},
            headers=self.auth_headers(token),
        )

        filtered = self.client.get("/api/products?tag=vegano").get_json()

        self.assertEqual([item["name"] for item in filtered], ["Budin vegano"])

    def test_payments_off_answers_503(self) -> None:
        self.app.config["PAYMENTS_ENABLED"] = False
        token = self.register_user(email="sinpagos@test.local")
        order_id = self.client.post(
            "/api/orders",
            json=self.build_order_payload(product_id=self.first_product_id()),
            headers=self.auth_headers(token),
        ).get_json()["order_id"]

        response = self.client.post(
            "/api/payments/checkout",
            json={"order_id": order_id, "payment_method": "visa"},
            headers=self.auth_headers(token),
        )

        self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
