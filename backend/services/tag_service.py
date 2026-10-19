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
from . import saneado

# Nombres de tokens de color que existen en el front (theme/tokens.css). Si
# llega otro, se guarda "acento": antes un color feo que una clase inventada.
COLOR_TOKENS = ("acento", "acento-2", "exito", "alerta", "error", "tinta")

TOPE_NOMBRE = 60

# La etiqueta que habilita la personalizacion de una torta (ADR-033). El front
# la necesita para saber que ofrecer, y preguntarla aca es lo que evita tener
# el string escrito en los dos lados (D27).
TAG_PERSONALIZABLE = "tortas-personalizadas"


class TagService(ServiceBase):
    def list(self) -> list[dict]:
        tags = Tag.query.order_by(Tag.sort_order.asc(), Tag.name.asc()).all()
        return [Serializer.tag(tag) for tag in tags]

    def create(self, data: dict) -> dict:
        name = self._nombre(data.get("name"))
        repetida = self._buscar_por_nombre(name)
        if repetida:
            # Normalizada y no exacta (D28): "Tortas Personalizadas" sobre
            # "tortas personalizadas" entraba como una segunda etiqueta que se
            # ve igual en la lista, y **solo una habilita** la personalizacion,
            # porque lo que manda es el slug y `unique_slug` desempata con
            # sufijo. El sintoma era el peor posible: "le puse la etiqueta y no
            # pasa nada", sin un error en ningun log. Lo marco el reviewer de
            # T4-F19b; es el mismo agujero que ADR-030 cerro para los
            # ingredientes y F57 heredo para los grupos.
            raise ValidationError(f"Ya existe una etiqueta que se llama «{repetida.name}».")

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
            name = self._nombre(data.get("name"))
            repetida = self._buscar_por_nombre(name)
            # Excluir la propia fila es lo que permite corregir un tipeo:
            # renombrar "sin tacc" a "sin TACC" choca consigo mismo si no.
            if repetida and repetida.id != tag.id:
                raise ValidationError(f"Ya existe una etiqueta que se llama «{repetida.name}».")
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
    def _nombre(valor: object) -> str:
        nombre = saneado.nombre_para_guardar(valor, "nombre", tope=TOPE_NOMBRE)
        if not nombre:
            raise ValidationError("La etiqueta necesita un nombre.")
        return nombre

    @staticmethod
    def _buscar_por_nombre(name: str) -> Tag | None:
        """Sin indice: son diez etiquetas y no hay columna normalizada.

        Las dos cosas van juntas y es a proposito: agregar la columna pide una
        migracion, y con esta cantidad de filas el barrido en Python no se
        nota. Si algun dia son cientos, se hace lo de los ingredientes
        (ADR-030: columna normalizada con indice unico), que ademas sostiene la
        unicidad bajo concurrencia, cosa que esto no hace.
        """
        buscado = saneado.normalizar_nombre(name, "nombre", tope=TOPE_NOMBRE)
        if not buscado:
            return None
        for etiqueta in Tag.query.all():
            if saneado.normalizar_nombre(etiqueta.name, "nombre", tope=TOPE_NOMBRE) == buscado:
                return etiqueta
        return None

    @staticmethod
    def _color_token(value: object) -> str:
        token = str(value or "").strip()
        return token if token in COLOR_TOKENS else "acento"


tag_service = TagService()
