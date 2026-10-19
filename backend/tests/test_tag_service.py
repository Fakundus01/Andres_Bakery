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

    def test_dos_etiquetas_que_se_ven_iguales_no_entran(self) -> None:
        """D28: lo marco el reviewer de T4-F19b.

        "Tortas Personalizadas" sobre "tortas personalizadas" entraba como una
        segunda etiqueta que se ve igual en la lista, y **solo una habilita** la
        personalizacion, porque lo que manda es el slug y `unique_slug`
        desempata con sufijo. El sintoma: "le puse la etiqueta y no pasa nada",
        sin un error en ningun log.
        """
        self.service.create({"name": "tortas personalizadas"})

        for parecida in ("Tortas Personalizadas", "TORTAS PERSONALIZADAS", "  tortas   personalizadas  "):
            with self.subTest(parecida=parecida):
                with self.assertRaises(ValidationError):
                    self.service.create({"name": parecida})

        self.assertEqual(1, Tag.query.count())

    def test_los_acentos_no_fusionan_dos_etiquetas_distintas(self) -> None:
        self.service.create({"name": "Baño maria"})
        self.service.create({"name": "Bano maria"})

        self.assertEqual(2, Tag.query.count())

    def test_renombrar_corrige_el_tipeo_sin_chocar_consigo_misma(self) -> None:
        creada = self.service.create({"name": "sin tacc"})

        self.service.update(creada["id"], {"name": "sin TACC"})

        self.assertEqual("sin TACC", Tag.query.one().name)

    def test_el_nombre_de_la_etiqueta_tiene_tope(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create({"name": "A" * 500})

        self.assertEqual(0, Tag.query.count())

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
