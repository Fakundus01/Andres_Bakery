"""Un renglon del pedido: producto, tamano, sabores, nota y foto.

Salio de `order_service.py`, que con la personalizacion pasaba las 300 lineas
(R05), y de paso queda en un archivo lo que decide **plata**: el precio sale
de la base y nunca del request, y el tamano elegido tiene que ser de ese
producto (ADR-029).

Las tres validaciones de aca son el mismo patron que `_resolve_delivery_method`
ya usa para el envio: lista blanca del lado del servidor, porque el control de
la pantalla es comodidad y no seguridad (V4).
"""

from __future__ import annotations

from decimal import Decimal

from flask import current_app

from ..extensions import db
from ..models import Order, OrderItem, OrderItemOption, Product, ProductVariant
from .almacen_de_imagenes import almacen_de_imagenes
from .base import MAX_IMPORTE, ServiceBase
from .exceptions import ValidationError
from .quantity import validate_quantity
from .sabores_del_renglon import SaborElegido, sabores_del_renglon
from . import saneado


# Mas que esto no es un pedido de una reposteria: es alguien probando.
MAX_ID = 2**31 - 1
# La etiqueta que habilita la personalizacion (ADR-031, decidido el
# 2026-10-19). Solo las tortas a pedido se eligen y se describen; una docena
# de cookies no, y la puerta es una etiqueta porque es lo que ella ya maneja.
# **Espeja a `front/src/lib/carrito.ts::TAG_PERSONALIZABLE`.**
TAG_PERSONALIZABLE = "tortas-personalizadas"
CAMPOS_DE_PERSONALIZACION = ("option_ids", "note", "reference_image")
# La nota es una aclaracion de diseno, no un deposito de texto. Y va en una
# sola linea: con saltos, alguien escribe "Pagado: SI, transferencia hecha" y
# en el panel parece un campo del sistema (hallazgo real de la review de T7).
TOPE_NOTA = 300
class ArmadorDeRenglon(ServiceBase):
    def armar(self, order: Order, raw_item: object) -> Decimal:
        """Agrega el renglon al pedido y devuelve lo que suma al total."""
        if not isinstance(raw_item, dict):
            raise ValidationError("Hay un producto mal formado en el pedido.")

        product_id = saneado.entero(
            raw_item.get("product_id"), "product_id", minimo=1, maximo=MAX_ID
        )
        # El tope de unidades entra en el rango: asi una cantidad absurda sale
        # por la misma puerta que un cero o un texto, con un 400 explicado.
        tope_unidades = int(current_app.config.get("ORDER_MAX_UNITS", 1000))
        quantity = saneado.entero(
            raw_item.get("quantity"), "cantidad", minimo=1, maximo=tope_unidades
        )

        product = self.require_entity(Product, product_id, "product")
        if not product.available:
            raise ValidationError(f"«{product.name}» no está disponible por ahora.")
        # El minimo y el salto los decide el servidor: el control del carrito
        # es comodidad, no seguridad (V4).
        validate_quantity(product, quantity)

        variante = self._variante(
            product, raw_item.get("variant_id"), nombre_visto=raw_item.get("variant_name")
        )
        precio_base = Decimal(str(variante.price if variante else product.price))

        # El tamano lo tiene cualquier producto que se venda por tamanos
        # (ADR-007); lo que la etiqueta habilita es la personalizacion.
        personalizable = self._es_personalizable(product)
        if not personalizable:
            self._rechazar_personalizacion(product, raw_item)

        # Los grupos se leen **antes** de construir el renglón: construirlo lo
        # engancha a `Product.order_items` sin estar en la sesión todavía, y
        # el `product.option_groups` de abajo disparaba un autoflush con su
        # `SAWarning` en cada pedido (lo marcó el reviewer de T18). No rompía
        # nada; es la clase de ruido que un día esconde un flush parcial.
        elegidas: list[SaborElegido] = (
            sabores_del_renglon.elegidos(product, raw_item.get("option_ids"))
            if personalizable
            else []
        )
        sabores_del_renglon.exigir_que_sean_los_que_vio(
            elegidas, raw_item.get("options_seen")
        )
        # El recargo del sabor sale de la base como el precio del tamano
        # (ADR-036): un `price_delta` que venga en el request se ignora, igual
        # que el `price` del producto. Es la tercera vez que esta regla se
        # escribe en este archivo, y por eso el archivo existe.
        unit_price = precio_base + sum(
            (sabor.recargo for sabor in elegidas), Decimal("0")
        )
        # El precio de UNA unidad tiene que entrar en `Numeric(10, 2)`. Antes
        # de F61 no hacia falta mirarlo —era un solo precio ya topeado—, pero
        # dos recargos en el tope suman nueve digitos enteros en una columna
        # de ocho: en SQLite entra torcido y en Postgres es un 500 en la ruta
        # publica del pedido (lo midio el reviewer de T20).
        if unit_price > MAX_IMPORTE:
            raise ValidationError(
                f"«{product.name}» con esos sabores da un precio imposible. "
                "Avisanos y lo revisamos."
            )

        item = OrderItem(
            order=order,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            variant_name=variante.name if variante else None,
            note=self._nota(raw_item.get("note")) or None,
            reference_image=self._foto(raw_item.get("reference_image")) or None,
        )
        for sabor in elegidas:
            item.options.append(
                OrderItemOption(
                    group_name=sabor.grupo,
                    option_name=sabor.sabor,
                    price_delta=sabor.recargo,
                )
            )
        db.session.add(item)
        return unit_price * quantity

    @staticmethod
    def _es_personalizable(product: Product) -> bool:
        """¿Esta es una torta a pedido?

        Lo decide la etiqueta y no la presencia de grupos: si fuera por los
        grupos, asignarle "Relleno" a un producto por error convertiria una
        docena de cookies en algo que no se puede pedir sin elegir relleno.
        """
        return any(tag.slug == TAG_PERSONALIZABLE for tag in product.tags)

    @staticmethod
    def _rechazar_personalizacion(product: Product, raw_item: dict) -> None:
        """Un 400 explicado, no un descarte en silencio.

        Si se ignoraran los campos, alguien manda una nota con el pedido de
        cookies, ve un 201, y da por hecho que Andrea la va a leer. Decirle
        que ese producto no se pide personalizado es la verdad.
        """
        for campo in CAMPOS_DE_PERSONALIZACION:
            if raw_item.get(campo) not in (None, "", [], {}):
                raise ValidationError(
                    f"«{product.name}» no se pide personalizado: "
                    "los sabores y la foto son solo para las tortas a pedido."
                )

    def _variante(
        self, product: Product, crudo: object, *, nombre_visto: object = None
    ) -> ProductVariant | None:
        """El precio del tamano elegido, verificando que sea de este producto.

        Sin la verificacion, mandar el `variant_id` de la variante barata de
        otro producto compra la torta grande al precio del alfajor. Es el
        mismo agujero que `_resolve_shipping_amount` cerro para el envio, en
        el mismo endpoint publico.
        """
        if crudo is None or crudo == "":
            return None

        variant_id = saneado.entero(crudo, "variant_id", minimo=1, maximo=MAX_ID)
        variante = db.session.get(ProductVariant, variant_id)
        # Dos casos distintos, dos mensajes distintos (C5 de T4-F19b). El
        # primero es el que de verdad pasa: alguien tiene la torta en el
        # carrito desde ayer y ella borro ese tamano. Decirle "ese tamano no
        # es de esta torta" no le explica nada ni le dice que hacer. Los ids
        # de variante son publicos —`GET /api/products` los devuelve—, asi que
        # distinguirlos no cuenta nada que no se sepa.
        if variante is None:
            raise ValidationError(
                "Ese tamaño ya no está disponible. Abrí el producto y elegí uno de los que hay."
            )
        if variante.product_id != product.id:
            raise ValidationError(f"Ese tamaño no es de «{product.name}».")
        self._exigir_que_sea_el_que_vio(variante, nombre_visto)
        return variante

    @staticmethod
    def _exigir_que_sea_el_que_vio(variante: ProductVariant, nombre_visto: object) -> None:
        """El carrito manda tambien el nombre que mostro, y tiene que coincidir.

        El precio **sigue saliendo de la base**: esto no es confiarle un dato
        al cliente, es usar lo que el cliente vio como testigo. Si el id cayo
        sobre otra variante —SQLite reusa los rowid cuando una fila se borra,
        lo encontro el pentester de T18— quien compra ve "8 porciones
        $14.000" y le cobrarian "12 porciones $19.800". Con el testigo, eso es
        un 400 que le pide elegir de nuevo en vez de una sorpresa en el total.
        """
        if nombre_visto is None:
            return
        visto = saneado.texto(nombre_visto, "tamaño", tope=120)
        if visto and visto != variante.name:
            raise ValidationError(
                f"El tamaño «{visto}» cambió de precio o de nombre. "
                "Abrí el producto y elegilo de nuevo, así no te cobramos otra cosa."
            )

    @staticmethod
    def _nota(crudo: object) -> str:
        return saneado.texto(crudo, "nota", tope=TOPE_NOTA)

    @staticmethod
    def _foto(crudo: object) -> str:
        """Solo una URL que emitimos nosotros (ADR-031/032).

        Si se aceptara cualquier URL, el renglon del pedido seria un lugar
        donde pegar un link a cualquier cosa, y el panel de Andrea —y el
        mensaje de WhatsApp— lo muestran con su firma.
        """
        url = saneado.texto(crudo, "foto de referencia", tope=500)
        if not url:
            return ""
        if not almacen_de_imagenes.es_referencia(url):
            raise ValidationError(
                "Esa foto no está en el servidor. Volvé a subirla y mandá el pedido de nuevo."
            )
        # Deja de ser provisoria: ya tiene un pedido que la usa, asi que el
        # barrido de huerfanas no se la puede llevar.
        almacen_de_imagenes.marcar_usada(url)
        return url


armador_de_renglon = ArmadorDeRenglon()
