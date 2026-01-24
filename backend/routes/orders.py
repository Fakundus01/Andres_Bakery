from decimal import Decimal

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required  #type: ignore

from ..extensions import db
from ..models import Order, OrderItem, Product, User
from .utils import admin_required


bp = Blueprint("orders", __name__, url_prefix="/api/orders")


@bp.post("")
@jwt_required()
def create_order():
    data = request.get_json(silent=True) or {}
    items = data.get("items", [])

    if not items:
        return jsonify({"error": "items are required"}), 400

    user_id = get_jwt_identity()
    order = Order(user_id=user_id, status="pending")
    db.session.add(order)

    total = Decimal("0.00")
    for item in items:
        product_id = item.get("product_id")
        quantity = int(item.get("quantity", 0))
        if not product_id or quantity <= 0:
            return jsonify({"error": "invalid item data"}), 400

        product = Product.query.get(product_id)
        if not product or not product.available:
            return jsonify({"error": f"product {product_id} not available"}), 400

        unit_price = Decimal(str(product.price))
        total += unit_price * quantity
        order_item = OrderItem(
            order=order,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
        )
        db.session.add(order_item)

    order.total_amount = total
    db.session.commit()

    return jsonify({"order_id": order.id, "total": float(order.total_amount)}), 201


@bp.get("")
@jwt_required()
def list_orders():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    if user.is_admin:
        orders = Order.query.order_by(Order.created_at.desc()).all()
    else:
        orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()

    return jsonify([_serialize_order(order) for order in orders])


@bp.get("/<int:order_id>")
@jwt_required()
def get_order(order_id: int):
    user_id = get_jwt_identity()
    order = Order.query.get_or_404(order_id)
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "user not found"}), 404
    if not user.is_admin and order.user_id != user_id:
        return jsonify({"error": "not authorized"}), 403

    return jsonify(_serialize_order(order))


@bp.patch("/<int:order_id>/status")
@admin_required
def update_order_status(order_id: int):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if not status:
        return jsonify({"error": "status is required"}), 400

    order = Order.query.get_or_404(order_id)
    order.status = status
    db.session.commit()
    return jsonify({"status": "updated"})


def _serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "status": order.status,
        "total_amount": float(order.total_amount),
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "product_name": item.product.name,
            }
            for item in order.items
        ],
    }
