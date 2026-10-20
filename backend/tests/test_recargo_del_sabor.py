"""El recargo del sabor: quien lo cobra, cuanto, y que queda escrito (F61).

ADR-036. Es el tercer lugar del proyecto donde el servidor tiene que ignorar
un precio que viene del cliente —el tamano (ADR-029), el envio, y ahora el
sabor—, asi que los tests de aca miran lo mismo que miro `T4-F19a`: que el
numero salga de la base, que no se pueda cobrar de menos, y que el pedido
guarde lo que cobro.
"""

from __future__ import annotations

from decimal import Decimal
import unittest

from backend.extensions import db
from backend.models import Option, Order
from backend.services.exceptions import ValidationError
from backend.services.option_service import option_service
from backend.services.order_service import OrderService
from backend.tests.support import BackendServiceTestCase


class NotificacionesFalsas:
    def send_order_created_notifications(
        self, order: Order, *, avisar_al_cliente: bool = True
    ) -> dict[str, str]:
        return {"customer": "sent", "admin": "sent"}


class BaseDelRecargo(BackendServiceTestCase):
    """La torta, su tamano y un grupo con un sabor caro y otro no.

    La comparten este archivo y `test_testigo_del_sabor.py`, que salio de aca
    por R05. Sin tests propios: heredar una clase que los tiene los vuelve a
    correr en cada hijo.
    """

    def setUp(self) -> None:
        super().setUp()
        self.service = OrderService(notifications=NotificacionesFalsas())
        self.torta = self.create_producto_personalizable(
            name="Torta de chocolate", price="6000.00"
        )
        self.grande = self.create_variant(
            product=self.torta, name="8 porciones", price="14000.00"
        )
        self.relleno = self.create_option_group(
            name="Relleno",
            options=[("Dulce de leche", "0"), ("Chocolate", "500.00")],
            products=[self.torta],
        )
        self.dulce, self.chocolate = self.relleno.options

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

    def renglon(self, resultado: dict):
        return db.session.get(Order, resultado["order_id"]).items[0]


class RecargoDelSaborTestCase(BaseDelRecargo):
    # --- C3: el recargo se cobra -----------------------------------------

    def test_el_sabor_con_recargo_sube_el_precio_del_renglon(self) -> None:
        resultado = self.pedir(
            item={"variant_id": self.grande.id, "option_ids": [self.chocolate.id]}
        )

        self.assertEqual(Decimal("14500.00"), self.renglon(resultado).unit_price)

    def test_el_sabor_sin_recargo_no_toca_el_precio(self) -> None:
        resultado = self.pedir(
            item={"variant_id": self.grande.id, "option_ids": [self.dulce.id]}
        )

        self.assertEqual(Decimal("14000.00"), self.renglon(resultado).unit_price)

    def test_dos_grupos_con_recargo_suman_los_dos(self) -> None:
        bizcocho = self.create_option_group(
            name="Bizcocho",
            options=[("Vainilla", "0"), ("Red velvet", "1200.00")],
            products=[self.torta],
            sort_order=1,
        )

        resultado = self.pedir(
            item={
                "variant_id": self.grande.id,
                "option_ids": [self.chocolate.id, bizcocho.options[1].id],
            }
        )

        self.assertEqual(Decimal("15700.00"), self.renglon(resultado).unit_price)

    def test_el_recargo_se_multiplica_por_la_cantidad(self) -> None:
        """Entra en el precio de UNA unidad, como el precio de siempre."""
        resultado = self.pedir(
            item={
                "variant_id": self.grande.id,
                "option_ids": [self.chocolate.id],
                "quantity": 3,
            }
        )

        self.assertEqual(43500.0, resultado["total"])

    def test_sin_tamano_el_recargo_se_suma_al_precio_base(self) -> None:
        resultado = self.pedir(item={"option_ids": [self.chocolate.id]})

        self.assertEqual(Decimal("6500.00"), self.renglon(resultado).unit_price)

    # --- C8: el precio no viene del request (V4) --------------------------

    def test_un_recargo_mandado_en_el_pedido_no_cambia_lo_que_se_cobra(self) -> None:
        """Mismo agujero que cerro ADR-029 para el tamano, en la misma ruta."""
        resultado = self.pedir(
            item={
                "variant_id": self.grande.id,
                "option_ids": [self.chocolate.id],
                "price_delta": "-10000.00",
                "options": [{"name": "Chocolate", "price_delta": "0"}],
            }
        )

        self.assertEqual(Decimal("14500.00"), self.renglon(resultado).unit_price)

    # --- C4: el pedido guarda lo que cobro --------------------------------

    def test_el_renglon_guarda_el_recargo_de_cada_sabor(self) -> None:
        resultado = self.pedir(
            item={"variant_id": self.grande.id, "option_ids": [self.chocolate.id]}
        )

        elegida = self.renglon(resultado).options[0]
        self.assertEqual("Chocolate", elegida.option_name)
        self.assertEqual(Decimal("500.00"), elegida.price_delta)

    def test_el_pedido_viejo_no_cambia_si_ella_cambia_el_recargo(self) -> None:
        """La razon de la columna: el pedido de enero cobro lo de enero."""
        resultado = self.pedir(
            item={"variant_id": self.grande.id, "option_ids": [self.chocolate.id]}
        )

        option_service.update_option(
            self.relleno.id, self.chocolate.id, {"price_delta": "900.00"}
        )

        renglon = self.renglon(resultado)
        self.assertEqual(Decimal("500.00"), renglon.options[0].price_delta)
        self.assertEqual(Decimal("14500.00"), renglon.unit_price)

    # --- C1 y C2: lo que el panel puede cargar ----------------------------

    def test_el_alta_del_grupo_acepta_sabores_con_recargo(self) -> None:
        payload, creado = option_service.create(
            {
                "name": "Cobertura",
                "options": [
                    {"name": "Ganache", "price_delta": "700.50"},
                    {"name": "Merengue"},
                ],
            }
        )

        self.assertTrue(creado)
        recargos = {opcion["name"]: opcion["price_delta"] for opcion in payload["options"]}
        self.assertEqual({"Ganache": 700.5, "Merengue": 0.0}, recargos)

    def test_el_recargo_se_puede_editar_y_volver_a_cero(self) -> None:
        option_service.update_option(
            self.relleno.id, self.chocolate.id, {"price_delta": "0"}
        )

        self.assertEqual(Decimal("0.00"), db.session.get(Option, self.chocolate.id).price_delta)

    def test_un_descuento_se_rechaza(self) -> None:
        with self.assertRaises(ValidationError) as caso:
            option_service.update_option(
                self.relleno.id, self.chocolate.id, {"price_delta": "-1.00"}
            )

        self.assertIn("recargo", str(caso.exception).lower())
        self.assertEqual(Decimal("500.00"), db.session.get(Option, self.chocolate.id).price_delta)

    def test_un_recargo_que_no_es_numero_se_rechaza(self) -> None:
        for valor in ("abc", "NaN", "1e400", [1], {"a": 1}):
            with self.subTest(valor=valor):
                with self.assertRaises(ValidationError):
                    option_service.update_option(
                        self.relleno.id, self.chocolate.id, {"price_delta": valor}
                    )

    def test_el_sabor_nuevo_arranca_sin_recargo(self) -> None:
        payload, _ = option_service.create_option(self.relleno.id, {"name": "Frutilla"})

        self.assertEqual(0.0, payload["price_delta"])


if __name__ == "__main__":
    unittest.main()
