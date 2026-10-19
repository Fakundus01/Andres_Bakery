"""La cuota: bajo concurrencia y por puerta (review de T18).

Salio de `test_subida_publica.py`, que paso las 300 lineas (R05). La base
`CarpetaDeSubidasTestCase` se repite a proposito: un archivo de tests que
importa de otro archivo de tests es peor que doce lineas repetidas.

El barrido de huerfanas, la firma de Cloudinary y la ruta publica (F59).
"""
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


class CuotaBajoConcurrenciaTestCase(CarpetaDeSubidasTestCase):
    """La cuota no puede sostenerse con una mirada (hallazgo del review de T18).

    El reviewer soltó seis subidas simultáneas contra una cuota que alcanzaba
    para una, por la ruta **pública sin sesión**, y entraron las seis: 5,7× la
    cuota. Era el mismo `check-then-insert` que ADR-030 ya había tenido que
    cerrar para la unicidad del ingrediente, en otro archivo.
    """

    def subir_en_paralelo(self, cuantos: int) -> list[str]:
        """`cuantos` hilos que salen juntos. Devuelve qué pasó en cada uno.

        Cada hilo necesita su propio contexto de app: la sesión de SQLAlchemy
        es por hilo, y sin contexto el servicio no ve ni la config ni la base.
        """
        largada = threading.Barrier(cuantos)
        resultados: list[str] = []
        candado = threading.Lock()

        def subir() -> None:
            largada.wait()
            with self.app.app_context():
                try:
                    self.service.guardar_referencia(JPEG_REAL)
                    salida = "ok"
                except StorageFullError:
                    salida = "sin lugar"
                except Exception as exc:  # noqa: BLE001 - lo que salga, se reporta
                    salida = f"{type(exc).__name__}: {exc}"
            with candado:
                resultados.append(salida)

        hilos = [threading.Thread(target=subir) for _ in range(cuantos)]
        for hilo in hilos:
            hilo.start()
        for hilo in hilos:
            hilo.join()
        return resultados

    def test_seis_subidas_simultaneas_no_pasan_una_cuota_de_una(self) -> None:
        self.app.config["UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) + 10

        resultados = self.subir_en_paralelo(6)

        self.assertEqual(1, resultados.count("ok"), f"entró más de una: {resultados}")
        self.assertLessEqual(
            almacen_de_imagenes.espacio_usado(),
            self.app.config["UPLOAD_QUOTA_BYTES"],
            "el espacio registrado pasó la cuota",
        )
        self.assertEqual(
            1, len(list(self.carpeta.glob("*"))), "quedó más de un archivo en disco"
        )

    def test_con_lugar_de_sobra_entran_todas(self) -> None:
        """El candado no puede volverse un tope: con lugar, las seis pasan."""
        self.app.config["UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) * 100

        resultados = self.subir_en_paralelo(6)

        self.assertEqual(6, resultados.count("ok"), f"alguna falló de más: {resultados}")
        self.assertEqual(6, StoredImage.query.count())

    def test_una_reserva_que_no_llego_a_archivo_no_ocupa_lugar_para_siempre(self) -> None:
        """Si el destino falla entre reservar y escribir, la reserva se suelta.

        Sin esto, cada subida fallida descontaría cuota para siempre y el
        único arreglo sería editar la base a mano.
        """
        self.app.config["UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) * 3
        fallas = {"veces": 0}

        original = almacen_de_imagenes._escribir_en_disco

        def explotar(nombre: str, data: bytes) -> None:
            fallas["veces"] += 1
            raise OSError("disco lleno de verdad")

        almacen_de_imagenes._escribir_en_disco = explotar
        try:
            with self.assertRaises(OSError):
                self.service.guardar_referencia(JPEG_REAL)
        finally:
            almacen_de_imagenes._escribir_en_disco = original

        self.assertEqual(1, fallas["veces"])
        self.assertEqual(0, StoredImage.query.count(), "quedó una reserva fantasma")
        self.assertEqual(0, almacen_de_imagenes.espacio_usado())

        # Y la cuota quedó libre: la siguiente entra.
        self.service.guardar_referencia(JPEG_REAL)
        self.assertEqual(1, StoredImage.query.count())


class CadaPuertaConSuCuotaTestCase(CarpetaDeSubidasTestCase):
    """Que el anonimo no le coma el lugar a las fotos de la carta.

    Lo marco el pentester de T18: con una sola cuota, quien sube sin sesion la
    llenaba y **Andrea recibia un 507 al subir la foto de un producto**, con
    un mensaje escrito para clientes.
    """

    def test_la_referencia_llena_su_cuota_y_el_panel_sigue_pudiendo_subir(self) -> None:
        self.app.config["UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) * 10
        self.app.config["REFERENCE_UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) + 10

        self.service.guardar_referencia(JPEG_REAL)
        with self.assertRaises(StorageFullError) as capturado:
            self.service.guardar_referencia(png(8, 8))

        # El mensaje del cliente no le habla de variables de entorno.
        self.assertIn("sin foto", str(capturado.exception))

        # Y la puerta de ella sigue abierta.
        subida = self.service.guardar(JPEG_REAL)
        self.assertTrue(subida["url"].startswith("/uploads/"))

    def test_el_total_sigue_valiendo_para_las_dos(self) -> None:
        self.app.config["UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) + 10
        self.app.config["REFERENCE_UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) * 100

        self.service.guardar(JPEG_REAL)
        with self.assertRaises(StorageFullError) as capturado:
            self.service.guardar_referencia(png(8, 8))

        self.assertIn("sin foto", str(capturado.exception))

    def test_el_mensaje_del_panel_esta_escrito_para_ella(self) -> None:
        self.app.config["UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) + 10

        self.service.guardar(JPEG_REAL)
        with self.assertRaises(StorageFullError) as capturado:
            self.service.guardar(png(8, 8))

        self.assertIn("Borrá alguna foto vieja", str(capturado.exception))

if __name__ == "__main__":
    unittest.main()
