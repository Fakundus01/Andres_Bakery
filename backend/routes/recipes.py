from flask import Blueprint, request

from ..services.catalog_service import recipe_service
from .utils import admin_required, json_endpoint


bp = Blueprint("recipes", __name__, url_prefix="/api/recipes")


@bp.get("")
@json_endpoint
def list_recipes():
    return recipe_service.list()


@bp.get("/<int:recipe_id>")
@json_endpoint
def get_recipe(recipe_id: int):
    return recipe_service.get(recipe_id)


@bp.post("")
@admin_required
@json_endpoint
def create_recipe():
    return recipe_service.create(request.get_json(silent=True) or {}), 201


@bp.put("/<int:recipe_id>")
@admin_required
@json_endpoint
def update_recipe(recipe_id: int):
    return recipe_service.update(recipe_id, request.get_json(silent=True) or {})


@bp.delete("/<int:recipe_id>")
@admin_required
@json_endpoint
def delete_recipe(recipe_id: int):
    return recipe_service.delete(recipe_id)
