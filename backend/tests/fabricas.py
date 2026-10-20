"""Las filas que necesita un test, armadas en una linea.

Salieron de `support.py`, que paso las 300 lineas al entrar los grupos de
opciones (R05). `BackendServiceTestCase` hereda de esta clase, asi que los
tests siguen llamando `self.create_product(...)` y ningun import cambio.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from backend.extensions import db
from backend.models import (
    Ingredient,
    Option,
    OptionGroup,
    Order,
    OrderDelivery,
    OrderItem,
    Payment,
    Product,
    ProductVariant,
    Tag,
    User,
)
from backend.services.renglon_del_pedido import TAG_PERSONALIZABLE
from backend.services.slug import unique_slug


class FabricasDeDatos:
    def create_user(
        self,
        *,
        name: str = "Cliente Test",
        email: str = "cliente@test.local",
        password: str = "secret123",
        is_admin: bool = False,
    ) -> User:
        user = User(name=name, email=email, is_admin=is_admin)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    def create_ingredient(self, *, name: str, unit: str = "u") -> Ingredient:
        ingredient = Ingredient(name=name, unit=unit)
        db.session.add(ingredient)
        db.session.commit()
        return ingredient

    def create_product(
        self,
        *,
        name: str = "Cookie Test",
        price: str = "1500.00",
        category: str = "cookies",
        available: bool = True,
        unit_label: str = "unidad",
        min_qty: int = 1,
        qty_step: int = 1,
        ingredients: list[Ingredient] | None = None,
        tags: list[Tag] | None = None,
    ) -> Product:
        product = Product(
            name=name,
            slug=unique_slug(Product, name),
            description=f"Descripcion de {name}",
            price=Decimal(price),
            category=category,
            available=available,
            unit_label=unit_label,
            min_qty=min_qty,
            qty_step=qty_step,
            image_url="https://example.com/product.jpg",
        )
        if ingredients is not None:
            product.ingredients = list(ingredients)
        if tags is not None:
            product.tags = list(tags)
        db.session.add(product)
        db.session.commit()
        return product

    def create_producto_personalizable(self, *, name: str = "Torta a pedido", **extra) -> Product:
        """Un producto con la etiqueta que habilita la personalizacion.

        Sin la etiqueta, el servidor rechaza sabores, nota y foto (decision
        del 2026-10-19): es lo que separa una torta a pedido de una docena de
        cookies.
        """
        etiqueta = Tag.query.filter_by(slug=TAG_PERSONALIZABLE).first()
        if etiqueta is None:
            etiqueta = self.create_tag(name="tortas personalizadas")
        return self.create_product(name=name, tags=[etiqueta], **extra)

    def create_tag(self, *, name: str = "sin TACC", color_token: str = "acento") -> Tag:
        tag = Tag(name=name, slug=unique_slug(Tag, name, fallback="etiqueta"), color_token=color_token)
        db.session.add(tag)
        db.session.commit()
        return tag

    def create_variant(
        self,
        *,
        product: Product,
        name: str = "8 porciones",
        price: str = "14000.00",
        sort_order: int = 0,
    ) -> ProductVariant:
        variant = ProductVariant(
            product=product, name=name, price=Decimal(price), sort_order=sort_order
        )
        db.session.add(variant)
        db.session.commit()
        return variant

    def create_option_group(
        self,
        *,
        name: str = "Relleno",
        options: list[str | tuple[str, str]] | None = None,
        required: bool = True,
        products: list[Product] | None = None,
        sort_order: int = 0,
    ) -> OptionGroup:
        """Un sabor es un nombre, o `(nombre, recargo)` si cuesta mas (F61)."""
        group = OptionGroup(name=name, required=required, sort_order=sort_order)
        for posicion, crudo in enumerate(options or ["Dulce de leche", "Chocolate"]):
            nombre, recargo = crudo if isinstance(crudo, tuple) else (crudo, "0")
            group.options.append(
                Option(name=nombre, price_delta=Decimal(recargo), sort_order=posicion)
            )
        if products is not None:
            group.products = list(products)
        db.session.add(group)
        db.session.commit()
        return group

    def create_order(
        self,
        *,
        user: User,
        product: Product,
        quantity: int = 1,
        status: str = "pending",
        delivery_method: str = "delivery",
        neighborhood: str = "Villa Maipu",
        payment_method: str = "visa",
        shipping_amount: str = "2500.00",
        created_at: datetime | None = None,
    ) -> Order:
        shipping = Decimal(shipping_amount) if delivery_method == "delivery" else Decimal("0.00")
        unit_price = Decimal(str(product.price))
        order = Order(user_id=user.id, status=status, total_amount=(unit_price * quantity) + shipping)
        # Sin fecha explicita vale `utcnow`, y un test que fija "hoy" a mano
        # queda atado al reloj: los dos del resumen de metricas se pusieron
        # rojos solos al cruzar la medianoche UTC.
        if created_at is not None:
            order.created_at = created_at
        db.session.add(order)
        db.session.flush()
        db.session.add(OrderItem(order=order, product=product, quantity=quantity, unit_price=unit_price))
        order.delivery = OrderDelivery(
            customer_name=user.name,
            customer_email=user.email,
            customer_phone="1122334455",
            delivery_method=delivery_method,
            address="Calle 123" if delivery_method == "delivery" else None,
            neighborhood=neighborhood,
            city="General San Martin",
            shipping_amount=shipping,
            notes="Timbre 2",
            payment_method=payment_method,
        )
        db.session.commit()
        return order

    def create_payment(
        self,
        *,
        order: Order,
        provider_payment_id: str = "pay-1",
        status: str = "pending",
        amount: str | None = None,
    ) -> Payment:
        payment = Payment(
            order_id=order.id,
            provider="mercado_pago",
            provider_payment_id=provider_payment_id,
            amount=Decimal(amount or str(order.total_amount)),
            currency="ars",
            status=status,
        )
        db.session.add(payment)
        db.session.commit()
        return payment
