from decimal import Decimal

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required  #type: ignore

from ..extensions import db
from ..models import Order, Payment
import stripe  #type: ignore


bp = Blueprint("payments", __name__, url_prefix="/api/payments")


@bp.post("/intent")
@jwt_required()
def create_payment_intent():
    data = request.get_json(silent=True) or {}
    order_id = data.get("order_id")

    if not order_id:
        return jsonify({"error": "order_id is required"}), 400

    order = Order.query.get_or_404(order_id)
    user_id = get_jwt_identity()
    if order.user_id != user_id:
        return jsonify({"error": "not authorized"}), 403

    secret_key = current_app.config.get("STRIPE_SECRET_KEY")
    if not secret_key:
        return jsonify({"error": "stripe not configured"}), 503

    stripe.api_key = secret_key
    amount_cents = int(Decimal(order.total_amount) * 100)

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=current_app.config.get("STRIPE_CURRENCY", "usd"),
        metadata={"order_id": order.id, "user_id": order.user_id},
    )

    payment = Payment(
        order_id=order.id,
        provider="stripe",
        provider_payment_id=intent.id,
        amount=order.total_amount,
        currency=current_app.config.get("STRIPE_CURRENCY", "usd"),
        status=intent.status,
    )
    db.session.add(payment)
    db.session.commit()

    return jsonify(
        {
            "client_secret": intent.client_secret,
            "payment_id": payment.id,
            "status": intent.status,
        }
    )
