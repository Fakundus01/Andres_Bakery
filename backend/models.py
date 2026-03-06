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
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    category = db.Column(db.String(120), default="general")
    image_url = db.Column(db.String(500))
    available = db.Column(db.Boolean, default=True)

    order_items = db.relationship("OrderItem", back_populates="product", lazy=True)
    ingredients = db.relationship(
        "Ingredient",
        secondary=product_ingredients,
        back_populates="products",
        lazy=True,
    )


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


class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    ingredients = db.Column(db.Text, nullable=False)
    steps = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500))
    category = db.Column(db.String(120), default="general")
    status = db.Column(db.String(50), default="published")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(50), default="pending")
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
    customer_email = db.Column(db.String(255), nullable=False)
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


class SiteContent(db.Model):
    key = db.Column(db.String(120), primary_key=True)
    content = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
