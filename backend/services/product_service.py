"""La carta. `Product` absorbio la receta: ya no hay entidad `Recipe` (ADR-001)."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from ..extensions import db
from ..models import Ingredient, OptionGroup, Product, ProductVariant, Tag
from .base import ServiceBase
from .exceptions import NotFoundError, ValidationError
from .serializers import Serializer
from .slug import unique_slug
from . import saneado


# Mas tamanos que esto no se eligen en un celular, y el front ya lo frena:
# aca esta para que no se lo pueda esquivar por API (F19b).
MAX_VARIANTES = 12
TOPE_NOMBRE_VARIANTE = 120

# El `String(120)` de `Product.name`, hecho cumplir donde se puede medir.
TOPE_NOMBRE_PRODUCTO = 120


class ProductService(ServiceBase):
    TEXT_FIELDS = ("description", "steps", "prep_note", "image_url")
    FLAG_FIELDS = ("available", "allows_pickup", "allows_delivery")

    def list(self, *, tag: str | None = None, only_available: bool = False) -> list[dict]:
        query = Product.query
        if tag:
            query = query.filter(Product.tags.any(Tag.slug == tag))
        if only_available:
            query = query.filter(Product.available.is_(True))
        products = query.order_by(Product.id.desc()).all()
        return [Serializer.product(product) for product in products]

    def get(self, product_id: int) -> dict:
        return Serializer.product(self.require_entity(Product, product_id, "product"))

    def get_by_slug(self, slug: str) -> dict:
        product = Product.query.filter_by(slug=slug).first()
        if not product:
            raise NotFoundError("product not found")
        return Serializer.product(product)

    def create(self, data: dict) -> dict:
        name = self._nombre_de_producto(data.get("name"))
        price = data.get("price")
        if not name or price is None:
            raise ValidationError("name and price are required")

        product = Product(
            name=name,
            slug=unique_slug(Product, data.get("slug") or name),
            price=self._precio_base(price),
            category=self._category(data.get("category")),
            unit_label=self._unit_label(data.get("unit_label")),
            min_qty=self._at_least_one(data.get("min_qty"), "min_qty"),
            qty_step=self._at_least_one(data.get("qty_step"), "qty_step"),
        )
        for field in self.TEXT_FIELDS:
            setattr(product, field, self._text(data.get(field)))
        for field in self.FLAG_FIELDS:
            setattr(product, field, bool(data.get(field, True)))

        self._apply_relations(product, data)
        db.session.add(product)
        db.session.commit()
        return {"id": product.id, "slug": product.slug}

    def update(self, product_id: int, data: dict) -> dict:
        product = self.require_entity(Product, product_id, "product")

        if "name" in data:
            name = self._nombre_de_producto(data.get("name"))
            if not name:
                raise ValidationError("name is required")
            product.name = name

        # El slug es la URL de la ficha: corregir el nombre no se la lleva
        # puesta. Solo cambia si lo piden explicito.
        if data.get("slug"):
            product.slug = unique_slug(Product, data["slug"], keep_id=product.id)

        for field in self.TEXT_FIELDS:
            if field in data:
                setattr(product, field, self._text(data[field]))
        for field in self.FLAG_FIELDS:
            if field in data:
                setattr(product, field, bool(data[field]))

        if "category" in data:
            product.category = self._category(data.get("category"))
        if "unit_label" in data:
            product.unit_label = self._unit_label(data.get("unit_label"))
        if "min_qty" in data:
            product.min_qty = self._at_least_one(data.get("min_qty"), "min_qty")
        if "qty_step" in data:
            product.qty_step = self._at_least_one(data.get("qty_step"), "qty_step")
        if "price" in data:
            product.price = self._precio_base(data.get("price"))

        self._apply_relations(product, data)
        db.session.commit()
        return {"status": "updated"}

    def delete(self, product_id: int) -> dict:
        product = self.require_entity(Product, product_id, "product")
        db.session.delete(product)
        db.session.commit()
        return {"status": "deleted"}

    def _apply_relations(self, product: Product, data: dict) -> None:
        if "ingredient_ids" in data:
            product.ingredients = self._resolve(Ingredient, data.get("ingredient_ids"), "ingredient")
        if "tag_ids" in data:
            product.tags = self._resolve(Tag, data.get("tag_ids"), "tag")
        if "option_group_ids" in data:
            # Que grupos de sabores aplican a ESTA torta (F57). Es la mitad de
            # la frontera de ADR-031: el cliente solo puede elegir de estos.
            product.option_groups = self._resolve(
                OptionGroup, data.get("option_group_ids"), "option_group"
            )
        if "variants" in data:
            product.variants = self._build_variants(product, data.get("variants"))

    def _resolve(self, model: type[Any], raw_ids: Any, label: str) -> list[Any]:
        if not isinstance(raw_ids, list):
            raise ValidationError(f"{label}_ids must be a list")
        if not raw_ids:
            return []

        ids = [self.parse_int(raw_id, f"{label}_id") for raw_id in raw_ids]
        rows = model.query.filter(model.id.in_(ids)).all()
        if len({row.id for row in rows}) != len(set(ids)):
            raise ValidationError(f"one or more {label}s do not exist")
        return rows

    def _build_variants(self, product: Product, raw_variants: Any) -> list[ProductVariant]:
        """Actualiza las filas que ya estaban en vez de reemplazarlas.

        Es la tercera parte de ADR-029, y estuvo escrita como hecha sin estar
        (lo marcaron las dos revisiones de T18). Reemplazar la lista entera
        sobre una relacion con `delete-orphan` borra las filas viejas y las
        nuevas sacan ids nuevos: el `variant_id` que alguien tiene en su
        carrito de `localStorage` queda invalido y el 400 le cae en el
        checkout, con el mismo mensaje que recibe un atacante.

        Peor todavia, y es lo que encontro el pentester: SQLite reusa los
        rowid, asi que un id viejo puede caer sobre **otra** variante del
        mismo producto y cobrar un tamano por otro. Mientras los ids no se
        muevan, eso no puede pasar.

        El `id` que manda el cliente se acepta solo si esa variante es de
        **este** producto: es el mismo control que `_variante` hace en el
        pedido (ADR-029).
        """
        if not isinstance(raw_variants, list):
            raise ValidationError("variants must be a list")
        if len(raw_variants) > MAX_VARIANTES:
            raise ValidationError(f"Un producto admite hasta {MAX_VARIANTES} tamaños.")

        existentes = {variant.id: variant for variant in product.variants}
        variants: list[ProductVariant] = []
        vistos: set[str] = set()
        reusados: set[int] = set()
        for position, raw in enumerate(raw_variants):
            if not isinstance(raw, dict):
                raise ValidationError("invalid variant data")
            if raw.get("price") is None:
                raise ValidationError("each variant needs name and price")

            name = self._nombre_de_variante(raw.get("name"))
            price = self._precio_de_variante(raw.get("price"), name)
            sort_order = self.parse_int(raw.get("sort_order", position), "sort_order")

            # El nombre es lo que el pedido guarda (ADR-029) y lo que el
            # cliente elige: dos tamanos que se llaman igual son dos filas
            # indistinguibles en la ficha. La comparacion es normalizada, como
            # en los ingredientes y los grupos (ADR-030).
            normalizado = saneado.normalizar_nombre(name, "nombre", tope=TOPE_NOMBRE_VARIANTE)
            if normalizado in vistos:
                raise ValidationError(f"Hay dos tamaños que se llaman «{name}».")
            vistos.add(normalizado)

            variante = self._variante_a_reusar(existentes, raw.get("id"))
            if variante is not None:
                # El mismo id dos veces en la lista era la unica ruta donde
                # los ids se movian: la segunda vuelta reusaba la fila que ya
                # estaba en `variants` y la primera quedaba huerfana.
                if variante.id in reusados:
                    raise ValidationError("Un tamaño no puede venir dos veces en la lista.")
                reusados.add(variante.id)
            if variante is None:
                variante = ProductVariant(name=name, price=price, sort_order=sort_order)
            else:
                variante.name = name
                variante.price = price
                variante.sort_order = sort_order
            variants.append(variante)

        # Lo que no vino en la lista se borra, que es lo que la pantalla
        # espera al sacar un tamano: el `delete-orphan` se encarga.
        return variants

    @staticmethod
    def _nombre_de_producto(valor: Any) -> str:
        """Con tope, como el tamano, y por el mismo motivo.

        SQLite no hace cumplir el `String(120)` del modelo, asi que el nombre
        del producto entraba con el largo que quisiera: `update` solo
        rechazaba el vacio. Lo encontro el review de T23 desde la pantalla —el
        nombre sale por el `GET` publico y el front lo pone en el aviso del
        carrito—, y es el mismo agujero que `_nombre_de_variante` ya habia
        cerrado para los tamanos.

        Devuelve "" cuando no quedo nada, para que `create` y `update` sigan
        diciendo cada uno su mensaje.
        """
        return saneado.nombre_para_guardar(valor, "nombre", tope=TOPE_NOMBRE_PRODUCTO)

    @staticmethod
    def _nombre_de_variante(valor: Any) -> str:
        """Con tope, como el ingrediente (ADR-030).

        SQLite no hace cumplir el `String(120)` del modelo: entraron 4 MB en
        un `name` que el `GET` publico devuelve (review de T4-F19b).
        """
        name = saneado.nombre_para_guardar(valor, "tamaño", tope=TOPE_NOMBRE_VARIANTE)
        if not name:
            raise ValidationError("each variant needs name and price")
        return name

    def _precio_de_variante(self, valor: Any, name: str) -> Decimal:
        """Mayor que cero, y de verdad.

        El panel avisaba "el precio tiene que ser mayor que cero" y el back
        aceptaba cero y negativos: un pedido con una variante de -9999 salia
        con **total negativo** (hallazgo del review de T4-F19b). Y `0.004`
        pasaba el filtro del front —que muestra "$ 0"— y se guardaba en 0.00.
        """
        price = self.parse_decimal(valor, "variant price")
        if price.quantize(Decimal("0.01")) <= 0:
            raise ValidationError(f"El tamaño «{name}» necesita un precio mayor que cero.")
        return price

    def _variante_a_reusar(
        self, existentes: dict[int, ProductVariant], crudo: Any
    ) -> ProductVariant | None:
        if crudo is None:
            return None
        variant_id = self.parse_int(crudo, "variant_id")
        variante = existentes.get(variant_id)
        if variante is None:
            # Un id que no es de este producto no se reusa **ni se inventa**:
            # es un error del que llama, no un tamano nuevo en silencio.
            raise ValidationError("one or more variants do not belong to this product")
        return variante

    def _precio_base(self, valor: Any) -> Decimal:
        """Cero sigue valiendo: es la carta a medio cargar, y el panel los
        cuenta como "sin precio". Un negativo no: eso no es un estado, es un
        error de tipeo que se cobraria."""
        price = self.parse_decimal(valor, "price")
        if price < 0:
            raise ValidationError("El precio no puede ser negativo.")
        return price

    @staticmethod
    def _text(value: Any) -> str | None:
        text = str(value or "").strip()
        return text or None

    @staticmethod
    def _category(value: Any) -> str:
        return (str(value or "").strip() or "general")

    @staticmethod
    def _unit_label(value: Any) -> str:
        return (str(value or "").strip() or "unidad")

    def _at_least_one(self, value: Any, field_name: str) -> int:
        number = self.parse_int(value if value is not None else 1, field_name)
        if number < 1:
            raise ValidationError(f"{field_name} must be 1 or more")
        return number


product_service = ProductService()
