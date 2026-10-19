"""Lo que el back tiene que rechazar en un precio (review de T4-F19b).

Salio de `test_product_service.py`, que paso las 300 lineas (R05).
"""

from __future__ import annotations

from decimal import Decimal

import unittest

from backend.extensions import db
from backend.models import ProductVariant
from backend.services.exceptions import ValidationError
from backend.services.product_service import ProductService
from backend.tests.support import BackendServiceTestCase


class PrecioQueElBackTieneQueRechazarTestCase(BackendServiceTestCase):
    """Las reglas vivian solo en el front.

    El panel avisa "el precio tiene que ser mayor que cero" y el back
    aceptaba cero, negativos, `NaN` e `Infinity`. La tarjeta de F19b dice,
    en su encabezado, *"aca se verifica que no se lo pueda esquivar desde el
    panel"*, y se lo podia esquivar con un PUT.
    """
    def setUp(self) -> None:
        super().setUp()
        self.service = ProductService()
        self.torta = self.create_product(name="Torta", price="6000.00")

    def guardar(self, variantes: list[dict]) -> dict:
        return self.service.update(self.torta.id, {"variants": variantes})

    def test_un_precio_que_no_es_un_numero_finito_se_rechaza(self) -> None:
        """`Decimal("NaN")` es válido para Python y llega a la base.

        Ahí el `NOT NULL` explota y sale **500 con HTML** en una API JSON
        (hallazgo H1). `Infinity` es peor: ver el test de abajo.
        """
        for precio in ("NaN", "nan", "Infinity", "-Infinity", "inf"):
            with self.subTest(precio=precio):
                with self.assertRaises(ValidationError):
                    self.guardar([{"name": "8 porciones", "price": precio}])

    def test_un_precio_enorme_no_puede_romper_el_json_de_la_carta(self) -> None:
        """H2, el peor de los tres.

        `1e400` entraba como `Decimal("1E+400")`, el serializer lo pasaba a
        `float` —`inf`— y `GET /api/products` devolvía `"price":Infinity`, que
        **no es JSON válido**: la carta, la portada y la ficha quedaban en
        blanco para **todos los visitantes**, con un solo PUT del panel.
        """
        for precio in ("1e400", 1e400, "9" * 40):
            with self.subTest(precio=precio):
                with self.assertRaises(ValidationError):
                    self.guardar([{"name": "8 porciones", "price": precio}])

        # Y lo que sí entra tiene que seguir siendo JSON serializable.
        self.guardar([{"name": "8 porciones", "price": "14200.50"}])
        import json

        from backend.services.serializers import Serializer

        json.dumps(Serializer.product(self.torta), allow_nan=False)

    def test_un_tamano_no_puede_valer_cero_ni_menos(self) -> None:
        """H3: con un precio negativo el pedido salía con **total negativo**."""
        for precio in ("0", 0, "-9999", -1, "0.004"):
            with self.subTest(precio=precio):
                with self.assertRaises(ValidationError):
                    self.guardar([{"name": "8 porciones", "price": precio}])

    def test_el_nombre_del_tamano_tiene_tope(self) -> None:
        """Entraron 4.000.000 de caracteres y el GET público los devolvía.

        Es el mismo agujero que ADR-030 cerró para los ingredientes, sin
        cerrar acá: SQLite no hace cumplir el `String(120)` del modelo.
        """
        with self.assertRaises(ValidationError):
            self.guardar([{"name": "A" * 5000, "price": "14200"}])
        self.assertEqual([], list(self.torta.variants))

    def test_dos_tamanos_con_el_mismo_nombre_no_entran(self) -> None:
        """La regla estaba solo en el front (`queFaltaEnLosTamanos`)."""
        with self.assertRaises(ValidationError):
            self.guardar(
                [
                    {"name": "8 porciones", "price": "14200"},
                    {"name": "8 PORCIONES", "price": "19800"},
                ]
            )

    def test_no_entran_mas_tamanos_que_el_tope(self) -> None:
        with self.assertRaises(ValidationError):
            self.guardar([{"name": f"T{i}", "price": "1000"} for i in range(13)])

    def test_el_mismo_id_dos_veces_no_mueve_el_id(self) -> None:
        """La única ruta donde ADR-029 parte 3 se rompía, y es por API."""
        ocho = self.create_variant(product=self.torta, name="8 porciones", price="14200.00")

        with self.assertRaises(ValidationError):
            self.guardar(
                [
                    {"id": ocho.id, "name": "8 porciones", "price": "14200"},
                    {"id": ocho.id, "name": "12 porciones", "price": "19800"},
                ]
            )

        self.assertEqual([ocho.id], [v.id for v in self.torta.variants])

    def test_el_precio_base_del_producto_tambien_se_defiende(self) -> None:
        """Lo mismo por el otro camino: era preexistente, no de esta tanda."""
        for precio in ("NaN", "1e400", "-500"):
            with self.subTest(precio=precio):
                with self.assertRaises(ValidationError):
                    self.service.update(self.torta.id, {"price": precio})

    def test_un_producto_sin_precio_sigue_pudiendo_existir(self) -> None:
        """Cero sí se acepta en el precio base: el panel los cuenta como

        "sin precio" y es un estado real de la carta a medio cargar."""
        self.service.update(self.torta.id, {"price": "0"})

        self.assertEqual(Decimal("0.00"), self.torta.price)

if __name__ == "__main__":
    unittest.main()
