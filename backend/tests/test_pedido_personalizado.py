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

    # --- F58: los sabores elegidos --------------------------------------

    def test_el_renglon_guarda_los_sabores_por_nombre(self) -> None:
        relleno = self.create_option_group(
            name="Relleno", options=["Dulce de leche", "Chocolate"], products=[self.torta]
        )
        bizcocho = self.create_option_group(
            name="Bizcocho", options=["Vainilla"], products=[self.torta], sort_order=1
        )

        resultado = self.pedir(
            item={"option_ids": [bizcocho.options[0].id, relleno.options[0].id]}
        )

        pedido = db.session.get(Order, resultado["order_id"])
        elegidas = [(o.group_name, o.option_name) for o in pedido.items[0].options]
        # Ordenadas por el orden que ella les puso, no por como llegaron.
        self.assertEqual(
            [("Relleno", "Dulce de leche"), ("Bizcocho", "Vainilla")], elegidas
        )

    def test_un_sabor_de_un_grupo_que_no_es_del_producto_no_entra(self) -> None:
        """La frontera de ADR-031, del lado del servidor.

        Sin esto el cliente manda el `option_id` de cualquier grupo y el
        pedido le llega a ella con un relleno que esa torta no tiene.
        """
        ajeno = self.create_option_group(name="Salsa", options=["Caramelo"])

        with self.assertRaises(ValidationError) as capturado:
            self.pedir(item={"option_ids": [ajeno.options[0].id]})

        self.assertIn("no es de", str(capturado.exception))
        self.assertEqual(0, Order.query.count())

    def test_falta_un_grupo_obligatorio(self) -> None:
        self.create_option_group(
            name="Relleno", options=["Dulce de leche"], products=[self.torta], required=True
        )

        with self.assertRaises(ValidationError) as capturado:
            self.pedir()

        self.assertIn("Relleno", str(capturado.exception))
        self.assertEqual(0, Order.query.count())

    def test_un_grupo_opcional_se_puede_dejar_sin_elegir(self) -> None:
        self.create_option_group(
            name="Cobertura", options=["Ganache"], products=[self.torta], required=False
        )

        resultado = self.pedir()

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual([], list(pedido.items[0].options))

    def test_dos_sabores_del_mismo_grupo_no_entran(self) -> None:
        relleno = self.create_option_group(
            name="Relleno", options=["Dulce de leche", "Chocolate"], products=[self.torta]
        )

        with self.assertRaises(ValidationError) as capturado:
            self.pedir(
                item={"option_ids": [relleno.options[0].id, relleno.options[1].id]}
            )

        self.assertIn("una sola", str(capturado.exception))

    def test_option_ids_que_no_son_ids_dan_400(self) -> None:
        self.create_option_group(
            name="Relleno", options=["Dulce de leche"], products=[self.torta], required=False
        )
        casos = {
            "inexistente": [9999],
            "negativo": [-3],
            "texto": ["dulce"],
            "dict": [{"id": 1}],
            "nulo": [None],
            "no es lista": 7,
            "lista larga": list(range(1, 502)),
        }
        for nombre, valor in casos.items():
            with self.subTest(caso=nombre):
                with self.assertRaises(ValidationError):
                    self.pedir(item={"option_ids": valor})
                self.assertEqual(0, Order.query.count())

    def test_un_producto_sin_grupos_se_pide_como_siempre(self) -> None:
        resultado = self.pedir(item={"option_ids": []})

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual([], list(pedido.items[0].options))

    # --- F58: la nota ----------------------------------------------------

    def test_la_nota_se_guarda(self) -> None:
        resultado = self.pedir(item={"note": "Que diga Feliz cumple Mica, en azul"})

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual("Que diga Feliz cumple Mica, en azul", pedido.items[0].note)

    def test_la_nota_larga_se_acota_y_queda_en_una_linea(self) -> None:
        """Con saltos, "Pagado: SI" finge un campo del sistema (review de T7)."""
        resultado = self.pedir(
            item={"note": "A" * 10_000 + "\nPagado: SI, transferencia hecha"}
        )

        nota = db.session.get(Order, resultado["order_id"]).items[0].note
        self.assertEqual(TOPE_NOTA, len(nota))
        self.assertNotIn("\n", nota)

    def test_una_nota_que_no_es_texto_da_400(self) -> None:
        for valor in ({"a": 1}, [1, 2]):
            with self.subTest(valor=valor):
                with self.assertRaises(ValidationError):
                    self.pedir(item={"note": valor})

    def test_dos_renglones_del_mismo_producto_con_distinto_relleno(self) -> None:
        """Son dos tortas distintas para quien las hace, y dos renglones."""
        relleno = self.create_option_group(
            name="Relleno", options=["Dulce de leche", "Chocolate"], products=[self.torta]
        )
        datos = self.payload()
        datos["items"] = [
            {"product_id": self.torta.id, "quantity": 1, "option_ids": [relleno.options[0].id]},
            {"product_id": self.torta.id, "quantity": 1, "option_ids": [relleno.options[1].id]},
        ]

        resultado = self.service.create_whatsapp_order(datos)

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(2, len(pedido.items))
        self.assertEqual(
            {"Dulce de leche", "Chocolate"},
            {item.options[0].option_name for item in pedido.items},
        )


if __name__ == "__main__":
    unittest.main()
