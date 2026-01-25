from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Ingredient
from .utils import admin_required


bp = Blueprint("ingredients", __name__, url_prefix="/api/ingredients")


@bp.get("")
def list_ingredients():
    ingredients = Ingredient.query.order_by(Ingredient.name.asc()).all()
    return jsonify([_serialize_ingredient(ingredient) for ingredient in ingredients])


@bp.post("")
@admin_required
def create_ingredient():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    if not name:
        return jsonify({"error": "name is required"}), 400

    ingredient = Ingredient(
        name=name.strip(),
        unit=data.get("unit"),
    )
    db.session.add(ingredient)
    db.session.commit()
    return jsonify({"id": ingredient.id}), 201


@bp.put("/<int:ingredient_id>")
@admin_required
def update_ingredient(ingredient_id: int):
    ingredient = Ingredient.query.get_or_404(ingredient_id)
    data = request.get_json(silent=True) or {}

    if "name" in data and data["name"]:
        ingredient.name = data["name"].strip()
    if "unit" in data:
        ingredient.unit = data["unit"]

    db.session.commit()
    return jsonify({"status": "updated"})


@bp.delete("/<int:ingredient_id>")
@admin_required
def delete_ingredient(ingredient_id: int):
    ingredient = Ingredient.query.get_or_404(ingredient_id)
    db.session.delete(ingredient)
    db.session.commit()
    return jsonify({"status": "deleted"})


def _serialize_ingredient(ingredient: Ingredient) -> dict:
    return {
        "id": ingredient.id,
        "name": ingredient.name,
        "unit": ingredient.unit,
    }
