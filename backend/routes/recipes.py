from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Recipe
from .utils import admin_required


bp = Blueprint("recipes", __name__, url_prefix="/api/recipes")


@bp.get("")
def list_recipes():
    recipes = Recipe.query.order_by(Recipe.created_at.desc()).all()
    return jsonify([_serialize(recipe) for recipe in recipes])


@bp.get("/<int:recipe_id>")
def get_recipe(recipe_id: int):
    recipe = Recipe.query.get_or_404(recipe_id)
    return jsonify(_serialize(recipe))


@bp.post("")
@admin_required
def create_recipe():
    data = request.get_json(silent=True) or {}
    title = data.get("title")
    summary = data.get("summary")
    ingredients = data.get("ingredients")
    steps = data.get("steps")

    if not title or not summary or not ingredients or not steps:
        return jsonify({"error": "title, summary, ingredients and steps are required"}), 400

    recipe = Recipe(
        title=title,
        summary=summary,
        ingredients=ingredients,
        steps=steps,
        image_url=data.get("image_url"),
        category=data.get("category", "general"),
        status=data.get("status", "published"),
    )
    db.session.add(recipe)
    db.session.commit()

    return jsonify({"id": recipe.id}), 201


@bp.put("/<int:recipe_id>")
@admin_required
def update_recipe(recipe_id: int):
    recipe = Recipe.query.get_or_404(recipe_id)
    data = request.get_json(silent=True) or {}

    for field in [
        "title",
        "summary",
        "ingredients",
        "steps",
        "image_url",
        "category",
        "status",
    ]:
        if field in data:
            setattr(recipe, field, data[field])

    db.session.commit()
    return jsonify({"status": "updated"})


@bp.delete("/<int:recipe_id>")
@admin_required
def delete_recipe(recipe_id: int):
    recipe = Recipe.query.get_or_404(recipe_id)
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({"status": "deleted"})


def _serialize(recipe: Recipe) -> dict:
    return {
        "id": recipe.id,
        "title": recipe.title,
        "summary": recipe.summary,
        "ingredients": recipe.ingredients,
        "steps": recipe.steps,
        "image_url": recipe.image_url,
        "category": recipe.category,
        "status": recipe.status,
        "created_at": recipe.created_at.isoformat(),
    }