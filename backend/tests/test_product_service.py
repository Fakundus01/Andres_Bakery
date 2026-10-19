from __future__ import annotations

from decimal import Decimal

from backend.extensions import db
from backend.models import ProductVariant
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

class VariantesQueNoSeMuevenTestCase(BackendServiceTestCase):
    """ADR-029 parte 3, que estuvo escrita como hecha sin estar.

    Lo marcaron las dos revisiones de T18: reemplazar la lista entera borraba
    las filas viejas, los ids cambiaban en cada guardado y el carrito de quien
    estaba comprando quedaba inservible. Peor: SQLite reusa los rowid, así que
    un id viejo podía caer sobre **otra** variante y cobrar un tamaño por otro.
    """

    def setUp(self) -> None:
        super().setUp()
        self.service = ProductService()
        self.torta = self.create_product(name="Torta de chocolate", price="6000.00")
        self.ocho = self.create_variant(product=self.torta, name="8 porciones", price="14000.00")
        self.doce = self.create_variant(
            product=self.torta, name="12 porciones", price="19800.00", sort_order=1
        )

    def guardar(self, variantes: list[dict]) -> dict:
        return self.service.update(self.torta.id, {"variants": variantes})

    def test_guardar_mandando_los_mismos_ids_no_mueve_los_ids(self) -> None:
        antes = [(v.id, v.name) for v in self.torta.variants]

        self.guardar(
            [
                {"id": self.ocho.id, "name": "8 porciones", "price": 14000},
                {"id": self.doce.id, "name": "12 porciones", "price": 19800},
            ]
        )

        despues = [(v.id, v.name) for v in self.torta.variants]
        self.assertEqual(antes, despues)

    def test_cambiar_el_precio_de_una_variante_no_le_cambia_el_id(self) -> None:
        """El caso real: ella sube el precio de la torta grande."""
        self.guardar(
            [
                {"id": self.ocho.id, "name": "8 porciones", "price": 15000},
                {"id": self.doce.id, "name": "12 porciones", "price": 19800},
            ]
        )

        viva = db.session.get(ProductVariant, self.ocho.id)
        self.assertEqual(Decimal("15000.00"), viva.price)
        self.assertEqual("8 porciones", viva.name)

    def test_una_variante_nueva_entra_sin_tocar_las_que_estaban(self) -> None:
        self.guardar(
            [
                {"id": self.ocho.id, "name": "8 porciones", "price": 14000},
                {"id": self.doce.id, "name": "12 porciones", "price": 19800},
                {"name": "20 porciones", "price": 28000},
            ]
        )

        ids = [v.id for v in self.torta.variants]
        self.assertIn(self.ocho.id, ids)
        self.assertIn(self.doce.id, ids)
        self.assertEqual(3, len(ids))

    def test_la_que_no_viene_en_la_lista_se_borra(self) -> None:
        self.guardar([{"id": self.ocho.id, "name": "8 porciones", "price": 14000}])

        self.assertEqual([self.ocho.id], [v.id for v in self.torta.variants])
        self.assertIsNone(db.session.get(ProductVariant, self.doce.id))

    def test_el_id_de_la_variante_de_otro_producto_no_se_reusa(self) -> None:
        """Mismo control que en el pedido: el id tiene que ser de este producto."""
        otro = self.create_product(name="Box")
        ajena = self.create_variant(product=otro, name="Grande", price="9000.00")

        with self.assertRaises(ValidationError):
            self.guardar([{"id": ajena.id, "name": "Robada", "price": 1}])

        self.assertEqual("Grande", db.session.get(ProductVariant, ajena.id).name)

    def test_sin_ids_sigue_andando_como_antes(self) -> None:
        """El panel viejo no manda ids: eso tiene que seguir funcionando."""
        self.guardar([{"name": "Unica", "price": 10000}])

        self.assertEqual(["Unica"], [v.name for v in self.torta.variants])

