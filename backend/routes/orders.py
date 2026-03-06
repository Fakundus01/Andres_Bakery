from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required  # type: ignore

from ..services.order_service import order_service
from .utils import admin_required, json_endpoint


bp = Blueprint("orders", __name__, url_prefix="/api/orders")


@bp.post("")
@jwt_required()
@json_endpoint
def create_order():
    return order_service.create_order(get_jwt_identity(), request.get_json(silent=True) or {}), 201


@bp.get("")
@jwt_required()
@json_endpoint
def list_orders():
    return order_service.list_orders(get_jwt_identity())


@bp.get("/<int:order_id>")
@jwt_required()
@json_endpoint
def get_order(order_id: int):
    return order_service.get_order(get_jwt_identity(), order_id)


@bp.patch("/<int:order_id>/status")
@admin_required
@json_endpoint
def update_order_status(order_id: int):
    return order_service.update_status(order_id, request.get_json(silent=True) or {})
