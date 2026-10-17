"""Slugs para las URLs de la carta (`/api/products/<slug>`, F25).

Vive aparte de los servicios porque lo usan `Product` y `Tag`, y porque la
misma logica esta duplicada a mano dentro de la migracion de T3: una migracion
no puede importar codigo que despues cambia.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from ..extensions import db


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text or ""))
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    lowered = re.sub(r"[^a-z0-9]+", "-", without_accents.lower())
    return lowered.strip("-")


def unique_slug(model: type[Any], text: str, *, keep_id: int | None = None, fallback: str = "producto") -> str:
    base = slugify(text) or fallback
    candidate = base
    attempt = 1
    while True:
        query = model.query.filter_by(slug=candidate)
        if keep_id is not None:
            query = query.filter(model.id != keep_id)
        if not db.session.query(query.exists()).scalar():
            return candidate
        attempt += 1
        candidate = f"{base}-{attempt}"
