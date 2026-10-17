from __future__ import annotations

import unittest

from backend.extensions import db
from backend.models import Order
from backend.services.rate_limit import limitador
from backend.tests.support import ApiTestCase


class PedidoWhatsAppApiTestCase(ApiTestCase):
    """La ruta publica de pedido, de punta a punta (F23, F31, ADR-025)."""

    def setUp(self) -> None:
        super().setUp()
        # El limitador es un singleton del proceso: sin esto, la cuenta de un
        # test se le suma al siguiente y el que falla no es el culpable.
        limitador.olvidar_todo()

    def tearDown(self) -> None:
        limitador.olvidar_todo()
        super().tearDown()

    def payload(self, **cambios) -> dict:
        datos = {
            "items": [{"product_id": self.first_product_id(), "quantity": 2}],
            "customer": {"name": "Facundo Moreno", "phone": "11-7059-5319"},
            "delivery": {
                "method": "delivery",
                "address": "Calle 123",
                "neighborhood": "Villa Maipú",
            },
        }
        datos.update(cambios)
        return datos

    def test_sin_token_el_invitado_puede_pedir(self) -> None:
        # La regresion que abre T7: esta misma llamada contra /api/orders da
        # 401, y eso era la pared entre el visitante y la compra.
        respuesta = self.client.post("/api/orders/whatsapp", json=self.payload())

        self.assertEqual(201, respuesta.status_code)
        cuerpo = respuesta.get_json()
        self.assertEqual({"order_id", "total", "phone", "message"}, set(cuerpo))
        self.assertIn(f"Pedido #{cuerpo['order_id']}", cuerpo["message"])

        with self.app.app_context():
            pedido = db.session.get(Order, cuerpo["order_id"])
            self.assertIsNone(pedido.user_id)
            self.assertEqual("whatsapp", pedido.channel)

    def test_con_token_valido_el_pedido_queda_en_la_cuenta(self) -> None:
        token = self.register_user(email="conmigo@test.local")
        respuesta = self.client.post(
            "/api/orders/whatsapp", json=self.payload(), headers=self.auth_headers(token)
        )

        self.assertEqual(201, respuesta.status_code)
        pedidos = self.client.get("/api/orders", headers=self.auth_headers(token)).get_json()
        self.assertEqual(1, len(pedidos))

    def test_un_token_roto_no_le_arruina_la_compra_a_nadie(self) -> None:
        # Un token viejo o corrupto en el navegador no puede ser la razon de
        # que alguien no pueda comprar: se lo trata como invitado.
        respuesta = self.client.post(
            "/api/orders/whatsapp",
            json=self.payload(),
            headers={"Authorization": "Bearer esto.no.es.un.token"},
        )

        self.assertEqual(201, respuesta.status_code)
        with self.app.app_context():
            pedido = db.session.get(Order, respuesta.get_json()["order_id"])
            self.assertIsNone(pedido.user_id)

    def test_sin_telefono_contesta_400_y_lo_explica_en_castellano(self) -> None:
        respuesta = self.client.post(
            "/api/orders/whatsapp",
            json=self.payload(customer={"name": "Facundo Moreno"}),
        )

        self.assertEqual(400, respuesta.status_code)
        self.assertIn("teléfono", respuesta.get_json()["error"])

    def test_el_tope_por_ip_corta_la_rafaga(self) -> None:
        self.app.config["RATE_LIMIT_ENABLED"] = True

        for intento in range(3):
            respuesta = self.client.post("/api/orders/whatsapp", json=self.payload())
            self.assertEqual(201, respuesta.status_code, f"intento {intento + 1}")

        cortado = self.client.post("/api/orders/whatsapp", json=self.payload())
        self.assertEqual(429, cortado.status_code)
        self.assertIn("Retry-After", cortado.headers)
        self.assertGreaterEqual(int(cortado.headers["Retry-After"]), 1)
        # El cuarto pedido no se guardo: el tope corta antes del servicio.
        with self.app.app_context():
            self.assertEqual(3, Order.query.count())

    def test_el_tope_no_molesta_cuando_esta_apagado(self) -> None:
        # Default de los tests: asi una suite que hace 10 logins no se cae por
        # el limitador en vez de por lo que mide.
        self.assertFalse(self.app.config["RATE_LIMIT_ENABLED"])
        for _ in range(5):
            respuesta = self.client.post("/api/orders/whatsapp", json=self.payload())
            self.assertEqual(201, respuesta.status_code)

    def test_el_login_tambien_tiene_tope(self) -> None:
        self.app.config["RATE_LIMIT_ENABLED"] = True
        for _ in range(10):
            self.client.post(
                "/api/auth/login", json={"email": "admin@test.local", "password": "mal"}
            )

        cortado = self.client.post(
            "/api/auth/login", json={"email": "admin@test.local", "password": "admin123"}
        )
        # Ni con la clave correcta: el tope es por IP, no por intento fallido.
        self.assertEqual(429, cortado.status_code)


if __name__ == "__main__":
    unittest.main()
