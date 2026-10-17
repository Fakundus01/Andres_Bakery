from __future__ import annotations

from decimal import Decimal
import unittest

from backend.extensions import db
from backend.models import Order
from backend.services.exceptions import ValidationError
from backend.services.order_service import OrderService
from backend.tests.support import BackendServiceTestCase


class NotificacionesFalsas:
    def __init__(self) -> None:
        self.avisados: list[int] = []

    def send_order_created_notifications(self, order: Order) -> dict[str, str]:
        self.avisados.append(order.id)
        return {"customer": "sent", "admin": "sent"}


class PedidoDeInvitadoTestCase(BackendServiceTestCase):
    """F23/F31: comprar sin cuenta. Antes de esto, el invitado no podia."""

    def setUp(self) -> None:
        super().setUp()
        self.notificaciones = NotificacionesFalsas()
        self.service = OrderService(notifications=self.notificaciones)
        self.producto = self.create_product(name="Cookies", price="1500.00")

    def payload(self, **cambios) -> dict:
        datos = {
            "items": [{"product_id": self.producto.id, "quantity": 6}],
            "customer": {"name": "Facundo Moreno", "phone": "11-7059-5319"},
            "delivery": {
                "method": "delivery",
                "address": "Calle 123",
                "neighborhood": "Villa Maipú",
                "notes": "Timbre 2",
            },
        }
        datos.update(cambios)
        return datos

    def test_el_invitado_pide_sin_cuenta(self) -> None:
        resultado = self.service.create_whatsapp_order(self.payload())

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertIsNone(pedido.user_id)
        self.assertEqual("whatsapp", pedido.channel)
        self.assertEqual("pending", pedido.status)
        self.assertEqual(Decimal("11500.00"), pedido.total_amount)
        self.assertEqual([pedido.id], self.notificaciones.avisados)

    def test_devuelve_el_mensaje_y_el_telefono_pero_no_los_mails(self) -> None:
        resultado = self.service.create_whatsapp_order(self.payload())

        self.assertEqual({"order_id", "total", "phone", "message"}, set(resultado))
        self.assertIn("Pedido #", resultado["message"])
        self.assertIn("Total: $11.500", resultado["message"])

    def test_el_precio_del_cliente_se_ignora(self) -> None:
        # Mandar precio en el request no cambia nada: sale de Product (V4).
        resultado = self.service.create_whatsapp_order(
            self.payload(
                items=[{"product_id": self.producto.id, "quantity": 6, "unit_price": "1.00"}]
            )
        )
        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(Decimal("1500.00"), pedido.items[0].unit_price)
        self.assertEqual(Decimal("11500.00"), pedido.total_amount)

    def test_sin_telefono_no_hay_pedido(self) -> None:
        with self.assertRaises(ValidationError) as capturado:
            self.service.create_whatsapp_order(
                self.payload(customer={"name": "Facundo Moreno"})
            )
        self.assertIn("teléfono", capturado.exception.message)
        self.assertEqual(0, Order.query.count())

    def test_un_telefono_que_no_es_telefono_no_pasa(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create_whatsapp_order(
                self.payload(customer={"name": "Facundo", "phone": "no tengo"})
            )

    def test_sin_nombre_no_hay_pedido(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create_whatsapp_order(
                self.payload(customer={"phone": "1170595319"})
            )

    def test_sin_mail_el_pedido_se_guarda_igual(self) -> None:
        resultado = self.service.create_whatsapp_order(self.payload())
        pedido = db.session.get(Order, resultado["order_id"])
        self.assertIsNone(pedido.delivery.customer_email)

    def test_el_mail_vacio_no_se_guarda_como_cadena_vacia(self) -> None:
        resultado = self.service.create_whatsapp_order(
            self.payload(customer={"name": "Facundo", "phone": "1170595319", "email": ""})
        )
        pedido = db.session.get(Order, resultado["order_id"])
        self.assertIsNone(pedido.delivery.customer_email)

    def test_con_usuario_el_pedido_queda_atado_a_la_cuenta(self) -> None:
        usuario = self.create_user(email="cliente@test.local")
        resultado = self.service.create_whatsapp_order(self.payload(), user=usuario)

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(usuario.id, pedido.user_id)
        self.assertEqual(usuario.email, pedido.delivery.customer_email)

    def test_la_zona_de_entrega_se_valida_igual_que_con_token(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create_whatsapp_order(
                self.payload(
                    delivery={
                        "method": "delivery",
                        "address": "Av. Siempreviva 742",
                        "neighborhood": "Palermo",
                    }
                )
            )

    def test_tope_de_renglones(self) -> None:
        productos = [self.create_product(name=f"Budin {n}", price="1000.00") for n in range(31)]
        with self.assertRaises(ValidationError) as capturado:
            self.service.create_whatsapp_order(
                self.payload(items=[{"product_id": p.id, "quantity": 1} for p in productos])
            )
        self.assertIn("30 productos distintos", capturado.exception.message)
        self.assertEqual(0, Order.query.count())

    def test_tope_de_unidades_por_renglon(self) -> None:
        with self.assertRaises(ValidationError) as capturado:
            self.service.create_whatsapp_order(
                self.payload(items=[{"product_id": self.producto.id, "quantity": 1001}])
            )
        self.assertIn("muchas unidades", capturado.exception.message)

    def test_el_minimo_del_producto_sigue_valiendo(self) -> None:
        de_a_seis = self.create_product(name="Alfajores", price="2000.00", min_qty=6, qty_step=6)
        with self.assertRaises(ValidationError):
            self.service.create_whatsapp_order(
                self.payload(items=[{"product_id": de_a_seis.id, "quantity": 7}])
            )

    def test_retiro_no_cobra_envio_ni_pide_direccion(self) -> None:
        resultado = self.service.create_whatsapp_order(
            self.payload(delivery={"method": "pickup"})
        )
        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(Decimal("9000.00"), pedido.total_amount)
        self.assertIn("paso a retirar", resultado["message"])

    def test_el_envio_lo_decide_el_servidor(self) -> None:
        # Hasta este ciclo el servicio respetaba el `shipping_amount` del
        # request: en una ruta publica eso es envio gratis a pedido.
        for mandado in ("0", "-5000", "no es un numero"):
            with self.subTest(mandado=mandado):
                resultado = self.service.create_whatsapp_order(
                    self.payload(
                        delivery={
                            "method": "delivery",
                            "address": "Calle 123",
                            "neighborhood": "Villa Maipú",
                            "shipping_amount": mandado,
                        }
                    )
                )
                pedido = db.session.get(Order, resultado["order_id"])
                self.assertEqual(Decimal("11500.00"), pedido.total_amount)

    def test_sin_items_no_hay_pedido(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create_whatsapp_order(self.payload(items=[]))


if __name__ == "__main__":
    unittest.main()
