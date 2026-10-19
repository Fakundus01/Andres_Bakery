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
from ..models import Option, Order, OrderItem, OrderItemOption, Product, ProductVariant
from .almacen_de_imagenes import almacen_de_imagenes
from .base import ServiceBase
from .exceptions import ValidationError
from .quantity import validate_quantity
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
# Un renglon no puede traer mas opciones que grupos existentes; el tope corta
# la lista de 500 ids antes de mirar la base.
MAX_OPCIONES_POR_RENGLON = 20


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
        unit_price = Decimal(str(variante.price if variante else product.price))

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
        elegidas = self._opciones(product, raw_item.get("option_ids")) if personalizable else []

        item = OrderItem(
            order=order,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            variant_name=variante.name if variante else None,
            note=self._nota(raw_item.get("note")) or None,
            reference_image=self._foto(raw_item.get("reference_image")) or None,
        )
        for group_name, option_name in elegidas:
            item.options.append(
                OrderItemOption(group_name=group_name, option_name=option_name)
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
        # Un id que no existe y un id de otro producto dan el mismo error a
        # proposito: el mensaje no tiene por que decirle a nadie que ids hay.
        if variante is None or variante.product_id != product.id:
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

    def _opciones(self, product: Product, crudo: object) -> list[tuple[str, str]]:
        """Lo elegido, validado contra los grupos de ESTE producto (ADR-031).

        Es la frontera de la feature: la lista de sabores la arma solo ella, y
        quien compra elige de esa lista. Sin esta validacion, el cliente manda
        el `option_id` de cualquier grupo y el pedido le llega con un relleno
        que esa torta no tiene.
        """
        grupos = {grupo.id: grupo for grupo in product.option_groups}
        elegidas: dict[int, Option] = {}

        for crudo_id in self._lista_de_ids(crudo):
            option_id = saneado.entero(crudo_id, "option_id", minimo=1, maximo=MAX_ID)
            opcion = db.session.get(Option, option_id)
            if opcion is None or opcion.option_group_id not in grupos:
                raise ValidationError(
                    f"Una de las opciones elegidas no es de «{product.name}»."
                )
            if opcion.option_group_id in elegidas:
                nombre = grupos[opcion.option_group_id].name
                raise ValidationError(f"Elegí una sola opción de «{nombre}».")
            elegidas[opcion.option_group_id] = opcion

        self._exigir_los_obligatorios(product, elegidas)
        return [
            (grupos[group_id].name, opcion.name)
            for group_id, opcion in sorted(
                elegidas.items(), key=lambda par: grupos[par[0]].sort_order
            )
        ]

    @staticmethod
    def _exigir_los_obligatorios(product: Product, elegidas: dict[int, Option]) -> None:
        """Una torta sin relleno elegido no es un pedido que ella pueda cumplir."""
        faltan = [
            grupo.name
            for grupo in product.option_groups
            if grupo.required and grupo.id not in elegidas
        ]
        if faltan:
            detalle = ", ".join(faltan)
            raise ValidationError(f"Falta elegir: {detalle}.")

    @staticmethod
    def _lista_de_ids(crudo: object) -> list[object]:
        if crudo is None:
            return []
        if not isinstance(crudo, list):
            raise ValidationError("Las opciones elegidas tienen que venir como lista.")
        if len(crudo) > MAX_OPCIONES_POR_RENGLON:
            raise ValidationError("Hay demasiadas opciones elegidas en un producto.")
        return crudo

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
