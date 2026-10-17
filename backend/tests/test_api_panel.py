from __future__ import annotations

from io import BytesIO
from pathlib import Path
import unittest
from uuid import uuid4

from backend.tests.imagenes_de_prueba import JPEG_REAL
from backend.tests.support import ApiTestCase


class PanelApiTestCase(ApiTestCase):
    """Los endpoints que entraron con T11-T14, de punta a punta."""

    def setUp(self) -> None:
        super().setUp()
        self.carpeta = Path(__file__).resolve().parent / ".tmp" / f"api-uploads-{uuid4().hex}"
        self.app.config["UPLOAD_DIR"] = str(self.carpeta)

    def tearDown(self) -> None:
        if self.carpeta.exists():
            for archivo in self.carpeta.glob("*"):
                archivo.unlink()
            self.carpeta.rmdir()
        super().tearDown()

    def subir(self, data: bytes, nombre: str = "foto.jpg") -> object:
        return self.client.post(
            "/api/uploads",
            data={"file": (BytesIO(data), nombre)},
            content_type="multipart/form-data",
            headers=self.auth_headers(self.admin_token()),
        )

    # --- Subida de fotos (F45) ---

    def test_solo_el_admin_sube_fotos(self) -> None:
        token_cliente = self.register_user(email="sube@test.local")

        anonimo = self.client.post("/api/uploads", data={}, content_type="multipart/form-data")
        cliente = self.client.post(
            "/api/uploads",
            data={"file": (BytesIO(JPEG_REAL), "foto.jpg")},
            content_type="multipart/form-data",
            headers=self.auth_headers(token_cliente),
        )

        self.assertEqual(anonimo.status_code, 401)
        self.assertEqual(cliente.status_code, 403)

    def test_subir_una_foto_devuelve_su_url_y_se_puede_ver(self) -> None:
        respuesta = self.subir(JPEG_REAL)

        self.assertEqual(respuesta.status_code, 201)
        url = respuesta.get_json()["url"]

        servida = self.client.get(url)
        self.assertEqual(servida.status_code, 200)
        self.assertEqual(servida.headers["Content-Type"], "image/jpeg")
        self.assertEqual(servida.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(servida.headers["Content-Disposition"], "inline")

    def test_el_nombre_que_manda_el_navegador_no_decide_nada(self) -> None:
        """Un .php o un ../ en el nombre no llegan al disco (ADR-018)."""
        respuesta = self.subir(JPEG_REAL, nombre="../../app.php")

        self.assertEqual(respuesta.status_code, 201)
        self.assertRegex(respuesta.get_json()["filename"], r"^[0-9a-f]{32}\.jpg$")

    def test_un_html_renombrado_a_jpg_se_rechaza_en_castellano(self) -> None:
        respuesta = self.subir(b"<html><script>alert(1)</script></html>", nombre="foto.jpg")

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("imagen", respuesta.get_json()["error"].lower())

    def test_pedir_un_archivo_que_no_existe_es_404(self) -> None:
        self.assertEqual(self.client.get("/uploads/" + "a" * 32 + ".jpg").status_code, 404)
        self.assertEqual(self.client.get("/uploads/..%2Fconfig.py").status_code, 404)

    def test_toda_respuesta_trae_los_headers_de_seguridad(self) -> None:
        respuesta = self.client.get("/api/products")

        self.assertEqual(respuesta.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(respuesta.headers["X-Frame-Options"], "DENY")
        self.assertEqual(respuesta.headers["Referrer-Policy"], "no-referrer")
        self.assertIn("default-src 'none'", respuesta.headers["Content-Security-Policy"])

    # --- Perfil y CV (F43, F44) ---

    def test_el_perfil_es_publico_y_solo_el_admin_lo_edita(self) -> None:
        publico = self.client.get("/api/site/profile")
        self.assertEqual(publico.status_code, 200)
        self.assertIn("socials", publico.get_json())

        self.assertEqual(self.client.put("/api/site/profile", json={"role": "x"}).status_code, 401)

        guardado = self.client.put(
            "/api/site/profile",
            json={"role": "Repostera", "socials": [{"network": "instagram", "url": "https://instagram.com/a"}]},
            headers=self.auth_headers(self.admin_token()),
        )
        self.assertEqual(guardado.status_code, 200)
        self.assertEqual(self.client.get("/api/site/profile").get_json()["role"], "Repostera")

    # --- Metricas (F47, F48) ---

    def test_contar_una_visita_no_pide_login_ni_deja_cookie(self) -> None:
        respuesta = self.client.post("/api/metrics/view", json={"path": "/tienda", "device": "mouse"})

        self.assertEqual(respuesta.status_code, 204)
        self.assertNotIn("Set-Cookie", respuesta.headers)

    def test_el_resumen_es_solo_del_admin(self) -> None:
        token_cliente = self.register_user(email="mira@test.local")

        self.assertEqual(self.client.get("/api/metrics/summary").status_code, 401)
        self.assertEqual(
            self.client.get("/api/metrics/summary", headers=self.auth_headers(token_cliente)).status_code,
            403,
        )

        respuesta = self.client.get(
            "/api/metrics/summary?days=7",
            headers=self.auth_headers(self.admin_token()),
        )
        self.assertEqual(respuesta.status_code, 200)
        payload = respuesta.get_json()
        self.assertEqual(payload["days"], 7)
        self.assertEqual(len(payload["visits_by_day"]), 7)

    # --- Asistente de IA (F46) ---

    def test_el_asistente_apagado_responde_503_y_explica_que_falta(self) -> None:
        respuesta = self.client.post(
            "/api/ai/recipe-draft",
            json={"image_url": "/uploads/" + "a" * 32 + ".jpg"},
            headers=self.auth_headers(self.admin_token()),
        )

        self.assertEqual(respuesta.status_code, 503)
        self.assertIn("AI_ENABLED", respuesta.get_json()["error"])

    def test_el_asistente_no_es_publico(self) -> None:
        self.assertEqual(self.client.post("/api/ai/recipe-draft", json={}).status_code, 401)

    def test_el_front_se_entera_de_que_la_ia_esta_apagada(self) -> None:
        payload = self.client.get("/api/site/delivery").get_json()

        self.assertIn("ai_enabled", payload)
        self.assertFalse(payload["ai_enabled"])


if __name__ == "__main__":
    unittest.main()
