from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db


product_ingredients = db.Table(
    "product_ingredients",
    db.Column("product_id", db.Integer, db.ForeignKey("product.id"), primary_key=True),
    db.Column(
        "ingredient_id",
        db.Integer,
        db.ForeignKey("ingredient.id"),
        primary_key=True,
    ),
)

product_tags = db.Table(
    "product_tags",
    db.Column("product_id", db.Integer, db.ForeignKey("product.id"), primary_key=True),
    db.Column("tag_id", db.Integer, db.ForeignKey("tag.id"), primary_key=True),
)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    orders = db.relationship("Order", back_populates="user", lazy=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(160), nullable=False, unique=True)
    description = db.Column(db.Text)
    steps = db.Column(db.Text)
    prep_note = db.Column(db.Text)

    price = db.Column(db.Numeric(10, 2), nullable=False)
    # price es el precio de UNA unit_label. min_qty y qty_step son el minimo de
    # pedido y el salto: "se venden de a 6" es min_qty=6, qty_step=6.
    unit_label = db.Column(db.String(40), nullable=False, default="unidad")
    min_qty = db.Column(db.Integer, nullable=False, default=1)
    qty_step = db.Column(db.Integer, nullable=False, default=1)

    category = db.Column(db.String(120), default="general")
    image_url = db.Column(db.String(500))
    available = db.Column(db.Boolean, default=True)
    allows_pickup = db.Column(db.Boolean, nullable=False, default=True)
    allows_delivery = db.Column(db.Boolean, nullable=False, default=True)

    order_items = db.relationship("OrderItem", back_populates="product", lazy=True)
    ingredients = db.relationship(
        "Ingredient",
        secondary=product_ingredients,
        back_populates="products",
        lazy=True,
    )
    tags = db.relationship(
        "Tag",
        secondary=product_tags,
        back_populates="products",
        lazy=True,
    )
    variants = db.relationship(
        "ProductVariant",
        back_populates="product",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="ProductVariant.sort_order",
    )


class Tag(db.Model):
    """Las crea Andrea: "sin TACC", "vegano", "frio" (ADR-006).

    Son su declaracion bajo su responsabilidad: el software las muestra,
    no las certifica.
    """

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), nullable=False, unique=True)
    slug = db.Column(db.String(80), nullable=False, unique=True)
    color_token = db.Column(db.String(40), nullable=False, default="acento")
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    products = db.relationship(
        "Product",
        secondary=product_tags,
        back_populates="tags",
        lazy=True,
    )


class ProductVariant(db.Model):
    """Solo para lo que se vende entero con tamanos: "torta 8 porciones" (ADR-007)."""

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    product = db.relationship("Product", back_populates="variants")


class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    unit = db.Column(db.String(40))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship(
        "Product",
        secondary=product_ingredients,
        back_populates="ingredients",
        lazy=True,
    )


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

    order = db.relationship("Order", back_populates="items")
    product = db.relationship("Product", back_populates="order_items")


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


class PageView(db.Model):
    """Visitas, contadas agregadas (F48, ADR-019).

    Una fila por (dia, ruta, clase de dispositivo) y un contador que sube. No
    hay IP, ni cookie, ni user agent, ni id de sesion: es a proposito. Se puede
    saber que la carta tuvo 160 visitas; no se puede saber quien entro, ni
    reconstruir el recorrido de nadie, ni cruzar quien mira con quien compra.
    """

    __table_args__ = (
        db.UniqueConstraint("day", "path", "device", name="uq_pageview_dia_ruta_dispositivo"),
    )

    id = db.Column(db.Integer, primary_key=True)
    day = db.Column(db.Date, nullable=False, index=True)
    # Ruta ya normalizada contra las que el front conoce: "/producto/<slug>"
    # entra como "/producto" y lo que no se reconoce, como "otra".
    path = db.Column(db.String(120), nullable=False)
    device = db.Column(db.String(20), nullable=False, default="otra")
    views = db.Column(db.Integer, nullable=False, default=0)


class SiteContent(db.Model):
    key = db.Column(db.String(120), primary_key=True)
    content = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
