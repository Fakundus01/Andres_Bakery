from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from backend.services.exceptions import ValidationError
from backend.services.upload_service import UploadService
from backend.tests.imagenes_de_prueba import JPEG_REAL, jpeg_con_exif_gigante, png
from backend.tests.support import BackendServiceTestCase


class UploadServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.carpeta = Path(__file__).resolve().parent / ".tmp" / f"uploads-{uuid4().hex}"
        self.app.config["UPLOAD_DIR"] = str(self.carpeta)
        self.service = UploadService()

    def tearDown(self) -> None:
        for archivo in self.carpeta.glob("*"):
            archivo.unlink()
        if self.carpeta.exists():
            self.carpeta.rmdir()
        super().tearDown()

    def test_guarda_la_foto_y_devuelve_su_url(self) -> None:
        respuesta = self.service.guardar(JPEG_REAL)

        self.assertTrue(respuesta["url"].startswith("/uploads/"))
        self.assertEqual(respuesta["content_type"], "image/jpeg")
        self.assertEqual((respuesta["width"], respuesta["height"]), (16, 12))
        self.assertTrue((self.carpeta / respuesta["filename"]).is_file())

    def test_el_nombre_lo_pone_el_servidor_y_no_se_repite(self) -> None:
        """El nombre del cliente se descarta entero: sin eso no hay `../`."""
        primera = self.service.guardar(JPEG_REAL)
        segunda = self.service.guardar(JPEG_REAL)

        self.assertNotEqual(primera["filename"], segunda["filename"])
        self.assertRegex(primera["filename"], r"^[0-9a-f]{32}\.jpg$")

    def test_lo_que_queda_en_disco_no_tiene_el_exif(self) -> None:
        respuesta = self.service.guardar(jpeg_con_exif_gigante(2048))

        guardado = (self.carpeta / respuesta["filename"]).read_bytes()
        self.assertNotIn(b"Exif\x00\x00", guardado)

    def test_un_png_tambien_entra(self) -> None:
        respuesta = self.service.guardar(png(6, 4))

        self.assertEqual(respuesta["content_type"], "image/png")
        self.assertTrue(respuesta["filename"].endswith(".png"))

    def test_un_archivo_que_no_es_imagen_no_toca_el_disco(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.guardar(b"%PDF-1.7\n%fake pdf\n")

        self.assertEqual(list(self.carpeta.glob("*")) if self.carpeta.exists() else [], [])

    def test_un_archivo_mas_grande_que_el_tope_se_rechaza(self) -> None:
        self.app.config["UPLOAD_MAX_BYTES"] = 1024

        with self.assertRaises(ValidationError) as capturado:
            self.service.guardar(JPEG_REAL + b"\x00" * 2048)

        self.assertIn("MB", str(capturado.exception))

    def test_no_llego_nada(self) -> None:
        with self.assertRaises(ValidationError):
            self.service.guardar(b"")

    def test_ruta_de_solo_acepta_el_nombre_que_genera_el_servidor(self) -> None:
        respuesta = self.service.guardar(JPEG_REAL)

        self.assertIsNotNone(self.service.ruta_de(respuesta["filename"]))
        for intento in (
            "../../../backend/config.py",
            "..\\config.py",
            "/etc/passwd",
            "noexiste.jpg",
            "ZZZZ0000000000000000000000000000.jpg",
            respuesta["filename"].replace(".jpg", ".py"),
        ):
            self.assertIsNone(self.service.ruta_de(intento), intento)
