"""El testigo del sabor, los topes y el alta idempotente (F61, review de T20).

Salio de `test_recargo_del_sabor.py`, que paso las 300 lineas (R05). Aca esta
lo que el reviewer encontro: que el id del sabor decidia plata sin que nadie
verificara que siguiera siendo el que el cliente vio, que dos recargos al tope
se pasaban de la columna, que un recargo de `0.001` entraba como cero, y que
agregar un sabor que ya existia descartaba el recargo mientras el panel avisaba
que lo habia guardado.
"""

from __future__ import annotations

from decimal import Decimal
import unittest

from backend.extensions import db
from backend.models import Option
from backend.services.exceptions import ValidationError
from backend.services.option_service import option_service
from backend.tests.test_recargo_del_sabor import BaseDelRecargo


class TestigoDelSaborTestCase(BaseDelRecargo):

    def test_el_sabor_que_cambio_de_nombre_no_se_cobra_en_silencio(self) -> None:
        """Mismo testigo que el tamano (ADR-029): el id solo no alcanza.

        El caso real: SQLite reusa el rowid de una fila borrada, asi que el
        id que quedo en el carrito puede caer sobre OTRO sabor, con otro
        precio. Lo midio el reviewer de T20 cobrando $23.200 por una torta
        de $14.200.
        """
        with self.assertRaises(ValidationError) as caso:
            self.pedir(
                item={
                    "variant_id": self.grande.id,
                    "option_ids": [self.chocolate.id],
                    "options_seen": [
                        {"id": self.chocolate.id, "name": "Frutilla", "price_delta": "0"}
                    ],
                }
            )

        self.assertIn("elegilo de nuevo", str(caso.exception))

    def test_el_sabor_que_cambio_de_recargo_no_se_cobra_en_silencio(self) -> None:
        """El caso sin trucos: ella sube el recargo con la torta en el carrito."""
        with self.assertRaises(ValidationError) as caso:
            self.pedir(
                item={
                    "variant_id": self.grande.id,
                    "option_ids": [self.chocolate.id],
                    "options_seen": [
                        {"id": self.chocolate.id, "name": "Chocolate", "price_delta": "100"}
                    ],
                }
            )

        self.assertIn("Chocolate", str(caso.exception))

    def test_el_testigo_que_coincide_deja_pasar(self) -> None:
        resultado = self.pedir(
            item={
                "variant_id": self.grande.id,
                "option_ids": [self.chocolate.id],
                "options_seen": [
                    {"id": self.chocolate.id, "name": "Chocolate", "price_delta": "500.00"}
                ],
            }
        )

        self.assertEqual(Decimal("14500.00"), self.renglon(resultado).unit_price)

    def test_un_carrito_viejo_sin_testigo_sigue_entrando(self) -> None:
        """El carrito de `localStorage` de ayer no manda testigos."""
        resultado = self.pedir(
            item={"variant_id": self.grande.id, "option_ids": [self.chocolate.id]}
        )

        self.assertEqual(Decimal("14500.00"), self.renglon(resultado).unit_price)

    def test_un_testigo_mal_formado_no_rompe_el_pedido(self) -> None:
        for testigo in ("no es una lista", [1, 2], [{"id": "x"}], [{}]):
            with self.subTest(testigo=testigo):
                with self.assertRaises(ValidationError):
                    self.pedir(
                        item={
                            "option_ids": [self.chocolate.id],
                            "options_seen": testigo,
                        }
                    )

    # --- Topes (review de T20, hallazgos 6 y 10) --------------------------

    def test_un_recargo_que_redondea_a_cero_se_rechaza(self) -> None:
        """Lo mismo que `_precio_de_variante` ya hacia con `0.004`."""
        with self.assertRaises(ValidationError) as caso:
            option_service.update_option(
                self.relleno.id, self.chocolate.id, {"price_delta": "0.001"}
            )

        self.assertIn("cero", str(caso.exception).lower())

    def test_el_precio_del_renglon_no_se_pasa_de_la_columna(self) -> None:
        """Dos recargos al tope sumaban nueve digitos en una columna de ocho."""
        option_service.update_option(
            self.relleno.id, self.chocolate.id, {"price_delta": "99999999.99"}
        )
        bizcocho = self.create_option_group(
            name="Bizcocho",
            options=[("Oro", "99999999.99")],
            products=[self.torta],
            sort_order=1,
        )

        with self.assertRaises(ValidationError):
            self.pedir(
                item={
                    "option_ids": [self.chocolate.id, bizcocho.options[0].id],
                }
            )

    # --- El alta idempotente (review de T20, hallazgo 4) ------------------

    def test_agregar_un_sabor_que_ya_esta_le_pone_el_recargo(self) -> None:
        """El panel avisaba «agregado con +$X» y el recargo se descartaba."""
        payload, creado = option_service.create_option(
            self.relleno.id, {"name": "chocolate", "price_delta": "1200"}
        )

        self.assertFalse(creado)
        self.assertEqual(1200.0, payload["price_delta"])
        self.assertEqual(
            Decimal("1200.00"), db.session.get(Option, self.chocolate.id).price_delta
        )

    def test_agregar_un_sabor_que_ya_esta_sin_recargo_no_lo_borra(self) -> None:
        payload, creado = option_service.create_option(self.relleno.id, {"name": "Chocolate"})

        self.assertFalse(creado)
        self.assertEqual(500.0, payload["price_delta"])


if __name__ == "__main__":
    unittest.main()
