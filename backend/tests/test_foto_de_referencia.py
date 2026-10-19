from __future__ import annotations

from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path
import unittest
from uuid import uuid4

from backend.extensions import db
from backend.models import Order, StoredImage
from backend.services.almacen_de_imagenes import KIND_REFERENCIA, almacen_de_imagenes
from backend.services.cloudinary_client import cloudinary_client
from backend.services.exceptions import StorageFullError, ValidationError
from backend.services.order_service import OrderService
from backend.services.rate_limit import limitador
from backend.services.upload_service import UploadService
from backend.tests.imagenes_de_prueba import JPEG_REAL, png
from backend.tests.support import ApiTestCase, BackendServiceTestCase


class NotificacionesFalsas:
    def send_order_created_notifications(
        self, order: Order, *, avisar_al_cliente: bool = True
    ) -> dict[str, str]:
        return {"customer": "sent", "admin": "sent"}


class CarpetaDeSubidasTestCase(BackendServiceTestCase):
    """Base con una carpeta de subidas propia por test."""

    def setUp(self) -> None:
        super().setUp()
        self.carpeta = Path(__file__).resolve().parent / ".tmp" / f"referencia-{uuid4().hex}"
        self.app.config["UPLOAD_DIR"] = str(self.carpeta)
        self.service = UploadService()

    def tearDown(self) -> None:
        for archivo in self.carpeta.glob("*"):
            archivo.unlink(missing_ok=True)
        if self.carpeta.exists():
            self.carpeta.rmdir()
        super().tearDown()


class FotoDeReferenciaTestCase(CarpetaDeSubidasTestCase):
    """La subida publica y su registro (F59, ADR-031/032)."""

    def test_la_foto_publica_nace_provisoria(self) -> None:
        subida = self.service.guardar_referencia(JPEG_REAL)

        fila = StoredImage.query.filter_by(url=subida["url"]).one()
        self.assertTrue(fila.provisional)
        self.assertEqual(KIND_REFERENCIA, fila.kind)

    def test_la_del_panel_no_es_provisoria(self) -> None:
        subida = self.service.guardar(JPEG_REAL)

        fila = StoredImage.query.filter_by(url=subida["url"]).one()
        self.assertFalse(fila.provisional)
        self.assertEqual("product", fila.kind)

    def test_el_tope_publico_es_mas_chico_que_el_del_panel(self) -> None:
        self.app.config["UPLOAD_MAX_BYTES"] = 4 * 1024 * 1024
        self.app.config["REFERENCE_UPLOAD_MAX_BYTES"] = 1024

        with self.assertRaises(ValidationError) as capturado:
            self.service.guardar_referencia(JPEG_REAL + b"\x00" * 4096)

        self.assertIn("MB", str(capturado.exception))
        self.assertEqual(0, StoredImage.query.count())

    def test_el_tope_publico_nunca_supera_al_del_panel(self) -> None:
        """Subir el general sin mirar este no puede abrir la ruta publica."""
        self.app.config["UPLOAD_MAX_BYTES"] = 1024
        self.app.config["REFERENCE_UPLOAD_MAX_BYTES"] = 50 * 1024 * 1024

        self.assertEqual(1024, self.service.max_bytes_referencia())

    def test_pasada_la_cuota_no_se_escribe_nada(self) -> None:
        """D18: 4 MB por archivo e infinitos archivos ya no."""
        self.service.guardar_referencia(JPEG_REAL)
        self.app.config["UPLOAD_QUOTA_BYTES"] = len(JPEG_REAL) + 10
        archivos_antes = len(list(self.carpeta.glob("*")))

        with self.assertRaises(StorageFullError) as capturado:
            self.service.guardar_referencia(png(8, 8))

        self.assertEqual(507, capturado.exception.status_code)
        self.assertEqual(archivos_antes, len(list(self.carpeta.glob("*"))))
        self.assertEqual(1, StoredImage.query.count())

    def test_sin_cuota_configurada_no_hay_tope(self) -> None:
        self.app.config["UPLOAD_QUOTA_BYTES"] = 0

        self.service.guardar_referencia(JPEG_REAL)

        self.assertEqual(1, StoredImage.query.count())


class UrlDeLaFotoTestCase(CarpetaDeSubidasTestCase):
    """El control que importa: solo una URL que emitimos nosotros."""

    def test_la_url_de_una_foto_que_subimos_pasa(self) -> None:
        subida = self.service.guardar_referencia(JPEG_REAL)

        self.assertTrue(almacen_de_imagenes.es_referencia(subida["url"]))

    def test_una_url_que_no_emitimos_no_pasa(self) -> None:
        subida = self.service.guardar_referencia(JPEG_REAL)
        nombre = subida["filename"]
        casos = {
            "externa": "https://evil.example.com/foto.jpg",
            "externa http": "http://evil.example.com/foto.jpg",
            "data uri": "data:image/png;base64,AAAA",
            "con salto de carpeta": "/uploads/../../etc/passwd",
            "hex que no existe": "/uploads/" + "ab" * 16 + ".jpg",
            "otra extension": f"/uploads/{nombre.split('.')[0]}.svg",
            "sin extension": f"/uploads/{nombre.split('.')[0]}",
            "vacia": "",
            "no es texto": {"url": "/uploads/x.jpg"},
            "cloudinary de otro": "https://res.cloudinary.com/otro/image/upload/v1/x/" + "ab" * 16 + ".jpg",
        }
        for nombre_caso, url in casos.items():
            with self.subTest(caso=nombre_caso):
                self.assertFalse(almacen_de_imagenes.es_referencia(url))

    def test_la_foto_del_panel_no_sirve_como_referencia_de_un_cliente(self) -> None:
        """Es nuestra, pero no la subio quien pide: no es su referencia."""
        del_panel = self.service.guardar(JPEG_REAL)

        self.assertTrue(almacen_de_imagenes.es_nuestra(del_panel["url"]))
        self.assertFalse(almacen_de_imagenes.es_referencia(del_panel["url"]))

    def test_una_url_de_cloudinary_nuestra_pasa_la_forma(self) -> None:
        self.app.config["CLOUDINARY_CLOUD_NAME"] = "andres-bakery"
        nombre = "ab" * 16
        propia = f"https://res.cloudinary.com/andres-bakery/image/upload/v1700000000/andres-bakery/{nombre}.jpg"

        db.session.add(
            StoredImage(
                storage_key=f"andres-bakery/{nombre}",
                url=propia,
                bytes=1234,
                kind=KIND_REFERENCIA,
                provisional=True,
            )
        )
        db.session.commit()

        self.assertTrue(almacen_de_imagenes.es_referencia(propia))
        self.assertFalse(
            almacen_de_imagenes.es_referencia(propia.replace("andres-bakery/image", "otro/image"))
        )

    def test_el_pedido_rechaza_una_foto_que_no_emitimos(self) -> None:
        service = OrderService(notifications=NotificacionesFalsas())
        producto = self.create_producto_personalizable(name="Torta")

        with self.assertRaises(ValidationError):
            service.create_whatsapp_order(
                {
                    "items": [
                        {
                            "product_id": producto.id,
                            "quantity": 1,
                            "reference_image": "https://evil.example.com/foto.jpg",
                        }
                    ],
                    "customer": {"name": "Vecina", "phone": "1144556677"},
                    "delivery": {"method": "pickup"},
                }
            )
        self.assertEqual(0, Order.query.count())

    def test_la_foto_usada_por_un_pedido_deja_de_ser_provisoria(self) -> None:
        service = OrderService(notifications=NotificacionesFalsas())
        producto = self.create_producto_personalizable(name="Torta")
        subida = self.service.guardar_referencia(JPEG_REAL)

        resultado = service.create_whatsapp_order(
            {
                "items": [
                    {
                        "product_id": producto.id,
                        "quantity": 1,
                        "reference_image": subida["url"],
                    }
                ],
                "customer": {"name": "Vecina", "phone": "1144556677"},
                "delivery": {"method": "pickup"},
            }
        )

        pedido = db.session.get(Order, resultado["order_id"])
        self.assertEqual(subida["url"], pedido.items[0].reference_image)
        self.assertFalse(StoredImage.query.filter_by(url=subida["url"]).one().provisional)


if __name__ == "__main__":
    unittest.main()
