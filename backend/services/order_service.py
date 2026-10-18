from __future__ import annotations

from decimal import Decimal
import re
import unicodedata

from flask import current_app

from ..extensions import db
from ..models import Order, OrderDelivery, OrderItem, Product, User
from .base import ServiceBase
from .exceptions import AuthorizationError, ValidationError
from .mensaje_whatsapp import armar_mensaje
from .notifications import NotificationService, notification_service
from .quantity import validate_quantity
from . import saneado
from .serializers import Serializer


# Más que esto no es un pedido de una repostería: es alguien probando.
MAX_PRODUCT_ID = 2**31 - 1
METODOS_DE_ENTREGA = {"delivery", "pickup"}


class OrderService(ServiceBase):
    def __init__(self, notifications: NotificationService | None = None) -> None:
        self.notifications = notifications or notification_service

    def create_order(self, user_identity: int | str | None, data: dict) -> dict:
        user = self.require_entity(User, self.parse_identity(user_identity), "user")
        order = self.armar_pedido(
            data,
            user=user,
            channel=self._resolve_channel(data.get("channel")),
        )
        db.session.commit()

        return {
            "order_id": order.id,
            "total": float(order.total_amount),
            "emails": self.notifications.send_order_created_notifications(order),
        }

    def create_whatsapp_order(self, data: dict, *, user: User | None = None) -> dict:
        """Pedido sin cuenta (F23, F31, ADR-025). Ruta publica.

        Devuelve el texto ya armado con los precios de la base: es el punto de
        la feature, ver `mensaje_whatsapp.py`. No devuelve el resultado de los
        mails —eso es asunto interno— ni nada del pedido de otra persona.
        """
        customer = saneado.diccionario(data.get("customer"), "customer")
        nombre = saneado.texto(
            customer.get("name") or (user.name if user else ""),
            "nombre",
            tope=saneado.TOPE_NOMBRE,
        )
        telefono = saneado.texto(customer.get("phone"), "teléfono", tope=saneado.TOPE_TELEFONO)

        if not nombre:
            raise ValidationError("Necesitamos tu nombre para el pedido.")
        if len(re.sub(r"\D", "", telefono)) < 8:
            raise ValidationError(
                "Necesitamos un teléfono de contacto: el pedido se cierra por WhatsApp."
            )

        order = self.armar_pedido(data, user=user, channel="whatsapp")
        db.session.commit()
        # Al invitado NO se le manda mail: la dirección no está verificada y
        # el cuerpo lleva texto que escribió quien pidió, así que el servidor
        # de Andrea sería un medio para mandarle cualquier cosa a cualquiera
        # (lo marcó la revisión de seguridad). El aviso a ella sale igual, que
        # es el que mueve el pedido, y la conversación sigue por WhatsApp.
        self.notifications.send_order_created_notifications(
            order, avisar_al_cliente=order.user is not None
        )

        return {
            "order_id": order.id,
            "total": float(order.total_amount),
            "phone": str(current_app.config.get("WHATSAPP_PHONE") or ""),
            "message": armar_mensaje(order),
        }

    def armar_pedido(self, data: dict, *, user: User | None, channel: str) -> Order:
        """Arma el pedido o deja la sesión como estaba.

        Sin el rollback, un pedido rechazado a mitad de camino queda pendiente
        en la sesión y lo graba el próximo `commit()` que salga bien. Por HTTP
        hoy no se alcanza —cada request tiene su sesión—, pero es la clase de
        mina que explota el día que alguien capture el 400 y siga trabajando.
        """
        try:
            return self._armar_pedido(data, user=user, channel=channel)
        except Exception:
            db.session.rollback()
            raise

    def _armar_pedido(self, data: dict, *, user: User | None, channel: str) -> Order:
        """Lo que comparten la ruta con token y la publica.

        Todo lo que decide plata o reglas vive aca y solo aca: el precio sale
        de `Product`, nunca del request, y el minimo y el salto los valida el
        servidor (V4). Lo unico que cambia entre las dos rutas es quien pide.
        """
        data = saneado.diccionario(data, "pedido")
        items = data.get("items") or []
        if not isinstance(items, list) or not items:
            raise ValidationError("El pedido no tiene productos.")

        tope_renglones = int(current_app.config.get("ORDER_MAX_LINES", 30))
        if len(items) > tope_renglones:
            raise ValidationError(
                f"Un pedido admite hasta {tope_renglones} productos distintos. "
                "Si necesitás más, escribinos por WhatsApp."
            )

        customer = saneado.diccionario(data.get("customer"), "customer")
        delivery = saneado.diccionario(data.get("delivery"), "delivery")
        delivery_method = self._resolve_delivery_method(delivery.get("method"))
        shipping_amount = self._resolve_shipping_amount(delivery_method)
        self._validate_delivery(delivery_method, delivery)

        order = Order(user_id=(user.id if user else None), status="pending", channel=channel)
        db.session.add(order)

        total = Decimal("0.00")
        for raw_item in items:
            total += self._agregar_renglon(order, raw_item)

        order.total_amount = total + shipping_amount
        order.delivery = OrderDelivery(
            customer_name=saneado.texto(
                customer.get("name") or (user.name if user else ""),
                "nombre",
                tope=saneado.TOPE_NOMBRE,
            ),
            # Sin cuenta puede no haber mail, y no hace falta: la conversación
            # sigue en WhatsApp (ADR-025). Lo que no se guarda es cualquier
            # cosa: si no parece un mail, queda vacío.
            customer_email=saneado.mail(customer.get("email") or (user.email if user else ""))
            or None,
            customer_phone=saneado.texto(
                customer.get("phone"), "teléfono", tope=saneado.TOPE_TELEFONO
            )
            or None,
            delivery_method=delivery_method,
            address=saneado.texto(delivery.get("address"), "dirección", tope=saneado.TOPE_DIRECCION)
            or None,
            neighborhood=saneado.texto(
                delivery.get("neighborhood") or current_app.config["DELIVERY_ZONE_NAME"],
                "barrio",
                tope=saneado.TOPE_NOMBRE,
            ),
            city=saneado.texto(
                delivery.get("city") or "General San Martín", "ciudad", tope=saneado.TOPE_NOMBRE
            ),
            shipping_amount=shipping_amount,
            # Las notas también van en una sola línea. Con saltos, alguien
            # escribe "Pagado: SI, transferencia hecha" y en el mail que lee
            # Andrea parece un campo del sistema, no algo que tipeó quien
            # compró. Una aclaración de entrega no necesita renglones.
            notes=saneado.texto(delivery.get("notes"), "notas", tope=saneado.TOPE_NOTAS) or None,
            payment_method=saneado.texto(
                data.get("payment_method") or "mercado_pago", "medio de pago", tope=50
            ),
        )
        return order

    def _agregar_renglon(self, order: Order, raw_item: object) -> Decimal:
        if not isinstance(raw_item, dict):
            raise ValidationError("Hay un producto mal formado en el pedido.")

        product_id = saneado.entero(
            raw_item.get("product_id"), "product_id", minimo=1, maximo=MAX_PRODUCT_ID
        )
        # El tope de unidades entra en el rango: así una cantidad absurda sale
        # por la misma puerta que un cero o un texto, con un 400 explicado.
        tope_unidades = int(current_app.config.get("ORDER_MAX_UNITS", 1000))
        quantity = saneado.entero(
            raw_item.get("quantity"), "cantidad", minimo=1, maximo=tope_unidades
        )

        product = self.require_entity(Product, product_id, "product")
        if not product.available:
            raise ValidationError(f"«{product.name}» no está disponible por ahora.")
        # El minimo y el salto los decide el servidor: el control del
        # carrito es comodidad, no seguridad (V4).
        validate_quantity(product, quantity)

        unit_price = Decimal(str(product.price))
        db.session.add(
            OrderItem(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
            )
        )
        return unit_price * quantity

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

    @staticmethod
    def _resolve_channel(value: object) -> str:
        channel = str(value or "mercado_pago").strip()
        if channel not in {"whatsapp", "mercado_pago"}:
            raise ValidationError("channel must be whatsapp or mercado_pago")
        return channel

    @staticmethod
    def _resolve_delivery_method(valor: object) -> str:
        """Lista blanca, igual que `channel`.

        Sin esto, un `method` de "Delivery" o "envio a domicilio" no entraba
        por la comparación exacta: se salteaba la validación de dirección y de
        zona, el envío quedaba en $0, y el panel y el mail decían "envío"
        mientras el WhatsApp decía "paso a retirar". Los dos canales que lee
        Andrea diciendo cosas distintas, y ganando el que cobra de menos.
        """
        metodo = saneado.texto(valor or "delivery", "método de entrega", tope=20).lower()
        if metodo not in METODOS_DE_ENTREGA:
            raise ValidationError("La entrega tiene que ser envío o retiro.")
        return metodo

    @staticmethod
    def _resolve_shipping_amount(delivery_method: str) -> Decimal:
        """El envio lo decide el servidor, nunca el request.

        Antes se aceptaba `delivery.shipping_amount` del cliente si venia. En
        una ruta con token era discutible; en una publica es un agujero: se
        manda 0 y el envio sale gratis, o se manda un negativo y el total
        queda por debajo del subtotal. El numero sale de DELIVERY_FEE.
        """
        if delivery_method != "delivery":
            return Decimal("0.00")
        return Decimal(str(current_app.config.get("DELIVERY_FEE", "0")))

    def _validate_delivery(self, delivery_method: str, delivery: dict) -> None:
        if delivery_method != "delivery":
            return

        address = saneado.texto(delivery.get("address"), "dirección", tope=saneado.TOPE_DIRECCION)
        neighborhood = saneado.texto(
            delivery.get("neighborhood"), "barrio", tope=saneado.TOPE_NOMBRE
        )
        if not address:
            raise ValidationError("Para el envío necesitamos la dirección.")
        if not neighborhood:
            raise ValidationError("Para el envío necesitamos el barrio.")
        if not self._matches_delivery_zone(neighborhood):
            raise ValidationError(
                "Por ahora los envíos son solo en "
                f"{current_app.config['DELIVERY_ZONE_NAME']}. Si estás cerca, escribinos."
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
