from __future__ import annotations

import json

from ..extensions import db
from ..models import SiteContent


CLAVE = "profile"

# Las redes que la UI sabe dibujar. Lo que no esta en esta lista no se guarda:
# un `network` libre termina siendo una clase de CSS que no existe o un icono
# que falta, y nadie se entera hasta que la pagina esta publicada.
REDES = (
    "instagram",
    "tiktok",
    "facebook",
    "youtube",
    "whatsapp",
    "linkedin",
    "pinterest",
    "web",
    "mail",
)

MAX_REDES = 8
MAX_ENTRADAS = 12
MAX_HABILIDADES = 20

LARGO_CORTO = 120
LARGO_MEDIO = 500
LARGO_LARGO = 2000


def _texto(valor: object, tope: int) -> str:
    if not isinstance(valor, str):
        return ""
    return valor.strip()[:tope]


def _url(valor: object, *, relativa: bool = False, mailto: bool = False) -> str:
    """Solo lo que es seguro poner en un `href`.

    `javascript:...` en un campo que despues sale en un link es XSS almacenado
    con un formulario de admin de por medio, y el admin es justo quien pega
    links sin mirarlos (ADR-017).
    """
    crudo = _texto(valor, LARGO_MEDIO)
    if not crudo:
        return ""
    bajo = crudo.lower()
    if bajo.startswith(("http://", "https://")):
        return crudo
    if mailto and bajo.startswith("mailto:"):
        return crudo
    # Una ruta propia del sitio ("/uploads/ab12.jpg"): nunca "//otro-host".
    if relativa and crudo.startswith("/") and not crudo.startswith("//"):
        return crudo
    return ""


def _entrada(valor: object) -> dict | None:
    """Una experiencia o un estudio. Sin titulo no es nada: se descarta."""
    if not isinstance(valor, dict):
        return None
    entrada = {
        "title": _texto(valor.get("title"), LARGO_CORTO),
        "place": _texto(valor.get("place"), LARGO_CORTO),
        "period": _texto(valor.get("period"), 60),
        "detail": _texto(valor.get("detail"), LARGO_LARGO),
    }
    return entrada if entrada["title"] else None


def _lista(valor: object, convertir, tope: int) -> list:
    if not isinstance(valor, list):
        return []
    salida = []
    for elemento in valor[:tope]:
        convertido = convertir(elemento)
        if convertido:
            salida.append(convertido)
    return salida


def _red(valor: object) -> dict | None:
    if not isinstance(valor, dict):
        return None
    network = _texto(valor.get("network"), 40).lower()
    if network not in REDES:
        return None
    url = _url(valor.get("url"), mailto=network == "mail")
    if not url:
        return None
    return {"network": network, "url": url, "label": _texto(valor.get("label"), LARGO_CORTO)}


def perfil_vacio() -> dict:
    return {
        "role": "",
        "tagline": "",
        "photo_url": "",
        "location": "",
        "socials": [],
        "cv": {
            "published": False,
            "headline": "",
            "summary": "",
            "contact_email": "",
            "file_url": "",
            "skills": [],
            "experience": [],
            "education": [],
        },
    }


def normalizar(data: object) -> dict:
    """Lo que entra del panel sale con la forma del contrato o no sale.

    Es el unico lugar donde se decide la forma del perfil: la pagina publica,
    la vista del CV y el panel leen lo mismo y no vuelven a validar.
    """
    perfil = perfil_vacio()
    if not isinstance(data, dict):
        return perfil

    perfil["role"] = _texto(data.get("role"), LARGO_CORTO)
    perfil["tagline"] = _texto(data.get("tagline"), LARGO_MEDIO)
    perfil["location"] = _texto(data.get("location"), LARGO_CORTO)
    perfil["photo_url"] = _url(data.get("photo_url"), relativa=True)
    perfil["socials"] = _lista(data.get("socials"), _red, MAX_REDES)

    cv_entrada = data.get("cv") if isinstance(data.get("cv"), dict) else {}
    cv = perfil["cv"]
    cv["published"] = bool(cv_entrada.get("published"))
    cv["headline"] = _texto(cv_entrada.get("headline"), LARGO_CORTO)
    cv["summary"] = _texto(cv_entrada.get("summary"), LARGO_LARGO)
    cv["contact_email"] = _texto(cv_entrada.get("contact_email"), LARGO_CORTO)
    cv["file_url"] = _url(cv_entrada.get("file_url"), relativa=True)
    cv["skills"] = _lista(
        cv_entrada.get("skills"),
        lambda item: _texto(item, LARGO_CORTO) or None,
        MAX_HABILIDADES,
    )
    cv["experience"] = _lista(cv_entrada.get("experience"), _entrada, MAX_ENTRADAS)
    cv["education"] = _lista(cv_entrada.get("education"), _entrada, MAX_ENTRADAS)
    return perfil


class ProfileService:
    """El perfil de Andrea: un JSON en SiteContent, no una tabla (ADR-017)."""

    def get_profile(self) -> dict:
        fila = db.session.get(SiteContent, CLAVE)
        if not fila:
            return perfil_vacio()
        try:
            guardado = json.loads(fila.content)
        except (ValueError, TypeError):
            # Un JSON roto no puede tirar abajo la pagina de alguien: se muestra
            # el perfil vacio, que es justo lo que la UI sabe dibujar con huecos.
            return perfil_vacio()
        return normalizar(guardado)

    def update_profile(self, data: dict) -> dict:
        perfil = normalizar(data)
        texto = json.dumps(perfil, ensure_ascii=False)
        fila = db.session.get(SiteContent, CLAVE)
        if not fila:
            db.session.add(SiteContent(key=CLAVE, content=texto))
        else:
            fila.content = texto
        db.session.commit()
        return {"status": "updated"}


profile_service = ProfileService()
