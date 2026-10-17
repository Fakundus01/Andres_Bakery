from __future__ import annotations

from backend.extensions import db
from backend.models import SiteContent
from backend.services.profile_service import ProfileService
from backend.tests.support import BackendServiceTestCase


class ProfileServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.service = ProfileService()

    def test_sin_nada_cargado_devuelve_el_perfil_vacio(self) -> None:
        perfil = self.service.get_profile()

        self.assertEqual(perfil["role"], "")
        self.assertEqual(perfil["socials"], [])
        self.assertFalse(perfil["cv"]["published"])
        self.assertEqual(perfil["cv"]["experience"], [])

    def test_guarda_y_devuelve_lo_que_ella_carga(self) -> None:
        self.service.update_profile(
            {
                "role": "Repostera",
                "tagline": "Hace todo ella",
                "location": "Villa Maipu",
                "socials": [{"network": "instagram", "url": "https://instagram.com/andrea", "label": "@andrea"}],
            }
        )

        perfil = self.service.get_profile()
        self.assertEqual(perfil["role"], "Repostera")
        self.assertEqual(perfil["location"], "Villa Maipu")
        self.assertEqual(len(perfil["socials"]), 1)
        self.assertEqual(perfil["socials"][0]["network"], "instagram")

    def test_una_url_con_javascript_no_se_guarda(self) -> None:
        """El admin es justo quien pega links sin mirarlos (ADR-017)."""
        self.service.update_profile(
            {
                "socials": [
                    {"network": "instagram", "url": "javascript:alert(1)"},
                    {"network": "tiktok", "url": "https://tiktok.com/@andrea"},
                ]
            }
        )

        redes = self.service.get_profile()["socials"]
        self.assertEqual([red["network"] for red in redes], ["tiktok"])

    def test_una_red_que_la_ui_no_sabe_dibujar_se_descarta(self) -> None:
        self.service.update_profile({"socials": [{"network": "myspace", "url": "https://myspace.com/andrea"}]})

        self.assertEqual(self.service.get_profile()["socials"], [])

    def test_la_foto_acepta_una_ruta_del_sitio_pero_no_otro_host_con_doble_barra(self) -> None:
        self.service.update_profile({"photo_url": "/uploads/ab12.jpg"})
        self.assertEqual(self.service.get_profile()["photo_url"], "/uploads/ab12.jpg")

        self.service.update_profile({"photo_url": "//evil.example.com/x.jpg"})
        self.assertEqual(self.service.get_profile()["photo_url"], "")

    def test_recorta_los_textos_largos_y_las_listas_infinitas(self) -> None:
        self.service.update_profile(
            {
                "role": "r" * 400,
                "socials": [{"network": "web", "url": f"https://sitio{i}.com"} for i in range(20)],
                "cv": {"skills": [f"habilidad {i}" for i in range(50)]},
            }
        )

        perfil = self.service.get_profile()
        self.assertEqual(len(perfil["role"]), 120)
        self.assertEqual(len(perfil["socials"]), 8)
        self.assertEqual(len(perfil["cv"]["skills"]), 20)

    def test_una_experiencia_sin_titulo_no_entra(self) -> None:
        self.service.update_profile(
            {
                "cv": {
                    "experience": [
                        {"place": "Sin titulo", "period": "2020"},
                        {"title": "Repostera", "place": "Andres Bakery", "period": "2021-hoy"},
                    ]
                }
            }
        )

        experiencia = self.service.get_profile()["cv"]["experience"]
        self.assertEqual([entrada["title"] for entrada in experiencia], ["Repostera"])

    def test_un_json_roto_en_la_base_no_tira_abajo_la_pagina(self) -> None:
        db.session.add(SiteContent(key="profile", content="{esto no es json"))
        db.session.commit()

        self.assertEqual(self.service.get_profile(), ProfileService().get_profile())
        self.assertEqual(self.service.get_profile()["socials"], [])

    def test_el_cv_arranca_sin_publicar(self) -> None:
        self.service.update_profile({"cv": {"headline": "Reposteria profesional"}})

        cv = self.service.get_profile()["cv"]
        self.assertEqual(cv["headline"], "Reposteria profesional")
        self.assertFalse(cv["published"])
