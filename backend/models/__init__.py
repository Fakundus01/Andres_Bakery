"""Los modelos, en modulos por tema.

Era un solo archivo y paso las 300 lineas al entrar los grupos de opciones
(R05). Se parte igual que `front/src/lib/api.ts`: este `__init__` mantiene la
puerta, asi que los `from ..models import X` de todo el back siguen andando y
ningun import cambio.

`import *` no alcanza: SQLAlchemy resuelve las relaciones por nombre de clase
cuando se configura el mapeo, asi que todos los modulos tienen que estar
importados antes de la primera consulta. Importarlos aca lo garantiza, porque
nadie llega a un modelo sin pasar por este archivo.
"""

from .catalogo import (
    Ingredient,
    Option,
    OptionGroup,
    Product,
    ProductVariant,
    Tag,
    product_ingredients,
    product_option_groups,
    product_tags,
)
from .pedidos import Order, OrderDelivery, OrderItem, OrderItemOption, Payment
from .sitio import PageView, SiteContent, StoredImage
from .usuarios import User


__all__ = [
    "Ingredient",
    "Option",
    "OptionGroup",
    "Order",
    "OrderDelivery",
    "OrderItem",
    "OrderItemOption",
    "PageView",
    "Payment",
    "Product",
    "ProductVariant",
    "SiteContent",
    "StoredImage",
    "Tag",
    "User",
    "product_ingredients",
    "product_option_groups",
    "product_tags",
]
