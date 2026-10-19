"""El barrido de huerfanas, la firma de Cloudinary y la ruta publica (F59)."""
from __future__ import annotations

from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path
import threading
import unittest
from uuid import uuid4

from backend.extensions import db
from backend.models import StoredImage
from backend.services.almacen_de_imagenes import almacen_de_imagenes
from backend.services.cloudinary_client import cloudinary_client
from backend.services.exceptions import StorageFullError
from backend.services.rate_limit import limitador
from backend.services.upload_service import UploadService
from backend.tests.imagenes_de_prueba import JPEG_REAL, png
from backend.tests.support import ApiTestCase, BackendServiceTestCase


class CarpetaDeSubidasTestCase(BackendServiceTestCase):
    """Base con una carpeta de subidas propia por test."""

    def setUp(self) -> None:
        super().setUp()
        self.carpeta = Path(__file__).resolve().parent / ".tmp" / f"barrido-{uuid4().hex}"
        self.app.config["UPLOAD_DIR"] = str(self.carpeta)
        self.service = UploadService()

    def tearDown(self) -> None:
        for archivo in self.carpeta.glob("*"):
            archivo.unlink(missing_ok=True)
        if self.carpeta.exists():
            self.carpeta.rmdir()
        super().tearDown()


class BarridoDeHuerfanasTestCase(CarpetaDeSubidasTestCase):
    """D17: lo que nunca llego a un pedido se borra; lo usado, nunca."""

    def envejecer(self, url: str, *, horas: int) -> StoredImage:
        fila = StoredImage.query.filter_by(url=url).one()
        fila.created_at = datetime.utcnow() - timedelta(hours=horas)
        db.session.commit()
        return fila

    def test_la_provisoria_vencida_se_borra_del_disco_y_del_registro(self) -> None:
        subida = self.service.guardar_referencia(JPEG_REAL)
        self.envejecer(subida["url"], horas=48)
        archivo = self.carpeta / subida["filename"]
        self.assertTrue(archivo.is_file())

        borradas = almacen_de_imagenes.barrer_provisorias()

        self.assertEqual(1, borradas)
        self.assertFalse(archivo.exists())
        self.assertEqual(0, StoredImage.query.count())

    def test_la_provisoria_reciente_no_se_toca(self) -> None:
        subida = self.service.guardar_referencia(JPEG_REAL)

        self.assertEqual(0, almacen_de_imagenes.barrer_provisorias())
        self.assertTrue((self.carpeta / subida["filename"]).is_file())

    def test_la_usada_no_se_borra_nunca(self) -> None:
        subida = self.service.guardar_referencia(JPEG_REAL)
        almacen_de_imagenes.marcar_usada(subida["url"])
        db.session.commit()
        self.envejecer(subida["url"], horas=24 * 365)

        self.assertEqual(0, almacen_de_imagenes.barrer_provisorias())
        self.assertTrue((self.carpeta / subida["filename"]).is_file())

    def test_la_del_panel_no_la_barre_aunque_sea_vieja(self) -> None:
        """D17 sigue abierta para las fotos de producto, y es a proposito."""
        subida = self.service.guardar(JPEG_REAL)
        fila = StoredImage.query.filter_by(url=subida["url"]).one()
        fila.provisional = True
        fila.created_at = datetime.utcnow() - timedelta(days=30)
        db.session.commit()

        self.assertEqual(0, almacen_de_imagenes.barrer_provisorias())

    def test_subir_una_nueva_barre_las_vencidas(self) -> None:
        vieja = self.service.guardar_referencia(JPEG_REAL)
        self.envejecer(vieja["url"], horas=48)

        self.service.guardar_referencia(png(6, 4))

        self.assertIsNone(StoredImage.query.filter_by(url=vieja["url"]).first())
        self.assertEqual(1, StoredImage.query.count())


class FirmaDeCloudinaryTestCase(BackendServiceTestCase):
    """La firma, que es lo unico que podemos probar sin red (igual que D20)."""

    def test_la_firma_es_sha1_de_los_parametros_ordenados_mas_el_secreto(self) -> None:
        from hashlib import sha1

        self.app.config["CLOUDINARY_API_SECRET"] = "secreto-de-prueba"
        parametros = {"timestamp": "1700000000", "public_id": "abc", "folder": "andres-bakery"}

        esperada = sha1(
            "folder=andres-bakery&public_id=abc&timestamp=1700000000secreto-de-prueba".encode("utf-8")
        ).hexdigest()
        self.assertEqual(esperada, cloudinary_client.firma(parametros))

    def test_sin_credenciales_no_esta_configurado(self) -> None:
        for clave in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"):
            self.app.config[clave] = ""

        self.assertFalse(cloudinary_client.configurado())

    def test_con_las_tres_si(self) -> None:
        self.app.config["CLOUDINARY_CLOUD_NAME"] = "andres-bakery"
        self.app.config["CLOUDINARY_API_KEY"] = "123"
        self.app.config["CLOUDINARY_API_SECRET"] = "abc"

        self.assertTrue(cloudinary_client.configurado())


class SubidaPublicaApiTestCase(ApiTestCase):
    """La ruta publica, de punta a punta: quien puede y cuanto (H2, H8)."""

    def setUp(self) -> None:
        super().setUp()
        limitador.olvidar_todo()
        self.carpeta = Path(__file__).resolve().parent / ".tmp" / f"api-ref-{uuid4().hex}"
        self.app.config["UPLOAD_DIR"] = str(self.carpeta)

    def tearDown(self) -> None:
        limitador.olvidar_todo()
        for archivo in self.carpeta.glob("*"):
            archivo.unlink(missing_ok=True)
        if self.carpeta.exists():
            self.carpeta.rmdir()
        super().tearDown()

    def subir(self, data: bytes = JPEG_REAL, nombre: str = "torta.jpg"):
        return self.client.post(
            "/api/uploads/referencia",
            data={"file": (BytesIO(data), nombre)},
            content_type="multipart/form-data",
        )

    def test_un_anonimo_sube_su_foto_y_le_vuelve_la_url(self) -> None:
        respuesta = self.subir()

        self.assertEqual(201, respuesta.status_code)
        self.assertTrue(respuesta.get_json()["url"].startswith("/uploads/"))

    def test_lo_que_no_es_imagen_no_entra_por_la_publica(self) -> None:
        respuesta = self.subir(b"%PDF-1.7\n%fake\n", nombre="factura.pdf")

        self.assertEqual(400, respuesta.status_code)

    def test_pasado_el_tope_por_ip_contesta_429_con_retry_after(self) -> None:
        self.app.config["RATE_LIMIT_ENABLED"] = True

        estados = [self.subir().status_code for _ in range(6)]

        self.assertIn(429, estados)
        cortada = self.subir()
        self.assertEqual(429, cortada.status_code)
        self.assertIn("Retry-After", cortada.headers)

    def test_el_413_nombra_el_tope_de_esta_ruta_y_no_el_de_la_otra(self) -> None:
        """Decirle "más de 4 MB" a quien sube por una ruta de 2 es mandarlo a
        adivinar (review de T18)."""
        respuesta = self.subir(JPEG_REAL + b"\x00" * (6 * 1024 * 1024), "enorme.jpg")

        self.assertEqual(413, respuesta.status_code)
        self.assertEqual("application/json", respuesta.mimetype)
        self.assertIn("2 MB", respuesta.get_json()["error"])

    def test_la_del_panel_sigue_siendo_solo_de_ella(self) -> None:
        respuesta = self.client.post(
            "/api/uploads",
            data={"file": (BytesIO(JPEG_REAL), "torta.jpg")},
            content_type="multipart/form-data",
        )

        self.assertEqual(401, respuesta.status_code)

if __name__ == "__main__":
    unittest.main()
