"""El pedido y todo lo que cuelga de el: renglones, pagos y entrega."""

from datetime import datetime

from ..extensions import db


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Opcional a proposito: el invitado pide por WhatsApp sin cuenta (ADR-012).
    # Los datos de contacto de ese pedido viven en OrderDelivery.
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    status = db.Column(db.String(50), default="pending")
    channel = db.Column(db.String(30), nullable=False, default="mercado_pago")
    total_amount = db.Column(db.Numeric(10, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="orders")
    items = db.relationship("OrderItem", back_populates="order", lazy=True)
    payments = db.relationship("Payment", back_populates="order", lazy=True)
    delivery = db.relationship(
        "OrderDelivery",
        back_populates="order",
        uselist=False,
        lazy=True,
        cascade="all, delete-orphan",
    )


class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    # Copiado, sin FK a `product_variant`, igual que `unit_price` (ADR-029):
    # un pedido es historia, y `Product.variants` tiene delete-orphan, asi que
    # guardar el producto desde el panel borra las filas viejas. Una FK a algo
    # que el panel borra de rutina revienta el dia que ella edite una torta
    # que ya vendio.
    variant_name = db.Column(db.String(120))
    # Lo que escribio quien compro sobre como quiere la torta (F58). Una sola
    # linea y corto: no es un deposito de texto.
    note = db.Column(db.String(300))
    # URL de la foto de referencia, siempre una que emitimos nosotros
    # (ADR-031/032). Nunca lo que mando el cliente sin validar.
    reference_image = db.Column(db.String(500))

    order = db.relationship("Order", back_populates="items")
    product = db.relationship("Product", back_populates="order_items")
    options = db.relationship(
        "OrderItemOption",
        back_populates="item",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="OrderItemOption.id",
    )


class OrderItemOption(db.Model):
    """Lo que el cliente eligio, copiado por nombre.

    Sin FK a `Option` por lo mismo que `variant_name`: si ella renombra
    "Dulce de leche" a "DDL" el anio que viene, el pedido de hoy tiene que
    seguir diciendo lo que vendio hoy. Y por la misma razon el recargo se
    copia (F61, ADR-036): subir el chocolate de $500 a $800 en marzo no puede
    cambiar lo que dice el pedido de enero.
    """

    id = db.Column(db.Integer, primary_key=True)
    order_item_id = db.Column(
        db.Integer, db.ForeignKey("order_item.id"), nullable=False, index=True
    )
    group_name = db.Column(db.String(120), nullable=False)
    option_name = db.Column(db.String(120), nullable=False)
    price_delta = db.Column(
        db.Numeric(10, 2), nullable=False, default=0, server_default="0"
    )

    item = db.relationship("OrderItem", back_populates="options")


class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    provider = db.Column(db.String(50), default="mercado_pago")
    provider_payment_id = db.Column(db.String(255))
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(10), default="ars")
    status = db.Column(db.String(50), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("Order", back_populates="payments")


class OrderDelivery(db.Model):
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), primary_key=True)
    customer_name = db.Column(db.String(120), nullable=False)
    # Opcional desde el pedido de invitado (ADR-025): quien pide por WhatsApp
    # deja nombre y telefono, y la conversacion sigue ahi. El telefono es el
    # canal, asi que en ese pedido es el obligatorio.
    customer_email = db.Column(db.String(255))
    customer_phone = db.Column(db.String(50))
    delivery_method = db.Column(db.String(50), default="delivery")
    address = db.Column(db.String(255))
    neighborhood = db.Column(db.String(120))
    city = db.Column(db.String(120))
    shipping_amount = db.Column(db.Numeric(10, 2), default=0)
    notes = db.Column(db.Text)
    payment_method = db.Column(db.String(50), default="mercado_pago")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship("Order", back_populates="delivery")
