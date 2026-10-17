from __future__ import annotations

from decimal import Decimal

from backend.extensions import db
from backend.models import Product
from backend.services.exceptions import NotFoundError, ValidationError
from backend.services.product_service import ProductService
from backend.tests.support import BackendServiceTestCase


class ProductServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.service = ProductService()

    def test_create_assigns_ingredients_and_defaults_category(self) -> None:
        chocolate = self.create_ingredient(name="Chocolate")
        cream = self.create_ingredient(name="Crema")

        response = self.service.create(
            {
                "name": "Torta moka",
                "price": "18900.50",
                "category": "  ",
                "ingredient_ids": [chocolate.id, cream.id],
            }
        )

        product = db.session.get(Product, response["id"])
        self.assertEqual(product.category, "general")
        self.assertEqual(product.price, Decimal("18900.50"))
        self.assertEqual({ingredient.name for ingredient in product.ingredients}, {"Chocolate", "Crema"})

    def test_create_derives_the_slug_from_the_name(self) -> None:
        response = self.service.create({"name": "Brownie clásico", "price": "2100"})

        self.assertEqual(response["slug"], "brownie-clasico")

    def test_create_defaults_the_selling_unit_to_one(self) -> None:
        response = self.service.create({"name": "Alfajor", "price": "900"})

        product = db.session.get(Product, response["id"])
        self.assertEqual((product.unit_label, product.min_qty, product.qty_step), ("unidad", 1, 1))
        self.assertTrue(product.allows_pickup)
        self.assertTrue(product.allows_delivery)

    def test_create_keeps_the_quantity_rules_it_receives(self) -> None:
        response = self.service.create(
            {"name": "Cookies", "price": "1600", "unit_label": "unidad", "min_qty": 6, "qty_step": 6}
        )

        product = db.session.get(Product, response["id"])
        self.assertEqual((product.min_qty, product.qty_step), (6, 6))

    def test_create_rejects_a_minimum_below_one(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create({"name": "Cookies", "price": "1600", "min_qty": 0})

    def test_create_stores_the_recipe_steps_on_the_product(self) -> None:
        # ADR-001: la receta es un campo del producto, no una entidad aparte.
        response = self.service.create(
            {"name": "Budin", "price": "5400", "steps": "1. Batir\n2. Hornear"}
        )

        product = db.session.get(Product, response["id"])
        self.assertIn("Hornear", product.steps)

    def test_update_replaces_ingredient_links_and_visibility(self) -> None:
        sugar = self.create_ingredient(name="Azucar")
        flour = self.create_ingredient(name="Harina")
        product = self.create_product(ingredients=[sugar])

        response = self.service.update(
            product.id,
            {"ingredient_ids": [flour.id], "available": False, "category": "boxes", "price": "21000.00"},
        )

        self.assertEqual(response["status"], "updated")
        db.session.refresh(product)
        self.assertFalse(product.available)
        self.assertEqual(product.category, "boxes")
        self.assertEqual([ingredient.name for ingredient in product.ingredients], ["Harina"])

    def test_renaming_does_not_move_the_slug(self) -> None:
        # El slug es la URL de la ficha: corregir un nombre no puede romper
        # el link que alguien ya compartio.
        product = self.create_product(name="Brownie clasico")
        original = product.slug

        self.service.update(product.id, {"name": "Brownie clásico de la casa"})

        db.session.refresh(product)
        self.assertEqual(product.slug, original)

    def test_update_replaces_the_variants(self) -> None:
        product = self.create_product(name="Torta")

        self.service.update(
            product.id,
            {"variants": [{"name": "8 porciones", "price": "14000"}, {"name": "12 porciones", "price": "19000"}]},
        )

        db.session.refresh(product)
        self.assertEqual([variant.name for variant in product.variants], ["8 porciones", "12 porciones"])

    def test_variant_without_price_is_rejected(self) -> None:
        product = self.create_product()

        with self.assertRaises(ValidationError):
            self.service.update(product.id, {"variants": [{"name": "8 porciones"}]})

    def test_create_rejects_unknown_ingredient_ids(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create({"name": "Alfajor", "price": "3500", "ingredient_ids": [9999]})

    def test_create_rejects_unknown_tag_ids(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create({"name": "Alfajor", "price": "3500", "tag_ids": [9999]})

    def test_list_filters_by_tag_slug(self) -> None:
        sin_tacc = self.create_tag(name="sin TACC")
        self.create_product(name="Alfajor de maicena", tags=[sin_tacc])
        self.create_product(name="Cookie com harina")

        listed = self.service.list(tag=sin_tacc.slug)

        self.assertEqual([item["name"] for item in listed], ["Alfajor de maicena"])

    def test_list_can_hide_what_is_not_available(self) -> None:
        # La base de test trae la semilla del bootstrap, asi que se mira la
        # presencia de cada uno y no el largo de la lista.
        self.create_product(name="Disponible", available=True)
        self.create_product(name="Agotado", available=False)

        names = [item["name"] for item in self.service.list(only_available=True)]

        self.assertIn("Disponible", names)
        self.assertNotIn("Agotado", names)

    def test_get_by_slug_serializes_the_whole_card(self) -> None:
        tag = self.create_tag(name="vegano")
        product = self.create_product(name="Budin vegano", tags=[tag], min_qty=2, qty_step=2)

        payload = self.service.get_by_slug(product.slug)

        self.assertEqual(payload["slug"], "budin-vegano")
        self.assertEqual(payload["min_qty"], 2)
        self.assertEqual([item["name"] for item in payload["tags"]], ["vegano"])
        self.assertEqual(payload["variants"], [])

    def test_get_by_slug_without_match_is_a_404(self) -> None:
        with self.assertRaises(NotFoundError):
            self.service.get_by_slug("no-existe")
