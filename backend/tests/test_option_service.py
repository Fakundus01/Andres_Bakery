from __future__ import annotations

import unittest

from backend.extensions import db
from backend.models import Option, OptionGroup, Order
from backend.services.exceptions import NotFoundError, ValidationError
from backend.services.option_service import MAX_OPCIONES, TOPE_NOMBRE, OptionService
from backend.tests.support import ApiTestCase, BackendServiceTestCase


class OptionServiceTestCase(BackendServiceTestCase):
    """Los grupos de sabores que define la chef (F57, ADR-031).

    La unicidad vive aca por lo mismo que la del ingrediente (ADR-030): el
    panel solo puede evitar los duplicados que ve.
    """

    def setUp(self) -> None:
        super().setUp()
        self.service = OptionService()

    def test_crea_el_grupo_con_sus_sabores(self) -> None:
        payload, creado = self.service.create(
            {"name": "Relleno", "options": [{"name": "Dulce de leche"}, {"name": "Chocolate"}]}
        )

        self.assertTrue(creado)
        self.assertEqual("Relleno", payload["name"])
        self.assertTrue(payload["required"])
        self.assertEqual(
            ["Dulce de leche", "Chocolate"], [opcion["name"] for opcion in payload["options"]]
        )

    def test_las_opciones_tambien_entran_como_texto_pelado(self) -> None:
        """El panel manda objetos; un script o la IA, nombres sueltos."""
        payload, _ = self.service.create({"name": "Bizcocho", "options": ["Vainilla", "Chocolate"]})

        self.assertEqual(["Vainilla", "Chocolate"], [o["name"] for o in payload["options"]])

    def test_el_mismo_grupo_con_otra_grafia_no_se_duplica(self) -> None:
        primero, creado = self.service.create({"name": "Relleno"})
        segundo, repetido = self.service.create({"name": "  RELLENO "})

        self.assertTrue(creado)
        self.assertFalse(repetido)
        self.assertEqual(primero["id"], segundo["id"])
        # El nombre que gana es el que ella escribio primero.
        self.assertEqual("Relleno", segundo["name"])
        self.assertEqual(1, OptionGroup.query.count())

    def test_los_acentos_no_fusionan_la_enie(self) -> None:
        """"Piña" y "Pina" son dos sabores distintos (ADR-030)."""
        self.service.create({"name": "Baño"})
        _, creado = self.service.create({"name": "Bano"})

        self.assertTrue(creado)
        self.assertEqual(2, OptionGroup.query.count())

    def test_el_sabor_repetido_en_el_alta_entra_una_sola_vez(self) -> None:
        payload, _ = self.service.create(
            {"name": "Relleno", "options": ["Chocolate", "chocolate", "CHOCOLATE"]}
        )

        self.assertEqual(1, len(payload["options"]))

    def test_el_mismo_sabor_puede_estar_en_dos_grupos(self) -> None:
        """"Chocolate" es bizcocho y relleno: la unicidad es por grupo."""
        bizcocho, _ = self.service.create({"name": "Bizcocho", "options": ["Chocolate"]})
        relleno, _ = self.service.create({"name": "Relleno", "options": ["Chocolate"]})

        self.assertNotEqual(bizcocho["options"][0]["id"], relleno["options"][0]["id"])

    def test_el_sabor_repetido_devuelve_el_que_ya_estaba(self) -> None:
        grupo, _ = self.service.create({"name": "Relleno", "options": ["Dulce de leche"]})

        payload, creada = self.service.create_option(grupo["id"], {"name": "dulce de leche"})

        self.assertFalse(creada)
        self.assertEqual(grupo["options"][0]["id"], payload["id"])
        self.assertEqual(1, Option.query.count())

    def test_un_nombre_vacio_o_de_solo_invisibles_no_pasa(self) -> None:
        for valor in ("", "   ", "​­", "﻿"):
            with self.subTest(valor=repr(valor)):
                with self.assertRaises(ValidationError):
                    self.service.create({"name": valor})

    def test_un_nombre_larguisimo_se_rechaza_en_vez_de_recortarse(self) -> None:
        """400 explicado y no un recorte en silencio (ADR-030).

        SQLite no hace cumplir el String(120) del modelo: sin este tope
        entraron 4 MB en un `name` en los ingredientes.
        """
        with self.assertRaises(ValidationError) as capturado:
            self.service.create({"name": "A" * 5000})

        self.assertIn(str(TOPE_NOMBRE), str(capturado.exception))
        self.assertEqual(0, OptionGroup.query.count())

    def test_un_nombre_que_no_es_texto_da_400_y_no_500(self) -> None:
        for valor in ({"a": 1}, [1, 2], True):
            with self.subTest(valor=valor):
                with self.assertRaises(ValidationError):
                    self.service.create({"name": valor})

    def test_un_nombre_que_normaliza_vacio_da_400_y_no_500(self) -> None:
        """El hallazgo 3 del review de T18, que ya habia pasado en T6-F20b.

        Una marca combinante suelta **se ve** pero su normalizado queda
        vacio: el rescate del IntegrityError no encontraba la fila que acababa
        de chocar, el error subia crudo y salia 500 con HTML en una API JSON.
        """
        for valor in ("\u0301", "\u0302\u0303", "\u0301 \u0302"):
            with self.subTest(valor=repr(valor)):
                with self.assertRaises(ValidationError) as capturado:
                    self.service.create({"name": valor})
                self.assertIn("letras o números", str(capturado.exception))
        self.assertEqual(0, OptionGroup.query.count())

    def test_dos_nombres_distintos_que_normalizan_vacio_tampoco_chocan(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create({"name": "\u0301"})
        with self.assertRaises(ValidationError):
            self.service.create({"name": "\u0302"})

        self.assertEqual(0, OptionGroup.query.count())

    def test_tampoco_pasa_como_sabor(self) -> None:
        grupo, _ = self.service.create({"name": "Relleno"})

        with self.assertRaises(ValidationError):
            self.service.create_option(grupo["id"], {"name": "\u0301"})

        self.assertEqual(0, Option.query.count())

    def test_no_entran_mas_opciones_que_el_tope(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create(
                {"name": "Relleno", "options": [f"Sabor {i}" for i in range(MAX_OPCIONES + 1)]}
            )

    def test_renombrar_corrige_el_tipeo(self) -> None:
        grupo, _ = self.service.create({"name": "Reyeno"})

        self.service.update(grupo["id"], {"name": "Relleno"})

        self.assertEqual("Relleno", db.session.get(OptionGroup, grupo["id"]).name)

    def test_renombrar_a_uno_que_ya_existe_avisa(self) -> None:
        self.service.create({"name": "Relleno"})
        otro, _ = self.service.create({"name": "Cobertura"})

        with self.assertRaises(ValidationError):
            self.service.update(otro["id"], {"name": "relleno"})

    def test_renombrar_al_mismo_con_otra_grafia_no_choca_consigo_mismo(self) -> None:
        grupo, _ = self.service.create({"name": "relleno"})

        self.service.update(grupo["id"], {"name": "Relleno"})

        self.assertEqual("Relleno", db.session.get(OptionGroup, grupo["id"]).name)

    def test_el_grupo_puede_dejar_de_ser_obligatorio(self) -> None:
        grupo, _ = self.service.create({"name": "Cobertura"})

        self.service.update(grupo["id"], {"required": False})

        self.assertFalse(db.session.get(OptionGroup, grupo["id"]).required)

    def test_una_opcion_de_otro_grupo_no_se_toca_por_la_ruta_de_este(self) -> None:
        """Mismo control que `variant.product_id == product.id` (ADR-029)."""
        bizcocho, _ = self.service.create({"name": "Bizcocho", "options": ["Vainilla"]})
        relleno, _ = self.service.create({"name": "Relleno", "options": ["Chocolate"]})
        ajena = relleno["options"][0]["id"]

        with self.assertRaises(ValidationError):
            self.service.update_option(bizcocho["id"], ajena, {"name": "Robada"})
        with self.assertRaises(ValidationError):
            self.service.delete_option(bizcocho["id"], ajena)

        self.assertEqual("Chocolate", db.session.get(Option, ajena).name)

    def test_borrar_el_grupo_se_lleva_sus_sabores(self) -> None:
        grupo, _ = self.service.create({"name": "Relleno", "options": ["Dulce de leche"]})

        self.service.delete(grupo["id"])

        self.assertEqual(0, OptionGroup.query.count())
        self.assertEqual(0, Option.query.count(), "no pueden quedar sabores colgados")

    def test_borrar_el_grupo_no_rompe_un_pedido_viejo(self) -> None:
        """El renglon guarda nombres, no FKs (ADR-031): el pedido es historia."""
        producto = self.create_product(name="Torta")
        grupo = self.create_option_group(name="Relleno", options=["Dulce de leche"], products=[producto])
        usuario = self.create_user(email="vieja@test.local")
        pedido = self.create_order(user=usuario, product=producto)
        from backend.models import OrderItemOption

        pedido.items[0].options.append(
            OrderItemOption(group_name="Relleno", option_name="Dulce de leche")
        )
        db.session.commit()

        self.service.delete(grupo.id)

        vivo = db.session.get(Order, pedido.id)
        self.assertEqual("Dulce de leche", vivo.items[0].options[0].option_name)

    def test_un_grupo_que_no_existe_da_404(self) -> None:
        with self.assertRaises(NotFoundError):
            self.service.update(9999, {"name": "Relleno"})


class OptionGroupApiTestCase(ApiTestCase):
    """Quien puede tocar los grupos: solo ella (E5)."""

    def test_el_get_es_publico_y_no_filtra_el_esquema(self) -> None:
        token = self.admin_token()
        self.client.post(
            "/api/option-groups",
            json={"name": "Relleno", "options": ["Dulce de leche"]},
            headers=self.auth_headers(token),
        )

        respuesta = self.client.get("/api/option-groups")

        self.assertEqual(200, respuesta.status_code)
        grupo = respuesta.get_json()[0]
        self.assertEqual("Relleno", grupo["name"])
        self.assertNotIn("normalized_name", grupo)

    def test_sin_token_no_se_escribe(self) -> None:
        respuesta = self.client.post("/api/option-groups", json={"name": "Relleno"})

        self.assertEqual(401, respuesta.status_code)

    def test_con_token_de_usuario_comun_tampoco(self) -> None:
        token = self.register_user(email="comun@test.local")

        respuesta = self.client.post(
            "/api/option-groups", json={"name": "Relleno"}, headers=self.auth_headers(token)
        )

        self.assertEqual(403, respuesta.status_code)

    def test_201_si_lo_creo_y_200_si_ya_estaba(self) -> None:
        token = self.admin_token()
        cabeceras = self.auth_headers(token)

        primera = self.client.post("/api/option-groups", json={"name": "Relleno"}, headers=cabeceras)
        segunda = self.client.post("/api/option-groups", json={"name": "relleno"}, headers=cabeceras)

        self.assertEqual(201, primera.status_code)
        self.assertEqual(200, segunda.status_code)
        self.assertEqual(primera.get_json()["id"], segunda.get_json()["id"])

    def test_el_producto_guarda_que_grupos_usa(self) -> None:
        token = self.admin_token()
        cabeceras = self.auth_headers(token)
        grupo = self.client.post(
            "/api/option-groups",
            json={"name": "Relleno", "options": ["Dulce de leche"]},
            headers=cabeceras,
        ).get_json()
        producto_id = self.first_product_id()

        guardado = self.client.put(
            f"/api/products/{producto_id}",
            json={"option_group_ids": [grupo["id"]]},
            headers=cabeceras,
        )
        self.assertEqual(200, guardado.status_code)

        ficha = self.client.get(f"/api/products/{producto_id}").get_json()
        self.assertEqual(["Relleno"], [g["name"] for g in ficha["option_groups"]])

    def test_un_grupo_que_no_existe_no_se_puede_asignar(self) -> None:
        token = self.admin_token()

        respuesta = self.client.put(
            f"/api/products/{self.first_product_id()}",
            json={"option_group_ids": [9999]},
            headers=self.auth_headers(token),
        )

        self.assertEqual(400, respuesta.status_code)


if __name__ == "__main__":
    unittest.main()
