"""La regla de cuanto se puede pedir de un producto.

Vive aparte porque la aplican dos lados: el carrito del front (para que los
botones + y - salten de 6 en 6) y `order_service` cuando llega el pedido. El
que manda es el servidor: el control del front es comodidad, no seguridad (V4).
"""

from __future__ import annotations

from ..models import Product
from .exceptions import ValidationError


def is_valid_quantity(product: Product, quantity: int) -> bool:
    if quantity < product.min_qty:
        return False
    step = product.qty_step or 1
    return (quantity - product.min_qty) % step == 0


def validate_quantity(product: Product, quantity: int) -> None:
    if quantity < product.min_qty:
        raise ValidationError(
            f"product {product.id} has a minimum of {product.min_qty} {product.unit_label}"
        )
    if not is_valid_quantity(product, quantity):
        raise ValidationError(
            f"product {product.id} is sold in steps of {product.qty_step} {product.unit_label}"
        )
