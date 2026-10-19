from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from backend.extensions import db
from backend.models import Ingredient
from backend.services.exceptions import ValidationError
from backend.services.ingredient_service import IngredientService
from backend.tests.support import BackendServiceTestCase


class IngredientServiceTestCase(BackendServiceTestCase):
    """El servicio no tenia un solo test hasta T6-F20b.

    Hasta esta tarjeta la unicidad era por nombre **exacto**: el panel comparaba
    normalizado y el back exacto, asi que con la lista del panel vieja entraba
    el duplicado. Reproducido en el navegador: quedaron "Coco rallado" y
    "coco rallado" en la misma lista.
    """

    def setUp(self) -> None:
        super().setUp()
        self.service = IngredientService()

    def test_un_nombre_que_normaliza_vacio_da_400_y_no_500(self) -> None:
        """Misma puerta que en los grupos de opciones (review de T18)."""
        with self.assertRaises(ValidationError):
            self.service.create({"name": "\u0301"})
        with self.assertRaises(ValidationError):
            self.service.create({"name": "\u0302"})

        self.assertEqual(0, Ingredient.query.count())

    def test_create_devuelve_el_que_ya_existe_en_vez_de_duplicarlo(self) -> None:
        payload, creado = self.service.create({"name": "Coco rallado"})
        self.assertTrue(creado)

        repetido, creado_de_nuevo = self.service.create({"name": "coco rallado"})

        self.assertFalse(creado_de_nuevo)
        self.assertEqual(repetido["id"], payload["id"])
        self.assertEqual(Ingredient.query.count(), 1)
        # El nombre que gana es el primero: lo escribio ella, no lo pisa un
        # alta posterior con otra grafia.
        self.assertEqual(db.session.get(Ingredient, payload["id"]).name, "Coco rallado")

    def test_create_ignora_acentos_y_espacios_de_mas(self) -> None:
        payload, _ = self.service.create({"name": "Azúcar impalpable"})

        for variante in ("azucar impalpable", "  AZUCAR   IMPALPABLE  ", "Azúcar  impalpable"):
            repetido, creado = self.service.create({"name": variante})
            self.assertFalse(creado, variante)
            self.assertEqual(repetido["id"], payload["id"], variante)

        self.assertEqual(Ingredient.query.count(), 1)

    def test_create_no_confunde_la_enie_con_una_n(self) -> None:
        # La ñ es otra letra, no una n con acento. Barrerla junto con los
        # acentos haria desaparecer uno de los dos nombres de su lista.
        pina, _ = self.service.create({"name": "Piña"})
        pina_sin_enie, creado = self.service.create({"name": "Pina"})

        self.assertTrue(creado)
        self.assertNotEqual(pina["id"], pina_sin_enie["id"])
        self.assertEqual(Ingredient.query.count(), 2)

    def test_create_no_deja_pasar_un_nombre_gigante(self) -> None:
        # SQLite no hace cumplir el String(120) del modelo: sin este tope
        # entraron 4 MB en `name`, y el GET /api/ingredients es publico.
        with self.assertRaises(ValidationError):
            self.service.create({"name": "a" * 121})

        self.assertEqual(Ingredient.query.count(), 0)

    def test_create_no_deja_pasar_una_unidad_gigante(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.create({"name": "Harina", "unit": "g" * 41})

        self.assertEqual(Ingredient.query.count(), 0)

    def test_create_con_tipos_raros_es_400_y_no_500(self) -> None:
        for basura in ({"name": {"a": 1}}, {"name": ["x"]}, {"name": True}):
            with self.assertRaises(ValidationError, msg=basura):
                self.service.create(basura)

        with self.assertRaises(ValidationError):
            self.service.create({"name": "Harina", "unit": {"a": 1}})

    def test_create_sigue_rechazando_el_nombre_vacio(self) -> None:
        for vacio in ("", "   ", "​"):
            with self.assertRaises(ValidationError, msg=repr(vacio)):
                self.service.create({"name": vacio})

    def test_update_no_puede_pisar_el_nombre_de_otro_ni_normalizado(self) -> None:
        self.service.create({"name": "Azúcar"})
        harina, _ = self.service.create({"name": "Harina"})

        with self.assertRaises(ValidationError):
            self.service.update(harina["id"], {"name": "azucar"})

        self.assertEqual(db.session.get(Ingredient, harina["id"]).name, "Harina")

    def test_update_deja_corregir_la_grafia_del_mismo(self) -> None:
        # Renombrar "azucar" a "Azúcar" choca consigo mismo si la comparacion
        # no excluye la propia fila: es el caso de corregir un tipeo.
        azucar, _ = self.service.create({"name": "azucar"})

        self.service.update(azucar["id"], {"name": "Azúcar"})

        self.assertEqual(db.session.get(Ingredient, azucar["id"]).name, "Azúcar")

    def test_update_tiene_los_mismos_topes_que_el_alta(self) -> None:
        harina, _ = self.service.create({"name": "Harina"})

        with self.assertRaises(ValidationError):
            self.service.update(harina["id"], {"name": "a" * 121})
        with self.assertRaises(ValidationError):
            self.service.update(harina["id"], {"unit": "g" * 41})

        self.assertEqual(db.session.get(Ingredient, harina["id"]).name, "Harina")

    def test_el_nombre_se_guarda_sin_el_espacio_de_mas(self) -> None:
        payload, _ = self.service.create({"name": "  Harina   0000  "})

        self.assertEqual(db.session.get(Ingredient, payload["id"]).name, "Harina 0000")

    def test_la_unicidad_normalizada_la_sostiene_la_base(self) -> None:
        """La restriccion, no el chequeo.

        El `unique=True` del modelo es por nombre **exacto**, que es justo la
        que la tarjeta dice que no alcanza: con `check-then-insert` y sin una
        restriccion que lo respalde, dos requests casi simultaneos con grafia
        distinta entran los dos. Lo midio el reviewer con 8 hilos: 3 filas.
        """
        self.service.create({"name": "Coco rallado"})

        db.session.add(Ingredient(name="coco RALLADO"))
        with self.assertRaises(IntegrityError):
            db.session.commit()
        db.session.rollback()

    def test_la_carrera_no_crea_la_segunda_fila_ni_tira_500(self) -> None:
        """La ventana entre mirar y escribir, simulada a proposito.

        Se finge que la busqueda no vio nada (otra request la creo en el
        medio). El alta tiene que terminar devolviendo la que ya existe, no
        reventar con un IntegrityError que `json_endpoint` no atrapa y que
        sale como 500 con HTML en una API JSON.
        """
        original, _ = self.service.create({"name": "Coco rallado"})

        # La primera mirada no lo ve (otra request lo creo en el medio); la
        # de rescate, despues del IntegrityError, si. Fingir que las dos
        # fallan no seria una carrera: seria una base rota.
        real = self.service._buscar_por_nombre
        fallos = {"restantes": 1}

        def mira_tarde(nombre: str):
            if fallos["restantes"]:
                fallos["restantes"] -= 1
                return None
            return real(nombre)

        self.service._buscar_por_nombre = mira_tarde  # type: ignore[method-assign]
        payload, creado = self.service.create({"name": "coco rallado"})

        self.assertFalse(creado)
        self.assertEqual(payload["id"], original["id"])
        self.assertEqual(Ingredient.query.count(), 1)

    def test_un_nombre_gigante_no_se_recorta_en_silencio(self) -> None:
        """ADR-030 promete 400, no recorte.

        `saneado.texto` recorta **antes** de que midamos, asi que 5000
        caracteres con invisibles entraban como una fila de 61 y con 201.
        """
        with self.assertRaises(ValidationError):
            self.service.create({"name": "a​" * 2500})

        self.assertEqual(Ingredient.query.count(), 0)

    def test_el_nombre_normalizado_no_depende_de_como_vengan_los_saltos(self) -> None:
        """Espeja al front, que colapsa cualquier espacio en blanco.

        El back pasaba por `saneado.texto(una_linea=True)`, que convierte el
        salto en " · ": "coco\nrallado" normalizaba distinto de los dos lados.
        """
        primero, _ = self.service.create({"name": "Coco rallado"})
        repetido, creado = self.service.create({"name": "coco\nrallado"})

        self.assertFalse(creado)
        self.assertEqual(repetido["id"], primero["id"])
