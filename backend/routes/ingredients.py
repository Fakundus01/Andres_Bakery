from flask import Blueprint, request

from ..services.catalog_service import ingredient_service
from .utils import admin_required, json_endpoint


bp = Blueprint("ingredients", __name__, url_prefix="/api/ingredients")


@bp.get("")
@json_endpoint
def list_ingredients():
    return ingredient_service.list()


@bp.post("")
@admin_required
@json_endpoint
def create_ingredient():
    return ingredient_service.create(request.get_json(silent=True) or {}), 201


@bp.put("/<int:ingredient_id>")
@admin_required
@json_endpoint
def update_ingredient(ingredient_id: int):
    return ingredient_service.update(ingredient_id, request.get_json(silent=True) or {})


@bp.delete("/<int:ingredient_id>")
@admin_required
@json_endpoint
def delete_ingredient(ingredient_id: int):
    return ingredient_service.delete(ingredient_id)
