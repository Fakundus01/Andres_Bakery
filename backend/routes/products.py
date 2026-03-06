from flask import Blueprint, request

from ..services.catalog_service import product_service
from .utils import admin_required, json_endpoint


bp = Blueprint("products", __name__, url_prefix="/api/products")


@bp.get("")
@json_endpoint
def list_products():
    return product_service.list()


@bp.post("")
@admin_required
@json_endpoint
def create_product():
    return product_service.create(request.get_json(silent=True) or {}), 201


@bp.get("/<int:product_id>")
@json_endpoint
def get_product(product_id: int):
    return product_service.get(product_id)


@bp.put("/<int:product_id>")
@admin_required
@json_endpoint
def update_product(product_id: int):
    return product_service.update(product_id, request.get_json(silent=True) or {})


@bp.delete("/<int:product_id>")
@admin_required
@json_endpoint
def delete_product(product_id: int):
    return product_service.delete(product_id)
