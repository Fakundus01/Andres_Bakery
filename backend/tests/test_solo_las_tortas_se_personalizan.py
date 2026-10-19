"""La personalizacion vive detras de la etiqueta, no de los grupos (F58)."""

from __future__ import annotations

from decimal import Decimal
import unittest

from backend.extensions import db
from backend.models import Order
from backend.services.exceptions import ValidationError
from backend.services.order_service import OrderService
from backend.tests.support import BackendServiceTestCase


class NotificacionesFalsas:
    def send_order_created_notifications(
        self, order: Order, *, avisar_al_cliente: bool = True
    ) -> dict[str, str]:
        return {"customer": "sent", "admin": "sent"}


class SoloLasTortasSePersonalizanTestCase(BackendServiceTestCase):
    """La personalizacion vive detras de la etiqueta «tortas personalizadas».

    Decision del humano el 2026-10-19: elegir sabores, escribir como la quiere
    y mandar una foto es para las tortas a pedido. Una docena de cookies no se
    personaliza, y el servidor es quien lo sostiene.
    """

    def setUp(self) -> None:
        super().setUp()
        self.service = OrderService(notifications=NotificacionesFalsas())
        self.cookies = self.create_product(name="Cookies", price="1500.00")
        self.relleno = self.create_option_group(
            name="Relleno", options=["Dulce de leche"], products=[self.cookies]
        )

    def pedir(self, **extra) -> dict:
        item = {"product_id": self.cookies.id, "quantity": 1}
        item.update(extra)
        return self.service.create_whatsapp_order(
            {
                "items": [item],
                "customer": {"name": "Vecina", "phone": "1144556677"},
                "delivery": {"method": "pickup"},
            }
        )

    def test_un_producto_sin_la_etiqueta_rechaza_los_sabores(self) -> None:
        with self.assertRaises(ValidationError) as capturado:
            self.pedir(option_ids=[self.relleno.options[0].id])

        self.assertIn("no se pide personalizado", str(capturado.exception))
        self.assertEqual(0, Order.query.count())

    def test_tampoco_acepta_la_nota(self) -> None:
        with self.assertRaises(ValidationError):
            self.pedir(note="Que diga feliz cumple")
        self.assertEqual(0, Order.query.count())

    def test_tampoco_acepta_la_foto(self) -> None:
        with self.assertRaises(ValidationError):
            self.pedir(reference_image="/uploads/" + "ab" * 16 + ".jpg")
        self.assertEqual(0, Order.query.count())

    def test_un_grupo_obligatorio_mal_asignado_no_bloquea_la_venta(self) -> None:
        """El motivo de que la puerta sea la etiqueta y no la presencia de
        grupos: si fuera por los grupos, asignarle "Relleno" por error a las
        cookies dejaria de poder venderlas."""
        self.assertTrue(self.relleno.required)

        resultado = self.pedir()

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual([], list(pedido.items[0].options))

    def test_el_pedido_normal_sigue_igual(self) -> None:
        resultado = self.pedir(quantity=6)

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(6, pedido.items[0].quantity)
        self.assertIsNone(pedido.items[0].note)


if __name__ == "__main__":
    unittest.main()
