from decimal import Decimal
import unicodedata

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required  #type: ignore

from ..extensions import db
from ..models import Order, OrderDelivery, OrderItem, Product, User
from ..services.notifications import send_order_created_notifications
from .utils import admin_required


bp = Blueprint("orders", __name__, url_prefix="/api/orders")


@bp.post("")
@jwt_required()
def create_order():
    data = request.get_json(silent=True) or {}
    items = data.get("items", [])
    customer = data.get("customer", {})
    delivery = data.get("delivery", {})
    payment_method = data.get("payment_method", "mercado_pago")

    if not items:
        return jsonify({"error": "items are required"}), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    delivery_method = delivery.get("method", "delivery")
    shipping_amount = _resolve_shipping_amount(delivery_method, delivery)
    validation_error = _validate_delivery(delivery_method, delivery)
    if validation_error:
        return jsonify({"error": validation_error}), 400

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

    order.total_amount = total + shipping_amount
    order.delivery = OrderDelivery(
        customer_name=customer.get("name") or user.name,
        customer_email=customer.get("email") or user.email,
        customer_phone=customer.get("phone"),
        delivery_method=delivery_method,
        address=delivery.get("address"),
        neighborhood=delivery.get("neighborhood") or current_app.config["DELIVERY_ZONE_NAME"],
        city=delivery.get("city") or "General San Martin",
        shipping_amount=shipping_amount,
        notes=delivery.get("notes"),
        payment_method=payment_method,
    )
    db.session.commit()
    email_status = send_order_created_notifications(order)

    return jsonify(
        {
            "order_id": order.id,
            "total": float(order.total_amount),
            "emails": email_status,
        }
    ), 201


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
        "user": {
            "id": order.user.id,
            "name": order.user.name,
            "email": order.user.email,
        },
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
        "delivery": _serialize_delivery(order.delivery),
        "payments": [
            {
                "id": payment.id,
                "provider": payment.provider,
                "provider_payment_id": payment.provider_payment_id,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
                "created_at": payment.created_at.isoformat(),
            }
            for payment in order.payments
        ],
    }


def _serialize_delivery(delivery: OrderDelivery | None) -> dict | None:
    if not delivery:
        return None
    return {
        "customer_name": delivery.customer_name,
        "customer_email": delivery.customer_email,
        "customer_phone": delivery.customer_phone,
        "delivery_method": delivery.delivery_method,
        "address": delivery.address,
        "neighborhood": delivery.neighborhood,
        "city": delivery.city,
        "shipping_amount": float(delivery.shipping_amount),
        "notes": delivery.notes,
        "payment_method": delivery.payment_method,
    }


def _resolve_shipping_amount(delivery_method: str, delivery: dict) -> Decimal:
    if delivery_method != "delivery":
        return Decimal("0.00")
    configured_fee = Decimal(str(current_app.config.get("DELIVERY_FEE", "0")))
    requested_fee = delivery.get("shipping_amount")
    if requested_fee is None:
        return configured_fee
    try:
        return Decimal(str(requested_fee))
    except Exception:
        return configured_fee


def _validate_delivery(delivery_method: str, delivery: dict) -> str | None:
    if delivery_method != "delivery":
        return None

    address = (delivery.get("address") or "").strip()
    neighborhood = (delivery.get("neighborhood") or "").strip()
    if not address:
        return "address is required for delivery"
    if not neighborhood:
        return "neighborhood is required for delivery"
    if not _matches_delivery_zone(neighborhood):
        return f"deliveries are only available in {current_app.config['DELIVERY_ZONE_NAME']}"
    return None


def _matches_delivery_zone(neighborhood: str) -> bool:
    normalized_zone = _normalize_text(current_app.config["DELIVERY_ZONE_NAME"])
    normalized_value = _normalize_text(neighborhood)
    return normalized_zone in normalized_value or normalized_value in normalized_zone


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char)).lower()
