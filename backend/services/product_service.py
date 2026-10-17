"""La carta. `Product` absorbio la receta: ya no hay entidad `Recipe` (ADR-001)."""

from __future__ import annotations

from typing import Any

from ..extensions import db
from ..models import Ingredient, Product, ProductVariant, Tag
from .base import ServiceBase
from .exceptions import NotFoundError, ValidationError
from .serializers import Serializer
from .slug import unique_slug


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
        name = (data.get("name") or "").strip()
        price = data.get("price")
        if not name or price is None:
            raise ValidationError("name and price are required")

        product = Product(
            name=name,
            slug=unique_slug(Product, data.get("slug") or name),
            price=self.parse_decimal(price, "price"),
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
            name = (data.get("name") or "").strip()
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
            product.price = self.parse_decimal(data.get("price"), "price")

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
        if "variants" in data:
            product.variants = self._build_variants(data.get("variants"))

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

    def _build_variants(self, raw_variants: Any) -> list[ProductVariant]:
        if not isinstance(raw_variants, list):
            raise ValidationError("variants must be a list")

        variants = []
        for position, raw in enumerate(raw_variants):
            if not isinstance(raw, dict):
                raise ValidationError("invalid variant data")
            name = (raw.get("name") or "").strip()
            if not name or raw.get("price") is None:
                raise ValidationError("each variant needs name and price")
            variants.append(
                ProductVariant(
                    name=name,
                    price=self.parse_decimal(raw.get("price"), "variant price"),
                    sort_order=self.parse_int(raw.get("sort_order", position), "sort_order"),
                )
            )
        return variants

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
