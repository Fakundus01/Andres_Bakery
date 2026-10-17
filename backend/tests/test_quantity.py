from __future__ import annotations

from backend.services.exceptions import ValidationError
from backend.services.quantity import is_valid_quantity, validate_quantity
from backend.tests.support import BackendServiceTestCase


class QuantityTestCase(BackendServiceTestCase):
    def test_sold_in_sixes_only_accepts_multiples_from_the_minimum(self) -> None:
        product = self.create_product(name="Cookies", min_qty=6, qty_step=6)

        self.assertFalse(is_valid_quantity(product, 5))
        self.assertTrue(is_valid_quantity(product, 6))
        self.assertFalse(is_valid_quantity(product, 7))
        self.assertTrue(is_valid_quantity(product, 12))

    def test_a_minimum_without_step_accepts_anything_above_it(self) -> None:
        product = self.create_product(name="Medialunas", min_qty=3, qty_step=1)

        self.assertFalse(is_valid_quantity(product, 2))
        self.assertTrue(is_valid_quantity(product, 4))

    def test_below_the_minimum_the_error_names_the_unit(self) -> None:
        product = self.create_product(name="Cookies", unit_label="unidad", min_qty=6, qty_step=6)

        with self.assertRaises(ValidationError) as caught:
            validate_quantity(product, 2)

        self.assertIn("minimum of 6 unidad", caught.exception.message)

    def test_off_step_quantity_is_rejected(self) -> None:
        product = self.create_product(name="Cookies", min_qty=6, qty_step=6)

        with self.assertRaises(ValidationError):
            validate_quantity(product, 7)
