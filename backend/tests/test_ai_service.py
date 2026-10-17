from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from backend.services.ai_service import AVISO, RecipeDraftService
from backend.services.exceptions import ConfigurationError, ServiceError, ValidationError
from backend.services.upload_service import UploadService
from backend.tests.imagenes_de_prueba import JPEG_REAL
from backend.tests.support import BackendServiceTestCase


class FakeRecipeClient:
    """El cliente falso, como `FakeMercadoPagoClient`: nunca se llama a la API real."""

    def __init__(self, respuesta: dict | None = None) -> None:
        self.llamadas: list[dict] = []
        self.respuesta = respuesta if respuesta is not None else {
            "name": "Brownie clasico",
            "category": "Brownies",
            "description": "Brownie humedo de chocolate semiamargo.",
            "unit_label": "unidad",
            "ingredients": ["Chocolate semiamargo", "Manteca", "Huevos", "Azucar", "Harina"],
            "steps": ["Derretir el chocolate con la manteca.", "Batir huevos con azucar.", "Hornear 25 minutos."],
        }

    def draft(self, *, imagen: bytes, media_type: str, pista: str) -> dict:
        self.llamadas.append({"bytes": len(imagen), "media_type": media_type, "pista": pista})
        return self.respuesta


class RecipeDraftServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.carpeta = Path(__file__).resolve().parent / ".tmp" / f"ai-{uuid4().hex}"
        self.app.config["UPLOAD_DIR"] = str(self.carpeta)
        self.app.config["AI_ENABLED"] = True
        self.app.config["ANTHROPIC_API_KEY"] = "sk-de-test"
        self.app.config["AI_DAILY_LIMIT"] = 25
        self.subida = UploadService().guardar(JPEG_REAL)
        self.client = FakeRecipeClient()
        self.service = RecipeDraftService(client=self.client)

    def tearDown(self) -> None:
        for archivo in self.carpeta.glob("*"):
            archivo.unlink()
        if self.carpeta.exists():
            self.carpeta.rmdir()
        super().tearDown()

    def test_devuelve_el_borrador_con_el_aviso_de_que_lo_escribio_una_ia(self) -> None:
        borrador = self.service.draft({"image_url": self.subida["url"], "hint": "brownie"})

        self.assertEqual(borrador["name"], "Brownie clasico")
        self.assertEqual(borrador["category"], "brownies")
        self.assertEqual(len(borrador["ingredients"]), 5)
        self.assertEqual(borrador["notice"], AVISO)
        self.assertEqual(self.client.llamadas[0]["media_type"], "image/jpeg")
        self.assertEqual(self.client.llamadas[0]["pista"], "brownie")

    def test_nunca_devuelve_etiquetas_aunque_el_modelo_las_mande(self) -> None:
        """Los alergenos los declara ella, no un modelo (ADR-020)."""
        self.client.respuesta = dict(self.client.respuesta, tags=["sin TACC", "vegano"], tag_ids=[1, 2])

        borrador = self.service.draft({"image_url": self.subida["url"]})

        self.assertNotIn("tags", borrador)
        self.assertNotIn("tag_ids", borrador)
        self.assertEqual(
            set(borrador),
            {"name", "category", "description", "unit_label", "ingredients", "steps", "notice"},
        )

    def test_la_salida_del_modelo_se_recorta_sin_preguntar(self) -> None:
        self.client.respuesta = {
            "name": "N" * 500,
            "category": "C" * 500,
            "description": "D" * 5000,
            "unit_label": "",
            "ingredients": [f"ingrediente {i}" for i in range(80)],
            "steps": [f"paso {i}" for i in range(80)],
            "precio": 999999,
            "sql": "DROP TABLE product",
        }

        borrador = self.service.draft({"image_url": self.subida["url"]})

        self.assertEqual(len(borrador["name"]), 120)
        self.assertEqual(len(borrador["description"]), 600)
        self.assertEqual(len(borrador["ingredients"]), 20)
        self.assertEqual(len(borrador["steps"]), 15)
        self.assertEqual(borrador["unit_label"], "unidad")
        self.assertNotIn("precio", borrador)
        self.assertNotIn("sql", borrador)

    def test_una_respuesta_que_no_es_un_objeto_no_rompe_nada(self) -> None:
        self.client.respuesta = ["esto no es el esquema"]

        borrador = self.service.draft({"image_url": self.subida["url"]})

        self.assertEqual(borrador["name"], "")
        self.assertEqual(borrador["ingredients"], [])

    def test_apagado_responde_que_esta_apagado(self) -> None:
        self.app.config["AI_ENABLED"] = False

        with self.assertRaises(ConfigurationError) as capturado:
            self.service.draft({"image_url": self.subida["url"]})

        self.assertEqual(capturado.exception.status_code, 503)
        self.assertIn("AI_ENABLED", str(capturado.exception))
        self.assertEqual(self.client.llamadas, [])

    def test_sin_llave_no_se_prende_ni_con_el_flag_en_true(self) -> None:
        self.app.config["ANTHROPIC_API_KEY"] = ""

        with self.assertRaises(ConfigurationError) as capturado:
            self.service.draft({"image_url": self.subida["url"]})

        self.assertIn("ANTHROPIC_API_KEY", str(capturado.exception))

    def test_el_techo_diario_corta_y_no_gasta_mas(self) -> None:
        self.app.config["AI_DAILY_LIMIT"] = 2

        self.service.draft({"image_url": self.subida["url"]})
        self.service.draft({"image_url": self.subida["url"]})
        with self.assertRaises(ServiceError) as capturado:
            self.service.draft({"image_url": self.subida["url"]})

        self.assertEqual(capturado.exception.status_code, 429)
        self.assertEqual(len(self.client.llamadas), 2)

    def test_solo_acepta_fotos_ya_subidas_al_propio_sitio(self) -> None:
        """Una URL cualquiera convertiria al back en un proxy (SSRF)."""
        for intento in (
            "https://evil.example.com/foto.jpg",
            "http://127.0.0.1:5000/api/health",
            "file:///C:/Windows/win.ini",
            "/etc/passwd",
            "",
            None,
        ):
            with self.assertRaises(ValidationError):
                self.service.draft({"image_url": intento})

        self.assertEqual(self.client.llamadas, [])

    def test_una_foto_que_no_esta_en_el_servidor_se_rechaza(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.draft({"image_url": "/uploads/" + "a" * 32 + ".jpg"})
