from __future__ import annotations

from flask import current_app
from flask_mail import Message  # type: ignore

from ..extensions import mail
from ..models import Order


def send_order_created_notifications(order: Order) -> dict[str, str]:
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
        f"{delivery.delivery_method.title()} en {delivery.neighborhood or 'Villa Maipu'}"
        if delivery
        else "Retiro por el local"
    )

    customer_body = (
        f"Hola {customer_name},\n\n"
        f"Recibimos tu pedido #{order.id} en Andres Bakery.\n\n"
        f"Resumen:\n{order_lines}\n"
        f"Envio: ${shipping_amount:,.2f}\n"
        f"Total: ${float(order.total_amount):,.2f}\n"
        f"Entrega: {delivery_line}\n\n"
        "Te vamos a escribir si necesitamos confirmar algun detalle.\n"
        "Gracias por elegir nuestros dulces."
    )

    admin_body = (
        f"Nuevo pedido #{order.id}\n\n"
        f"Cliente: {customer_name} <{customer_email}>\n"
        f"Telefono: {(delivery.customer_phone if delivery else '') or 'No informado'}\n"
        f"Metodo de pago: {(delivery.payment_method if delivery else '') or 'mercado_pago'}\n"
        f"Entrega: {delivery_line}\n"
        f"Direccion: {(delivery.address if delivery else '') or current_app.config.get('PICKUP_ADDRESS')}\n"
        f"Notas: {(delivery.notes if delivery else '') or 'Sin notas'}\n\n"
        f"Items:\n{order_lines}\n\n"
        f"Total: ${float(order.total_amount):,.2f}"
    )

    result = {"customer": "skipped", "admin": "skipped"}
    result["customer"] = _send_email(
        subject=f"Andres Bakery | Confirmacion de pedido #{order.id}",
        recipients=[customer_email],
        body=customer_body,
    )
    if admin_email:
        result["admin"] = _send_email(
            subject=f"Andres Bakery | Nuevo pedido #{order.id}",
            recipients=[admin_email],
            body=admin_body,
        )

    return result


def _send_email(subject: str, recipients: list[str], body: str) -> str:
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
