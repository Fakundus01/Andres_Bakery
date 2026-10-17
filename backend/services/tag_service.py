"""Las etiquetas de la carta. Las crea Andrea, no vienen fijas (ADR-006).

Importante: "sin TACC" es **su declaracion bajo su responsabilidad**. El
software la muestra y la deja filtrar; no la certifica ni la valida.
"""

from __future__ import annotations

from ..extensions import db
from ..models import Tag
from .base import ServiceBase
from .exceptions import ValidationError
from .serializers import Serializer
from .slug import unique_slug

# Nombres de tokens de color que existen en el front (theme/tokens.css). Si
# llega otro, se guarda "acento": antes un color feo que una clase inventada.
COLOR_TOKENS = ("acento", "acento-2", "exito", "alerta", "error", "tinta")


class TagService(ServiceBase):
    def list(self) -> list[dict]:
        tags = Tag.query.order_by(Tag.sort_order.asc(), Tag.name.asc()).all()
        return [Serializer.tag(tag) for tag in tags]

    def create(self, data: dict) -> dict:
        name = (data.get("name") or "").strip()
        if not name:
            raise ValidationError("name is required")
        if Tag.query.filter_by(name=name).first():
            raise ValidationError("tag already exists")

        tag = Tag(
            name=name,
            slug=unique_slug(Tag, data.get("slug") or name, fallback="etiqueta"),
            color_token=self._color_token(data.get("color_token")),
            sort_order=self.parse_int(data.get("sort_order", 0), "sort_order"),
        )
        db.session.add(tag)
        db.session.commit()
        return {"id": tag.id, "slug": tag.slug}

    def update(self, tag_id: int, data: dict) -> dict:
        tag = self.require_entity(Tag, tag_id, "tag")

        if "name" in data:
            name = (data.get("name") or "").strip()
            if not name:
                raise ValidationError("name is required")
            existing = Tag.query.filter_by(name=name).first()
            if existing and existing.id != tag.id:
                raise ValidationError("tag already exists")
            tag.name = name

        # El slug es la URL del filtro: solo se mueve si lo piden explicito.
        if data.get("slug"):
            tag.slug = unique_slug(Tag, data["slug"], keep_id=tag.id, fallback="etiqueta")
        if "color_token" in data:
            tag.color_token = self._color_token(data.get("color_token"))
        if "sort_order" in data:
            tag.sort_order = self.parse_int(data.get("sort_order"), "sort_order")

        db.session.commit()
        return {"status": "updated"}

    def delete(self, tag_id: int) -> dict:
        tag = self.require_entity(Tag, tag_id, "tag")
        # El m2m se limpia solo; los productos siguen existiendo sin la etiqueta.
        tag.products = []
        db.session.delete(tag)
        db.session.commit()
        return {"status": "deleted"}

    @staticmethod
    def _color_token(value: object) -> str:
        token = str(value or "").strip()
        return token if token in COLOR_TOKENS else "acento"


tag_service = TagService()
