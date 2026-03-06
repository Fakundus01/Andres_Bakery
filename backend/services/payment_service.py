from __future__ import annotations

from decimal import Decimal
import json
from urllib import error, request as urllib_request
import uuid

from flask import current_app

from ..extensions import db
from ..models import Order, Payment
from .base import ServiceBase
from .exceptions import AuthorizationError, ConfigurationError, ExternalServiceError, ValidationError


class MercadoPagoClient:
    def create_preference(self, order: Order, requested_method: str) -> dict:
        frontend_origin = current_app.config.get("FRONTEND_ORIGIN", "http://localhost:5174").rstrip("/")
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
                    "title": f"Env\u00edo {current_app.config['DELIVERY_ZONE_NAME']}",
                    "description": "Log\u00edstica local de Andres Bakery",
                    "quantity": 1,
                    "currency_id": current_app.config.get("PAYMENT_CURRENCY", "ars").upper(),
                    "unit_price": float(order.delivery.shipping_amount),
                }
            )

        backend_public_url = current_app.config.get("BACKEND_PUBLIC_URL", "").rstrip("/")
        if backend_public_url:
            payload["notification_url"] = f"{backend_public_url}/api/payments/webhook"

        return self._request("POST", "/checkout/preferences", payload)

    def get_payment(self, payment_id: str) -> dict:
        return self._request("GET", f"/v1/payments/{payment_id}")

    def _request(self, method: str, path: str, payload: dict | None = None) -> dict:
        access_token = current_app.config.get("MERCADO_PAGO_ACCESS_TOKEN")
        if not access_token:
            raise ConfigurationError("mercado pago is not configured")

        base_url = current_app.config.get("MERCADO_PAGO_API_BASE_URL", "https://api.mercadopago.com").rstrip("/")
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib_request.Request(
            url=f"{base_url}{path}",
            data=body,
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
            response_body = exc.read().decode("utf-8", errors="ignore")
            raise ExternalServiceError(response_body or str(exc)) from exc
        except error.URLError as exc:
            raise ExternalServiceError(str(exc)) from exc


class PaymentService(ServiceBase):
    def __init__(self, client: MercadoPagoClient | None = None) -> None:
        self.client = client or MercadoPagoClient()

    def create_checkout(self, user_identity: int | str | None, data: dict) -> dict:
        order_id = data.get("order_id")
        requested_method = str(data.get("payment_method") or "mercado_pago")
        if order_id is None:
            raise ValidationError("order_id is required")

        order = self.require_entity(Order, self.parse_int(order_id, "order_id"), "order")
        user_id = self.parse_identity(user_identity)
        if order.user_id != user_id:
            raise AuthorizationError("not authorized")

        checkout = self.client.create_preference(order, requested_method)
        preference_id = checkout.get("id")
        if not preference_id:
            raise ExternalServiceError("mercado pago returned an invalid checkout response")

        payment = Payment(
            order_id=order.id,
            provider="mercado_pago",
            provider_payment_id=str(preference_id),
            amount=order.total_amount,
            currency=current_app.config.get("PAYMENT_CURRENCY", "ars"),
            status="checkout_created",
        )
        db.session.add(payment)
        db.session.commit()

        return {
            "checkout_url": checkout.get("init_point"),
            "sandbox_checkout_url": checkout.get("sandbox_init_point"),
            "preference_id": str(preference_id),
            "payment_id": payment.id,
            "status": payment.status,
            "provider": "mercado_pago",
            "selected_method": requested_method,
        }

    def process_webhook(self, query_args, payload: dict) -> tuple[dict, int]:
        topic = query_args.get("type") or payload.get("type") or query_args.get("topic")
        payment_id = query_args.get("data.id") or (payload.get("data") or {}).get("id")
        if topic != "payment" or not payment_id:
            return {"status": "ignored"}, 200

        payment_data = self.client.get_payment(str(payment_id))
        order_reference = payment_data.get("external_reference") or (payment_data.get("metadata") or {}).get("order_id")
        if not order_reference:
            return {"status": "ignored"}, 200

        try:
            order_id = int(order_reference)
        except (TypeError, ValueError):
            return {"status": "ignored"}, 200

        order = db.session.get(Order, order_id)
        if not order:
            return {"status": "ignored"}, 200

        payment = Payment.query.filter_by(
            order_id=order.id,
            provider="mercado_pago",
            provider_payment_id=str(payment_id),
        ).first()
        amount = Decimal(str(payment_data.get("transaction_amount", order.total_amount)))
        currency = str(payment_data.get("currency_id") or current_app.config.get("PAYMENT_CURRENCY", "ars")).lower()
        status = str(payment_data.get("status") or "pending")

        if not payment:
            payment = Payment(
                order_id=order.id,
                provider="mercado_pago",
                provider_payment_id=str(payment_id),
                amount=amount,
                currency=currency,
                status=status,
            )
            db.session.add(payment)
        else:
            payment.amount = amount
            payment.currency = currency
            payment.status = status

        order.status = self._map_order_status(status)
        db.session.commit()
        return {"status": "processed"}, 200

    @staticmethod
    def _map_order_status(payment_status: str) -> str:
        if payment_status == "approved":
            return "paid"
        if payment_status in {"pending", "in_process", "authorized"}:
            return "payment_pending"
        if payment_status in {"rejected", "cancelled"}:
            return "payment_failed"
        return "pending"


payment_service = PaymentService()
