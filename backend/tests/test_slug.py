from __future__ import annotations

import unittest

from backend.services.slug import slugify, unique_slug
from backend.models import Product
from .support import BackendServiceTestCase


class SlugifyTestCase(unittest.TestCase):
    def test_lowercases_and_joins_with_dashes(self) -> None:
        self.assertEqual(slugify("Cookies New York x6"), "cookies-new-york-x6")

    def test_drops_accents_without_dropping_the_letter(self) -> None:
        self.assertEqual(slugify("Brownie clásico"), "brownie-clasico")
        self.assertEqual(slugify("Pastelería Ñandú"), "pasteleria-nandu")

    def test_removes_punctuation_and_collapses_separators(self) -> None:
        self.assertEqual(slugify("  ¡Torta!  de --- chocolate  "), "torta-de-chocolate")

    def test_empty_text_has_no_slug(self) -> None:
        self.assertEqual(slugify("   ---   "), "")


class UniqueSlugTestCase(BackendServiceTestCase):
    def test_adds_a_number_when_the_slug_is_taken(self) -> None:
        self.create_product(name="Brownie clásico")

        self.assertEqual(unique_slug(Product, "Brownie clásico"), "brownie-clasico-2")

    def test_keeps_the_slug_of_the_row_being_edited(self) -> None:
        product = self.create_product(name="Brownie clásico")

        self.assertEqual(unique_slug(Product, "Brownie clásico", keep_id=product.id), "brownie-clasico")

    def test_falls_back_to_a_readable_slug_when_the_name_has_no_letters(self) -> None:
        self.assertTrue(unique_slug(Product, "¡¡¡").startswith("producto"))


if __name__ == "__main__":
    unittest.main()
