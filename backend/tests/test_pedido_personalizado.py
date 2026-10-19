from __future__ import annotations

from decimal import Decimal
import unittest

from backend.extensions import db
from backend.models import Order
from backend.services.exceptions import ValidationError
from backend.services.order_service import OrderService
from backend.services.renglon_del_pedido import TOPE_NOTA
from backend.tests.support import BackendServiceTestCase


class NotificacionesFalsas:
    def send_order_created_notifications(
        self, order: Order, *, avisar_al_cliente: bool = True
    ) -> dict[str, str]:
        return {"customer": "sent", "admin": "sent"}


class PedidoPersonalizadoTestCase(BackendServiceTestCase):
    """La torta a pedido: el tamano que se cobra y los sabores elegidos.

    Dos features en el mismo renglon, y las dos deciden algo que no puede
    salir del request: **el precio** (F19a, ADR-029) y **que se puede elegir**
    (F58, ADR-031).
    """

    def setUp(self) -> None:
        super().setUp()
        self.service = OrderService(notifications=NotificacionesFalsas())
        self.torta = self.create_producto_personalizable(
            name="Torta de chocolate", price="6000.00"
        )
        self.grande = self.create_variant(product=self.torta, name="8 porciones", price="14000.00")

    def payload(self, **cambios) -> dict:
        item = {"product_id": self.torta.id, "quantity": 1}
        item.update(cambios.pop("item", {}))
        datos = {
            "items": [item],
            "customer": {"name": "Vecina", "phone": "1144556677"},
            "delivery": {"method": "pickup"},
        }
        datos.update(cambios)
        return datos

    def pedir(self, **cambios) -> dict:
        return self.service.create_whatsapp_order(self.payload(**cambios))

    # --- F19a: la variante se cobra -------------------------------------

    def test_el_pedido_con_variante_cobra_el_precio_de_la_variante(self) -> None:
        resultado = self.pedir(item={"variant_id": self.grande.id})

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(Decimal("14000.00"), pedido.items[0].unit_price)
        self.assertEqual(Decimal("14000.00"), pedido.total_amount)
        self.assertEqual("8 porciones", pedido.items[0].variant_name)

    def test_sin_variante_el_precio_es_el_base(self) -> None:
        resultado = self.pedir()

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(Decimal("6000.00"), pedido.items[0].unit_price)
        self.assertIsNone(pedido.items[0].variant_name)

    def test_el_tamano_no_necesita_la_etiqueta(self) -> None:
        """Vender por tamanos es de la carta (ADR-007); la etiqueta habilita
        la personalizacion, no el precio por tamano."""
        box = self.create_product(name="Box de regalo", price="5000.00")
        variante = self.create_variant(product=box, name="Grande", price="9000.00")

        resultado = self.service.create_whatsapp_order(
            {
                "items": [{"product_id": box.id, "quantity": 1, "variant_id": variante.id}],
                "customer": {"name": "Vecina", "phone": "1144556677"},
                "delivery": {"method": "pickup"},
            }
        )

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(Decimal("9000.00"), pedido.items[0].unit_price)
        self.assertEqual("Grande", pedido.items[0].variant_name)

    def test_la_variante_de_otro_producto_no_compra_la_torta_barata(self) -> None:
        """El agujero que esta tarjeta vino a cerrar.

        Sin verificar `variant.product_id == product.id`, mandar el id de la
        variante barata de otro producto cobra la torta grande a ese precio.
        """
        alfajor = self.create_product(name="Alfajor", price="800.00")
        barata = self.create_variant(product=alfajor, name="Unidad", price="800.00")

        with self.assertRaises(ValidationError) as capturado:
            self.pedir(item={"variant_id": barata.id})

        self.assertIn("tamaño", str(capturado.exception).lower())
        self.assertEqual(0, Order.query.count(), "no puede quedar un pedido a medias")

    def test_un_tamano_borrado_lo_dice_con_sus_palabras(self) -> None:
        """C5 de T4-F19b: el caso real es un carrito viejo, no un ataque.

        Los dos 400 decian lo mismo ("ese tamano no es de X"), que para quien
        tenia la torta en el carrito desde ayer no explica nada. Los ids de
        variante son publicos —`GET /api/products` los devuelve—, asi que
        distinguir "ya no existe" de "es de otro producto" no cuenta nada que
        no se sepa, y le dice que hacer.
        """
        borrada = self.grande.id
        db.session.delete(self.grande)
        db.session.commit()

        with self.assertRaises(ValidationError) as capturado:
            self.pedir(item={"variant_id": borrada})

        self.assertIn("ya no está disponible", str(capturado.exception))
        self.assertEqual(0, Order.query.count())

    def test_el_tamano_de_otro_producto_sigue_diciendo_lo_suyo(self) -> None:
        alfajor = self.create_product(name="Alfajor", price="800.00")
        ajena = self.create_variant(product=alfajor, name="Unidad", price="800.00")

        with self.assertRaises(ValidationError) as capturado:
            self.pedir(item={"variant_id": ajena.id})

        self.assertIn("no es de", str(capturado.exception))

    def test_variantes_que_no_son_un_id_dan_400_explicado(self) -> None:
        casos = {
            "inexistente": 9999,
            "negativo": -1,
            "cero": 0,
            "texto": "ocho porciones",
            "dict": {"id": 1},
            "lista": [1],
            "booleano": True,
            "enorme": 10**30,
        }
        for nombre, valor in casos.items():
            with self.subTest(caso=nombre):
                with self.assertRaises(ValidationError):
                    self.pedir(item={"variant_id": valor})
                self.assertEqual(0, Order.query.count())

    def test_la_variante_como_texto_numerico_se_acepta(self) -> None:
        """Un `"8"` que llega del `<select>` es un error honesto del front."""
        resultado = self.pedir(item={"variant_id": str(self.grande.id)})

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(Decimal("14000.00"), pedido.items[0].unit_price)

    def test_variante_vacia_o_nula_es_lo_mismo_que_no_mandarla(self) -> None:
        for valor in (None, ""):
            with self.subTest(valor=repr(valor)):
                resultado = self.pedir(item={"variant_id": valor})
                pedido = db.session.get(Order, resultado["order_id"])
                self.assertEqual(Decimal("6000.00"), pedido.items[0].unit_price)

    def test_el_nombre_del_tamano_funciona_de_testigo(self) -> None:
        """Si el id quedó apuntando a otro tamaño, el pedido se corta.

        Pasa cuando una variante se borra y la base reusa el id (lo encontró
        el pentester de T18): el carrito decía "8 porciones $14.000" y el
        pedido salía de 12 porciones. El precio sigue saliendo de la base; el
        nombre es solo el testigo de lo que la pantalla mostró.
        """
        with self.assertRaises(ValidationError) as capturado:
            self.pedir(item={"variant_id": self.grande.id, "variant_name": "12 porciones"})

        self.assertIn("elegilo de nuevo", str(capturado.exception))
        self.assertEqual(0, Order.query.count())

    def test_el_testigo_que_coincide_no_molesta(self) -> None:
        resultado = self.pedir(
            item={"variant_id": self.grande.id, "variant_name": "8 porciones"}
        )

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(Decimal("14000.00"), pedido.items[0].unit_price)

    def test_sin_testigo_el_pedido_entra_igual(self) -> None:
        """Un carrito guardado antes de este cambio no tiene el nombre."""
        resultado = self.pedir(item={"variant_id": self.grande.id})

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual("8 porciones", pedido.items[0].variant_name)

if __name__ == "__main__":
    unittest.main()
