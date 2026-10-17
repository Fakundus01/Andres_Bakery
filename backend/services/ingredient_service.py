from __future__ import annotations

from ..extensions import db
from ..models import Ingredient
from .base import ServiceBase
from .exceptions import ValidationError
from .serializers import Serializer


class IngredientService(ServiceBase):
    def list(self) -> list[dict]:
        ingredients = Ingredient.query.order_by(Ingredient.name.asc()).all()
        return [Serializer.ingredient(ingredient) for ingredient in ingredients]

    def create(self, data: dict) -> dict:
        name = (data.get("name") or "").strip()
        if not name:
            raise ValidationError("name is required")
        if Ingredient.query.filter_by(name=name).first():
            raise ValidationError("ingredient already exists")

        ingredient = Ingredient(name=name, unit=data.get("unit"))
        db.session.add(ingredient)
        db.session.commit()
        return {"id": ingredient.id}

    def update(self, ingredient_id: int, data: dict) -> dict:
        ingredient = self.require_entity(Ingredient, ingredient_id, "ingredient")

        if "name" in data:
            name = (data.get("name") or "").strip()
            if not name:
                raise ValidationError("name is required")
            existing = Ingredient.query.filter_by(name=name).first()
            if existing and existing.id != ingredient.id:
                raise ValidationError("ingredient already exists")
            ingredient.name = name

        if "unit" in data:
            ingredient.unit = data.get("unit")

        db.session.commit()
        return {"status": "updated"}

    def delete(self, ingredient_id: int) -> dict:
        ingredient = self.require_entity(Ingredient, ingredient_id, "ingredient")
        db.session.delete(ingredient)
        db.session.commit()
        return {"status": "deleted"}


ingredient_service = IngredientService()
