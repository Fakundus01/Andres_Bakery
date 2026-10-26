"""D24 - La grafia de la marca, del lado del servidor.

El humano decidio el 2026-10-25 seguir el logo: la marca es `Andre's Bakery`.
La grafia se escribe a mano UNA vez por lado (aca y en `lib/marca.test.ts`) y
la produccion la lee de `backend/marca.py`.

Las dos decisiones finas, con su razon, estan en `lib/marca.test.ts`. En
resumen: apostrofo recto (U+0027) porque es ASCII y sobrevive a la consola, a
`grep` y al teclado de Andrea cuando edita el texto institucional desde el
panel; y caja normal en los textos, porque las mayusculas del logo son estilo
y no ortografia.

Este archivo es, ademas, el primer test que corre `NotificationService` de
verdad: hasta hoy todos los tests que tocan pedidos le pasan un doble.
"""

from __future__ import annotations

from pathlib import Path
import unittest
from unittest.mock import patch

from backend.extensions import mail
from backend.services.notifications import NotificationService
from backend.services.payment_service import MercadoPagoClient
from backend.models import SiteContent
from backend.tests.support import BackendServiceTestCase

GRAFIA = "Andre's Bakery"

# Partida a proposito: entera, el barrido se encontraria a si mismo y no
# podria dar cero nunca.
VIEJA = " ".join(["Andres", "Bakery"])
TIPOGRAFICO = "’"

RAIZ_DEL_BACK = Path(__file__).resolve().parent.parent

# `tests` queda afuera: los fixtures de `test_profile_service` usan el nombre
# como dato de entrada ("place": un trabajo en un CV de prueba), no como la
# marca del sitio, y renombrarlos seria tocar datos y no texto visible.
# `.venv` y `__pycache__` no son codigo nuestro. `.env` no se lee nunca.
CARPETAS_IGNORADAS = {".venv", "__pycache__", "tests", ".pytest_cache"}


def _fuentes_del_back() -> list[tuple[str, str]]:
    fuentes: list[tuple[str, str]] = []
    for ruta in RAIZ_DEL_BACK.rglob("*.py"):
        if CARPETAS_IGNORADAS & set(ruta.relative_to(RAIZ_DEL_BACK).parts):
            continue
        fuentes.append((str(ruta.relative_to(RAIZ_DEL_BACK)), ruta.read_text(encoding="utf-8")))

    for extra in ("README.md", ".env.example"):
        archivo = RAIZ_DEL_BACK / extra
        if archivo.exists():
            fuentes.append((extra, archivo.read_text(encoding="utf-8")))
    return fuentes


class GrafiaDeLaMarcaTestCase(unittest.TestCase):
    """Lo que no necesita app: la constante y el barrido de las fuentes."""

    def test_la_constante_es_la_grafia_decidida(self) -> None:
        from backend.marca import MARCA

        self.assertEqual(MARCA, GRAFIA)
        self.assertIn("'", MARCA)
        self.assertNotIn(TIPOGRAFICO, MARCA)
        # La caja normal es la grafia; las mayusculas son del logo.
        self.assertNotEqual(MARCA, MARCA.upper())

    def test_el_punto_de_retiro_por_defecto_sale_de_la_constante(self) -> None:
        from backend.marca import MARCA, PUNTO_DE_RETIRO_POR_DEFECTO

        self.assertTrue(PUNTO_DE_RETIRO_POR_DEFECTO.startswith(MARCA))

    def test_el_barrido_mira_archivos_de_verdad(self) -> None:
        # Sin esto, un `rglob` roto dejaria los dos barridos de abajo verdes
        # probando nada.
        fuentes = _fuentes_del_back()
        self.assertGreater(len(fuentes), 30)
        self.assertIn("config.py", [nombre for nombre, _ in fuentes])

    def test_ningun_archivo_del_back_escribe_la_grafia_vieja(self) -> None:
        culpables = [nombre for nombre, fuente in _fuentes_del_back() if VIEJA in fuente]
        self.assertEqual(culpables, [])

    def test_nadie_escribe_la_marca_en_mayusculas_ni_con_apostrofo_tipografico(self) -> None:
        fuentes = _fuentes_del_back()
        self.assertEqual([nombre for nombre, fuente in fuentes if GRAFIA.upper() in fuente], [])
        self.assertEqual([nombre for nombre, fuente in fuentes if TIPOGRAFICO in fuente], [])


class LaMarcaEnLoQueSaleDelServidorTestCase(BackendServiceTestCase):
    """Los tres textos del back que el cliente lee de verdad."""

    def test_los_dos_mails_del_pedido_dicen_la_marca(self) -> None:
        from backend.marca import MARCA

        self.app.config["MAIL_SERVER"] = "smtp.test.local"
        user = self.create_user(email="clienta@test.local")
        order = self.create_order(user=user, product=self.create_product(price="4000.00"))

        enviados = []
        with patch.object(mail, "send", side_effect=enviados.append):
            resultado = NotificationService().send_order_created_notifications(order)

        self.assertEqual(resultado, {"customer": "sent", "admin": "sent"})
        asuntos = [mensaje.subject for mensaje in enviados]
        self.assertEqual(
            asuntos,
            [f"{MARCA} | Confirmación de pedido #{order.id}", f"{MARCA} | Nuevo pedido #{order.id}"],
        )
        # El cuerpo del mail al cliente tambien la nombra.
        self.assertIn(f"en {MARCA}.", enviados[0].body)
        for mensaje in enviados:
            self.assertNotIn(VIEJA, mensaje.subject)
            self.assertNotIn(VIEJA, mensaje.body)

    def test_el_texto_institucional_sembrado_dice_la_marca(self) -> None:
        from backend.marca import MARCA

        about = SiteContent.query.get("about")
        self.assertIsNotNone(about)
        self.assertTrue(about.content.startswith(MARCA))

    def test_la_descripcion_del_envio_en_mercado_pago_dice_la_marca(self) -> None:
        from backend.marca import MARCA

        self.app.config["MERCADO_PAGO_ACCESS_TOKEN"] = "token-de-prueba"
        user = self.create_user(email="otra@test.local")
        order = self.create_order(user=user, product=self.create_product(price="4000.00"))

        capturado: dict = {}

        class ClienteQueNoSale(MercadoPagoClient):
            def _request(self, method: str, path: str, payload: dict | None = None) -> dict:
                capturado.update(payload or {})
                return {"id": "pref-1"}

        ClienteQueNoSale().create_preference(order, "visa")

        descripciones = [item.get("description") for item in capturado["items"]]
        self.assertIn(f"Logística local de {MARCA}", descripciones)


if __name__ == "__main__":
    unittest.main()
