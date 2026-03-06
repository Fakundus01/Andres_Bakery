from __future__ import annotations

from flask import current_app
from flask_mail import Message  # type: ignore

from ..extensions import mail
from ..models import Order


class NotificationService:
    def send_order_created_notifications(self, order: Order) -> dict[str, str]:
        if not current_app.config.get("MAIL_SERVER"):
            return {
                "customer": "skipped: mail service not configured",
                "admin": "skipped: mail service not configured",
            }

        delivery = order.delivery
        customer_email = (delivery.customer_email if delivery else "") or order.user.email
        customer_name = (delivery.customer_name if delivery else "") or order.user.name
        admin_email = current_app.config.get("ADMIN_EMAIL")

        order_lines = "\n".join(
            f"- {item.quantity} x {item.product.name} - ${float(item.unit_price):,.2f}"
            for item in order.items
        )
        shipping_amount = float(delivery.shipping_amount) if delivery else 0
        delivery_line = (
            f"{delivery.delivery_method.title()} en {delivery.neighborhood or 'Villa Maip\u00fa'}"
            if delivery
            else "Retiro por el local"
        )

        customer_body = (
            f"Hola {customer_name},\n\n"
            f"Recibimos tu pedido #{order.id} en Andres Bakery.\n\n"
            f"Resumen:\n{order_lines}\n"
            f"Env\u00edo: ${shipping_amount:,.2f}\n"
            f"Total: ${float(order.total_amount):,.2f}\n"
            f"Entrega: {delivery_line}\n\n"
            "Te vamos a escribir si necesitamos confirmar alg\u00fan detalle.\n"
            "Gracias por elegir nuestros dulces."
        )

        admin_body = (
            f"Nuevo pedido #{order.id}\n\n"
            f"Cliente: {customer_name} <{customer_email}>\n"
            f"Tel\u00e9fono: {(delivery.customer_phone if delivery else '') or 'No informado'}\n"
            f"M\u00e9todo de pago: {(delivery.payment_method if delivery else '') or 'mercado_pago'}\n"
            f"Entrega: {delivery_line}\n"
            f"Direcci\u00f3n: {(delivery.address if delivery else '') or current_app.config.get('PICKUP_ADDRESS')}\n"
            f"Notas: {(delivery.notes if delivery else '') or 'Sin notas'}\n\n"
            f"Items:\n{order_lines}\n\n"
            f"Total: ${float(order.total_amount):,.2f}"
        )

        result = {"customer": "skipped", "admin": "skipped"}
        result["customer"] = self._send_email(
            subject=f"Andres Bakery | Confirmaci\u00f3n de pedido #{order.id}",
            recipients=[customer_email],
            body=customer_body,
        )
        if admin_email:
            result["admin"] = self._send_email(
                subject=f"Andres Bakery | Nuevo pedido #{order.id}",
                recipients=[admin_email],
                body=admin_body,
            )

        return result

    def _send_email(self, subject: str, recipients: list[str], body: str) -> str:
        try:
            msg = Message(
                subject=subject,
                sender=current_app.config["MAIL_DEFAULT_SENDER"],
                recipients=recipients,
                body=body,
            )
            mail.send(msg)
            return "sent"
        except Exception as exc:  # pragma: no cover - depends on SMTP configuration
            return f"failed: {exc}"


notification_service = NotificationService()


def send_order_created_notifications(order: Order) -> dict[str, str]:
    return notification_service.send_order_created_notifications(order)
