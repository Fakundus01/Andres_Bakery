from __future__ import annotations

from decimal import Decimal

from backend.extensions import db
from backend.models import Product, Recipe
from backend.services.catalog_service import ProductService, RecipeService
from backend.services.exceptions import ValidationError
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
        self.assertIsNotNone(product)
        self.assertEqual(product.category, "general")
        self.assertEqual(product.price, Decimal("18900.50"))
        self.assertEqual({ingredient.name for ingredient in product.ingredients}, {"Chocolate", "Crema"})

    def test_update_replaces_ingredient_links_and_visibility(self) -> None:
        sugar = self.create_ingredient(name="Azucar")
        flour = self.create_ingredient(name="Harina")
        product = self.create_product(ingredients=[sugar])

        response = self.service.update(
            product.id,
            {
                "ingredient_ids": [flour.id],
                "available": False,
                "category": "boxes",
                "price": "21000.00",
            },
        )

        self.assertEqual(response["status"], "updated")
        db.session.refresh(product)
        self.assertFalse(product.available)
        self.assertEqual(product.category, "boxes")
        self.assertEqual(product.price, Decimal("21000.00"))
        self.assertEqual([ingredient.name for ingredient in product.ingredients], ["Harina"])

    def test_create_rejects_unknown_ingredient_ids(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create({"name": "Alfajor", "price": "3500", "ingredient_ids": [9999]})


class RecipeServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.service = RecipeService()

    def test_update_requires_non_empty_steps(self) -> None:
        recipe_id = self.service.create(
            {
                "title": "Budin de limon",
                "summary": "Receta simple para la merienda.",
                "ingredients": "Harina, azucar, huevos y limon",
                "steps": "Mezclar y hornear",
            }
        )["id"]

        with self.assertRaises(ValidationError):
            self.service.update(recipe_id, {"steps": "   "})

    def test_create_recipe_persists_selected_status(self) -> None:
        response = self.service.create(
            {
                "title": "Tarta de coco",
                "summary": "Version para vitrinas de fin de semana.",
                "ingredients": "Harina, manteca, coco y dulce de leche",
                "steps": "Hacer base, rellenar y hornear",
                "status": "draft",
                "category": "tartas",
            }
        )

        recipe = db.session.get(Recipe, response["id"])
        self.assertIsNotNone(recipe)
        self.assertEqual(recipe.status, "draft")
        self.assertEqual(recipe.category, "tartas")
