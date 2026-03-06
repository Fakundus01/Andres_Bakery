from __future__ import annotations

from decimal import Decimal
import unicodedata

from flask import current_app

from ..extensions import db
from ..models import Order, OrderDelivery, OrderItem, Product, User
from .base import ServiceBase
from .exceptions import AuthorizationError, ValidationError
from .notifications import NotificationService, notification_service
from .serializers import Serializer


class OrderService(ServiceBase):
    def __init__(self, notifications: NotificationService | None = None) -> None:
        self.notifications = notifications or notification_service

    def create_order(self, user_identity: int | str | None, data: dict) -> dict:
        items = data.get("items") or []
        customer = data.get("customer") or {}
        delivery = data.get("delivery") or {}
        payment_method = str(data.get("payment_method") or "mercado_pago")

        if not isinstance(items, list) or not items:
            raise ValidationError("items are required")

        user = self.require_entity(User, self.parse_identity(user_identity), "user")
        delivery_method = str(delivery.get("method") or "delivery")
        shipping_amount = self._resolve_shipping_amount(delivery_method, delivery)
        self._validate_delivery(delivery_method, delivery)

        order = Order(user_id=user.id, status="pending")
        db.session.add(order)

        total = Decimal("0.00")
        for raw_item in items:
            if not isinstance(raw_item, dict):
                raise ValidationError("invalid item data")

            product_id = self.parse_int(raw_item.get("product_id"), "product_id")
            quantity = self.parse_int(raw_item.get("quantity"), "quantity")
            if quantity <= 0:
                raise ValidationError("quantity must be greater than zero")

            product = self.require_entity(Product, product_id, "product")
            if not product.available:
                raise ValidationError(f"product {product_id} not available")

            unit_price = Decimal(str(product.price))
            total += unit_price * quantity
            db.session.add(
                OrderItem(
                    order=order,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price,
                )
            )

        order.total_amount = total + shipping_amount
        order.delivery = OrderDelivery(
            customer_name=(customer.get("name") or user.name),
            customer_email=(customer.get("email") or user.email),
            customer_phone=customer.get("phone"),
            delivery_method=delivery_method,
            address=delivery.get("address"),
            neighborhood=(delivery.get("neighborhood") or current_app.config["DELIVERY_ZONE_NAME"]),
            city=(delivery.get("city") or "General San Mart\u00edn"),
            shipping_amount=shipping_amount,
            notes=delivery.get("notes"),
            payment_method=payment_method,
        )
        db.session.commit()

        return {
            "order_id": order.id,
            "total": float(order.total_amount),
            "emails": self.notifications.send_order_created_notifications(order),
        }

    def list_orders(self, user_identity: int | str | None) -> list[dict]:
        user = self.require_entity(User, self.parse_identity(user_identity), "user")
        if user.is_admin:
            orders = Order.query.order_by(Order.created_at.desc()).all()
        else:
            orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
        return [Serializer.order(order) for order in orders]

    def get_order(self, user_identity: int | str | None, order_id: int) -> dict:
        user = self.require_entity(User, self.parse_identity(user_identity), "user")
        order = self.require_entity(Order, order_id, "order")
        if not user.is_admin and order.user_id != user.id:
            raise AuthorizationError("not authorized")
        return Serializer.order(order)

    def update_status(self, order_id: int, data: dict) -> dict:
        status = str(data.get("status") or "").strip()
        if not status:
            raise ValidationError("status is required")

        order = self.require_entity(Order, order_id, "order")
        order.status = status
        db.session.commit()
        return {"status": "updated"}

    def _resolve_shipping_amount(self, delivery_method: str, delivery: dict) -> Decimal:
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

    def _validate_delivery(self, delivery_method: str, delivery: dict) -> None:
        if delivery_method != "delivery":
            return

        address = (delivery.get("address") or "").strip()
        neighborhood = (delivery.get("neighborhood") or "").strip()
        if not address:
            raise ValidationError("address is required for delivery")
        if not neighborhood:
            raise ValidationError("neighborhood is required for delivery")
        if not self._matches_delivery_zone(neighborhood):
            raise ValidationError(
                f"deliveries are only available in {current_app.config['DELIVERY_ZONE_NAME']}"
            )

    def _matches_delivery_zone(self, neighborhood: str) -> bool:
        normalized_zone = self._normalize_text(current_app.config["DELIVERY_ZONE_NAME"])
        normalized_value = self._normalize_text(neighborhood)
        return normalized_zone in normalized_value or normalized_value in normalized_zone

    @staticmethod
    def _normalize_text(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value)
        return "".join(
            char for char in normalized if not unicodedata.combining(char)
        ).lower()


order_service = OrderService()
