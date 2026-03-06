from decimal import Decimal
import json
from urllib import error, request as urllib_request
import uuid

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required  #type: ignore

from ..extensions import db
from ..models import Order, Payment


bp = Blueprint("payments", __name__, url_prefix="/api/payments")


@bp.post("/checkout")
@jwt_required()
def create_checkout():
    data = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    requested_method = data.get("payment_method", "mercado_pago")

    if not order_id:
        return jsonify({"error": "order_id is required"}), 400

    order = Order.query.get_or_404(order_id)
    user_id = get_jwt_identity()
    if order.user_id != user_id:
        return jsonify({"error": "not authorized"}), 403

    access_token = current_app.config.get("MERCADO_PAGO_ACCESS_TOKEN")
    if not access_token:
        return jsonify({"error": "mercado pago is not configured"}), 503

    checkout = _create_mercado_pago_preference(order, requested_method)

    payment = Payment(
        order_id=order.id,
        provider="mercado_pago",
        provider_payment_id=checkout["id"],
        amount=order.total_amount,
        currency=current_app.config.get("PAYMENT_CURRENCY", "ars"),
        status="checkout_created",
    )
    db.session.add(payment)
    db.session.commit()

    return jsonify(
        {
            "checkout_url": checkout.get("init_point"),
            "sandbox_checkout_url": checkout.get("sandbox_init_point"),
            "preference_id": checkout["id"],
            "payment_id": payment.id,
            "status": payment.status,
            "provider": "mercado_pago",
            "selected_method": requested_method,
        }
    )


@bp.post("/intent")
@jwt_required()
def create_payment_intent():
    return create_checkout()


@bp.post("/webhook")
def mercado_pago_webhook():
    payload = request.get_json(silent=True) or {}
    topic = request.args.get("type") or payload.get("type") or request.args.get("topic")
    payment_id = request.args.get("data.id") or (payload.get("data") or {}).get("id")

    if topic != "payment" or not payment_id:
        return jsonify({"status": "ignored"}), 200

    try:
        payment_data = _mercado_pago_request("GET", f"/v1/payments/{payment_id}")
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502

    order_id = payment_data.get("external_reference") or (
        payment_data.get("metadata") or {}
    ).get("order_id")
    if not order_id:
        return jsonify({"status": "ignored"}), 200

    order = Order.query.get(order_id)
    if not order:
        return jsonify({"status": "ignored"}), 200

    payment = Payment.query.filter_by(
        order_id=order.id,
        provider="mercado_pago",
        provider_payment_id=str(payment_id),
    ).first()
    if not payment:
        payment = Payment(
            order_id=order.id,
            provider="mercado_pago",
            provider_payment_id=str(payment_id),
            amount=Decimal(str(payment_data.get("transaction_amount", order.total_amount))),
            currency=(payment_data.get("currency_id") or current_app.config.get("PAYMENT_CURRENCY", "ars")).lower(),
            status=payment_data.get("status", "pending"),
        )
        db.session.add(payment)
    else:
        payment.amount = Decimal(str(payment_data.get("transaction_amount", order.total_amount)))
        payment.currency = (
            payment_data.get("currency_id") or current_app.config.get("PAYMENT_CURRENCY", "ars")
        ).lower()
        payment.status = payment_data.get("status", "pending")

    order.status = _map_order_status(payment.status)
    db.session.commit()
    return jsonify({"status": "processed"}), 200


def _create_mercado_pago_preference(order: Order, requested_method: str) -> dict:
    frontend_origin = current_app.config.get("FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")
    payload = {
        "external_reference": str(order.id),
        "statement_descriptor": "ANDBAKERY",
        "items": [
            {
                "id": str(item.product_id),
                "title": item.product.name,
                "description": item.product.description or item.product.category,
                "quantity": item.quantity,
                "currency_id": current_app.config.get("PAYMENT_CURRENCY", "ars").upper(),
                "unit_price": float(item.unit_price),
            }
            for item in order.items
        ],
        "payer": {
            "name": order.delivery.customer_name if order.delivery else order.user.name,
            "email": order.delivery.customer_email if order.delivery else order.user.email,
        },
        "metadata": {
            "order_id": order.id,
            "requested_method": requested_method,
        },
        "back_urls": {
            "success": f"{frontend_origin}/#/pedidos?payment=approved&order={order.id}",
            "failure": f"{frontend_origin}/#/pedidos?payment=failure&order={order.id}",
            "pending": f"{frontend_origin}/#/pedidos?payment=pending&order={order.id}",
        },
        "auto_return": "approved",
    }
    if order.delivery and float(order.delivery.shipping_amount) > 0:
        payload["items"].append(
            {
                "id": f"delivery-{order.id}",
                "title": f"Envio {current_app.config['DELIVERY_ZONE_NAME']}",
                "description": "Logistica local de Andres Bakery",
                "quantity": 1,
                "currency_id": current_app.config.get("PAYMENT_CURRENCY", "ars").upper(),
                "unit_price": float(order.delivery.shipping_amount),
            }
        )

    backend_public_url = current_app.config.get("BACKEND_PUBLIC_URL", "").rstrip("/")
    if backend_public_url:
        payload["notification_url"] = f"{backend_public_url}/api/payments/webhook"

    return _mercado_pago_request("POST", "/checkout/preferences", payload)


def _mercado_pago_request(method: str, path: str, payload: dict | None = None) -> dict:
    access_token = current_app.config.get("MERCADO_PAGO_ACCESS_TOKEN")
    if not access_token:
        raise RuntimeError("mercado pago is not configured")

    base_url = current_app.config.get(
        "MERCADO_PAGO_API_BASE_URL",
        "https://api.mercadopago.com",
    ).rstrip("/")
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib_request.Request(
        url=f"{base_url}{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": str(uuid.uuid4()),
        },
        method=method,
    )
    try:
        with urllib_request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(body or str(exc)) from exc
    except error.URLError as exc:
        raise RuntimeError(str(exc)) from exc


def _map_order_status(payment_status: str) -> str:
    if payment_status == "approved":
        return "paid"
    if payment_status in {"pending", "in_process", "authorized"}:
        return "payment_pending"
    if payment_status in {"rejected", "cancelled"}:
        return "payment_failed"
    return "pending"
