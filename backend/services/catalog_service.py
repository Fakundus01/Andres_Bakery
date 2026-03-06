from __future__ import annotations

from ..extensions import db
from ..models import Ingredient, Product, Recipe
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


class ProductService(ServiceBase):
    def list(self) -> list[dict]:
        products = Product.query.order_by(Product.id.desc()).all()
        return [Serializer.product(product) for product in products]

    def get(self, product_id: int) -> dict:
        product = self.require_entity(Product, product_id, "product")
        return Serializer.product(product)

    def create(self, data: dict) -> dict:
        name = (data.get("name") or "").strip()
        price = data.get("price")
        if not name or price is None:
            raise ValidationError("name and price are required")

        product = Product(
            name=name,
            description=data.get("description"),
            price=self.parse_decimal(price, "price"),
            category=(data.get("category") or "general").strip() or "general",
            image_url=data.get("image_url"),
            available=bool(data.get("available", True)),
        )
        if "ingredient_ids" in data:
            product.ingredients = self._resolve_ingredients(data.get("ingredient_ids") or [])

        db.session.add(product)
        db.session.commit()
        return {"id": product.id}

    def update(self, product_id: int, data: dict) -> dict:
        product = self.require_entity(Product, product_id, "product")

        if "name" in data:
            name = (data.get("name") or "").strip()
            if not name:
                raise ValidationError("name is required")
            product.name = name

        for field in ["description", "image_url"]:
            if field in data:
                setattr(product, field, data[field])

        if "category" in data:
            product.category = (data.get("category") or "general").strip() or "general"
        if "price" in data:
            product.price = self.parse_decimal(data.get("price"), "price")
        if "available" in data:
            product.available = bool(data.get("available"))
        if "ingredient_ids" in data:
            product.ingredients = self._resolve_ingredients(data.get("ingredient_ids") or [])

        db.session.commit()
        return {"status": "updated"}

    def delete(self, product_id: int) -> dict:
        product = self.require_entity(Product, product_id, "product")
        db.session.delete(product)
        db.session.commit()
        return {"status": "deleted"}

    def _resolve_ingredients(self, ingredient_ids: list[int]) -> list[Ingredient]:
        if not isinstance(ingredient_ids, list):
            raise ValidationError("ingredient_ids must be a list")
        if not ingredient_ids:
            return []

        ids = [self.parse_int(ingredient_id, "ingredient_id") for ingredient_id in ingredient_ids]
        ingredients = Ingredient.query.filter(Ingredient.id.in_(ids)).all()
        if len({ingredient.id for ingredient in ingredients}) != len(set(ids)):
            raise ValidationError("one or more ingredients do not exist")
        return ingredients


class RecipeService(ServiceBase):
    def list(self) -> list[dict]:
        recipes = Recipe.query.order_by(Recipe.created_at.desc()).all()
        return [Serializer.recipe(recipe) for recipe in recipes]

    def get(self, recipe_id: int) -> dict:
        recipe = self.require_entity(Recipe, recipe_id, "recipe")
        return Serializer.recipe(recipe)

    def create(self, data: dict) -> dict:
        title = (data.get("title") or "").strip()
        summary = (data.get("summary") or "").strip()
        ingredients = (data.get("ingredients") or "").strip()
        steps = (data.get("steps") or "").strip()

        if not title or not summary or not ingredients or not steps:
            raise ValidationError("title, summary, ingredients and steps are required")

        recipe = Recipe(
            title=title,
            summary=summary,
            ingredients=ingredients,
            steps=steps,
            image_url=data.get("image_url"),
            category=(data.get("category") or "general").strip() or "general",
            status=(data.get("status") or "published").strip() or "published",
        )
        db.session.add(recipe)
        db.session.commit()
        return {"id": recipe.id}

    def update(self, recipe_id: int, data: dict) -> dict:
        recipe = self.require_entity(Recipe, recipe_id, "recipe")

        for field in ["title", "summary", "ingredients", "steps", "image_url", "category", "status"]:
            if field not in data:
                continue
            value = data[field]
            if field in {"title", "summary", "ingredients", "steps"}:
                value = (value or "").strip()
                if not value:
                    raise ValidationError(f"{field} is required")
            if field in {"category", "status"}:
                value = (value or "").strip() or getattr(recipe, field)
            setattr(recipe, field, value)

        db.session.commit()
        return {"status": "updated"}

    def delete(self, recipe_id: int) -> dict:
        recipe = self.require_entity(Recipe, recipe_id, "recipe")
        db.session.delete(recipe)
        db.session.commit()
        return {"status": "deleted"}


ingredient_service = IngredientService()
product_service = ProductService()
recipe_service = RecipeService()
