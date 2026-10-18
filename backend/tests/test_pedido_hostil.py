from __future__ import annotations

from decimal import Decimal
import unittest

from backend.extensions import db
from backend.models import Order
from backend.services.exceptions import ValidationError
from backend.services.mensaje_whatsapp import armar_mensaje
from backend.services.order_service import OrderService
from backend.services.saneado import TOPE_DIRECCION, TOPE_NOMBRE, TOPE_NOTAS
from backend.tests.support import BackendServiceTestCase


class NotificacionesFalsas:
    def __init__(self) -> None:
        self.al_cliente: list[bool] = []

    def send_order_created_notifications(
        self, order: Order, *, avisar_al_cliente: bool = True
    ) -> dict[str, str]:
        self.al_cliente.append(avisar_al_cliente)
        return {"customer": "sent", "admin": "sent"}


class PedidoHostilTestCase(BackendServiceTestCase):
    """Lo que encontraron las dos revisiones de T7 sobre la ruta pública.

    Todo lo de acá terminaba en **500 con HTML** (que el front muestra crudo
    adentro del checkout), en una fila de megabytes, o en plata mal cobrada.
    """

    def setUp(self) -> None:
        super().setUp()
        self.notificaciones = NotificacionesFalsas()
        self.service = OrderService(notifications=self.notificaciones)
        self.producto = self.create_product(name="Cookies", price="1500.00")

    def payload(self, **cambios) -> dict:
        datos = {
            "items": [{"product_id": self.producto.id, "quantity": 2}],
            "customer": {"name": "Vecina", "phone": "1144556677"},
            "delivery": {"method": "pickup"},
        }
        datos.update(cambios)
        return datos

    def pedir(self, **cambios) -> dict:
        return self.service.create_whatsapp_order(self.payload(**cambios))

    # --- Tipos que no son los esperados: 400 explicado, no 500 ---

    def test_campos_que_no_son_del_tipo_esperado_dan_400(self) -> None:
        casos = {
            "customer de texto": {"customer": "Invitado"},
            "delivery de texto": {"delivery": "en mi casa"},
            "delivery de lista": {"delivery": ["method", "pickup"]},
            "nombre dict": {"customer": {"name": {"a": 1}, "phone": "1144556677"}},
            "teléfono lista": {"customer": {"name": "Vecina", "phone": [1, 2]}},
            "notas dict": {"delivery": {"method": "pickup", "notes": {"a": 1}}},
            "items que no es lista": {"items": {"product_id": 1}},
            "item que no es dict": {"items": ["dame cookies"]},
        }
        for nombre, cambio in casos.items():
            with self.subTest(caso=nombre):
                with self.assertRaises(ValidationError):
                    self.pedir(**cambio)
                self.assertEqual(0, Order.query.count(), "no puede quedar un pedido a medias")

    def test_un_numero_donde_va_texto_se_acepta_como_texto(self) -> None:
        # Una dirección que es "123" es alguien tipeando raro, no un ataque:
        # entra como texto en vez de reventar al grabar.
        resultado = self.pedir(
            delivery={"method": "delivery", "address": 123, "neighborhood": "Villa Maipú"}
        )
        self.assertEqual("123", db.session.get(Order, resultado["order_id"]).delivery.address)

    def test_el_pedido_entero_tiene_que_ser_un_objeto(self) -> None:
        for basura in ("hola", 5, [1, 2]):
            with self.subTest(basura=basura):
                with self.assertRaises(ValidationError):
                    self.service.create_whatsapp_order({"items": [], "customer": basura})

    def test_cantidades_y_ids_que_no_son_enteros(self) -> None:
        # `int(2.9)` daba 2 y el pedido confirmaba una cantidad que nadie pidió.
        casos = [2.9, True, None, "dos", [2], {"a": 2}]
        for cantidad in casos:
            with self.subTest(cantidad=cantidad):
                with self.assertRaises(ValidationError):
                    self.pedir(items=[{"product_id": self.producto.id, "quantity": cantidad}])

        # 10**30 reventaba al grabar con OverflowError de SQLite.
        with self.assertRaises(ValidationError):
            self.pedir(items=[{"product_id": 10**30, "quantity": 1}])

    def test_una_cantidad_escrita_como_texto_entero_sigue_valiendo(self) -> None:
        resultado = self.pedir(items=[{"product_id": self.producto.id, "quantity": "3"}])
        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(3, pedido.items[0].quantity)

    # --- El método de entrega, que decidía plata ---

    def test_el_metodo_de_entrega_tiene_lista_blanca(self) -> None:
        # "Delivery" salteaba la validación de dirección y de zona, guardaba
        # envío $0, y el panel decía "envío" mientras el WhatsApp decía
        # "paso a retirar". El que cobraba de menos ganaba.
        for metodo in ("envio a domicilio", "envío", "retiro", "x", ""):
            with self.subTest(metodo=metodo):
                with self.assertRaises(ValidationError):
                    self.pedir(delivery={"method": metodo})
        self.assertEqual(0, Order.query.count())

    def test_delivery_en_mayusculas_es_un_envio_y_cobra_el_envio(self) -> None:
        # Mayúsculas sí se aceptan, normalizadas: antes "Delivery" no entraba
        # por la comparación exacta y terminaba en un envío de $0 sin validar
        # dirección ni zona. Ahora es un envío como cualquier otro.
        resultado = self.pedir(
            delivery={"method": "Delivery", "address": "Calle 1", "neighborhood": "Villa Maipú"}
        )
        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual("delivery", pedido.delivery.delivery_method)
        self.assertEqual(Decimal("2500.00"), pedido.delivery.shipping_amount)
        self.assertIn("Entrega: envío a Calle 1", resultado["message"])

    def test_un_envio_en_mayusculas_sin_direccion_se_rechaza(self) -> None:
        with self.assertRaises(ValidationError):
            self.pedir(delivery={"method": "DELIVERY"})

    # --- Largos ---

    def test_los_textos_tienen_tope(self) -> None:
        resultado = self.pedir(
            customer={"name": "N" * 50_000, "phone": "1" * 500},
            delivery={"method": "pickup", "notes": "Z" * 200_000},
        )
        entrega = db.session.get(Order, resultado["order_id"]).delivery
        self.assertEqual(TOPE_NOMBRE, len(entrega.customer_name))
        self.assertEqual(TOPE_NOTAS, len(entrega.notes))

    def test_una_dedicatoria_larga_no_rompe_el_link_de_whatsapp(self) -> None:
        # El tope de 1500 recortaba solo los renglones de producto: con notas
        # largas el mensaje se iba a 5000 y el `wa.me` quedaba inservible,
        # justo en el paso que le falta a quien ya pidió.
        resultado = self.pedir(
            customer={"name": "N" * 500, "phone": "1144556677"},
            delivery={
                "method": "delivery",
                "address": "A" * 500,
                "neighborhood": "Villa Maipú",
                "notes": "Z" * 5_000,
            },
        )
        self.assertLess(len(resultado["message"]), 2_000)
        self.assertIn("Total: ", resultado["message"])
        self.assertIn("Entrega: envío a", resultado["message"])

    def test_un_producto_de_nombre_enorme_igual_se_nombra(self) -> None:
        gigante = self.create_product(name="Torta " + "A" * 2_000, price="1000.00")
        mensaje = armar_mensaje(
            db.session.get(Order, self.pedir(items=[{"product_id": gigante.id, "quantity": 1}])["order_id"])
        )
        self.assertIn("Torta AAA", mensaje)
        self.assertNotIn("y 1 producto mas", mensaje)

    # --- Texto que finge ser del sistema ---

    def test_las_notas_no_pueden_fingir_un_renglon_del_sistema(self) -> None:
        # "sin azúcar\nPagado: SI, transferencia hecha" llegaba al mail de
        # Andrea como si fuera un campo más del pedido.
        resultado = self.pedir(
            delivery={"method": "pickup", "notes": "sin azúcar\nPagado: SI, transferencia hecha"}
        )
        entrega = db.session.get(Order, resultado["order_id"]).delivery
        self.assertNotIn("\n", entrega.notes)
        self.assertIn("sin azúcar · Pagado: SI", entrega.notes)
        self.assertEqual(1, resultado["message"].count("Notas:"))

    def test_el_nombre_tampoco(self) -> None:
        resultado = self.pedir(
            customer={"name": "Ana\nTotal: $1", "phone": "1144556677"}
        )
        self.assertNotIn("\nTotal: $1", db.session.get(Order, resultado["order_id"]).delivery.customer_name)

    # --- Mail ---

    def test_un_mail_que_no_es_un_mail_no_se_guarda(self) -> None:
        for basura in ("no tengo", "a@b", "a@b.com\r\nBcc: lista@victimas.com", "@", "a b@c.com"):
            with self.subTest(mail=basura):
                resultado = self.pedir(
                    customer={"name": "Vecina", "phone": "1144556677", "email": basura}
                )
                entrega = db.session.get(Order, resultado["order_id"]).delivery
                self.assertIsNone(entrega.customer_email)

    def test_un_mail_valido_si_se_guarda(self) -> None:
        resultado = self.pedir(
            customer={"name": "Vecina", "phone": "1144556677", "email": " vecina@gmail.com "}
        )
        entrega = db.session.get(Order, resultado["order_id"]).delivery
        self.assertEqual("vecina@gmail.com", entrega.customer_email)

    def test_al_invitado_no_se_le_manda_mail(self) -> None:
        # Su dirección no está verificada y el cuerpo lleva texto que escribió
        # quien pidió: sería usar el servidor de Andrea para escribirle a
        # cualquiera con su firma.
        self.pedir(customer={"name": "Vecina", "phone": "1144556677", "email": "x@gmail.com"})
        self.assertEqual([False], self.notificaciones.al_cliente)

    def test_a_quien_tiene_cuenta_si(self) -> None:
        usuario = self.create_user(email="cliente@test.local")
        self.service.create_whatsapp_order(self.payload(), user=usuario)
        self.assertEqual([True], self.notificaciones.al_cliente)

    # --- Que lo de siempre siga valiendo ---

    def test_el_pedido_normal_no_se_rompio(self) -> None:
        resultado = self.pedir(
            delivery={
                "method": "delivery",
                "address": "Jose Hernandez 1234",
                "neighborhood": "Villa Maipú",
                "notes": "Timbre B",
            }
        )
        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(Decimal("5500.00"), pedido.total_amount)
        self.assertEqual(TOPE_DIRECCION, max(TOPE_DIRECCION, len(pedido.delivery.address)))
        self.assertIn("Timbre B", resultado["message"])


if __name__ == "__main__":
    unittest.main()
