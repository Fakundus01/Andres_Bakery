from __future__ import annotations

from backend.extensions import db
from backend.models import Product, Tag
from backend.services.exceptions import ValidationError
from backend.services.tag_service import TagService
from backend.tests.support import BackendServiceTestCase


class TagServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.service = TagService()

    def test_create_derives_the_slug_and_defaults_the_color(self) -> None:
        response = self.service.create({"name": "sin TACC"})

        tag = db.session.get(Tag, response["id"])
        self.assertEqual(tag.slug, "sin-tacc")
        self.assertEqual(tag.color_token, "acento")

    def test_create_rejects_an_empty_name(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create({"name": "   "})

    def test_create_rejects_a_repeated_name(self) -> None:
        self.service.create({"name": "vegano"})

        with self.assertRaises(ValidationError):
            self.service.create({"name": "vegano"})

    def test_an_invented_color_token_falls_back_instead_of_breaking_the_css(self) -> None:
        response = self.service.create({"name": "frio", "color_token": "fucsia-neon"})

        self.assertEqual(db.session.get(Tag, response["id"]).color_token, "acento")

    def test_list_respects_the_order_she_chose(self) -> None:
        self.service.create({"name": "vegano", "sort_order": 2})
        self.service.create({"name": "sin TACC", "sort_order": 1})

        self.assertEqual([tag["name"] for tag in self.service.list()], ["sin TACC", "vegano"])

    def test_deleting_a_tag_does_not_delete_the_products(self) -> None:
        tag = self.create_tag(name="sin lactosa")
        product = self.create_product(name="Helado", tags=[tag])

        self.service.delete(tag.id)

        self.assertIsNotNone(db.session.get(Product, product.id))
        self.assertEqual(db.session.get(Product, product.id).tags, [])
