"""Los sabores elegidos de un renglon: cuales valen, cuales faltan y cuanto suman.

Salio de `renglon_del_pedido.py`, que con el testigo del sabor paso las 300
lineas (R05). Queda junto lo que decide **que sabor se cobra**: la validacion
contra los grupos de ese producto (ADR-031), los obligatorios, y el testigo que
compara lo elegido contra lo que el carrito mostro (ADR-036, review de T20).

El precio nunca sale de aca: `Option.price_delta` se lee de la base y el
testigo solo sirve para cortar el pedido cuando no coincide.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import NamedTuple

from ..extensions import db
from ..models import Option, Product
from .exceptions import ValidationError
from . import saneado


# Mas que esto no es un pedido de una reposteria: es alguien probando.
MAX_ID = 2**31 - 1
# Un renglon no puede traer mas opciones que grupos existentes; el tope corta
# la lista de 500 ids antes de mirar la base.
MAX_OPCIONES_POR_RENGLON = 20
TOPE_NOMBRE_DE_SABOR = 120


class SaborElegido(NamedTuple):
    """Lo que viaja al renglon: los nombres y el recargo, no la fila (ADR-036)."""

    grupo: str
    sabor: str
    recargo: Decimal


class SaboresDelRenglon:
    def elegidos(self, product: Product, crudo: object) -> list[SaborElegido]:
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
            SaborElegido(
                grupo=grupos[group_id].name,
                sabor=opcion.name,
                recargo=Decimal(str(opcion.price_delta or 0)),
            )
            for group_id, opcion in sorted(
                elegidas.items(), key=lambda par: grupos[par[0]].sort_order
            )
        ]

    def exigir_que_sean_los_que_vio(
        self, elegidas: list[SaborElegido], crudo: object
    ) -> None:
        """Los sabores elegidos tienen que ser los que el carrito mostro.

        Mismo testigo que el tamano (ADR-029) y por el mismo caso medido: los
        rowid se reusan, asi que el `option_id` que quedo en el carrito puede
        caer sobre **otro** sabor. El reviewer de T20 compro una torta de
        $14.200 y se le cobro $23.200 porque el id 6 paso a ser "Oro
        comestible +$9.000".

        El precio **sigue saliendo de la base**: lo que viaja es lo que el
        cliente vio, y si no coincide no se cobra otra cosa, se pide elegir de
        nuevo. Sin testigos —un carrito guardado antes de esto— no se valida
        nada, que es lo mismo que hace el tamano.
        """
        vistos = self._testigos(crudo)
        if not vistos:
            return

        por_nombre = {sabor.sabor: sabor for sabor in elegidas}
        for nombre, recargo in vistos:
            sabor = por_nombre.get(nombre)
            if sabor is None or sabor.recargo != recargo:
                raise ValidationError(
                    f"«{nombre}» cambió de precio o de nombre. "
                    "Abrí el producto y elegilo de nuevo, así no te cobramos otra cosa."
                )

    def _testigos(self, crudo: object) -> list[tuple[str, Decimal]]:
        if crudo is None:
            return []
        if not isinstance(crudo, list):
            raise ValidationError("Las opciones elegidas tienen que venir como lista.")
        if len(crudo) > MAX_OPCIONES_POR_RENGLON:
            raise ValidationError("Hay demasiadas opciones elegidas en un producto.")

        testigos: list[tuple[str, Decimal]] = []
        for cruda in crudo:
            if not isinstance(cruda, dict):
                raise ValidationError("Hay una opción mal formada en el pedido.")
            nombre = saneado.texto(cruda.get("name"), "sabor", tope=TOPE_NOMBRE_DE_SABOR)
            if not nombre:
                raise ValidationError("Hay una opción mal formada en el pedido.")
            testigos.append((nombre, self._recargo_visto(cruda.get("price_delta"))))
        return testigos

    @staticmethod
    def _recargo_visto(crudo: object) -> Decimal:
        """Lo que el carrito mostro como recargo. No se cobra: se compara."""
        if crudo in (None, ""):
            return Decimal("0")
        try:
            visto = Decimal(str(crudo))
        except (ArithmeticError, InvalidOperation, TypeError, ValueError):
            raise ValidationError("Hay una opción mal formada en el pedido.") from None
        if not visto.is_finite():
            raise ValidationError("Hay una opción mal formada en el pedido.")
        return visto.quantize(Decimal("0.01"))

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


sabores_del_renglon = SaboresDelRenglon()
