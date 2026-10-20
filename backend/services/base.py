from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, TypeVar

from ..extensions import db
from .exceptions import NotFoundError, ValidationError


ModelType = TypeVar("ModelType")

# El tope de la columna: `Numeric(10, 2)` son 8 digitos enteros. Un peso mas
# que esto no es una torta, es un dedo apoyado en el teclado.
MAX_IMPORTE = Decimal("99999999.99")


class ServiceBase:
    @staticmethod
    def parse_identity(value: int | str | None) -> int:
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError("invalid user identity") from exc

    @staticmethod
    def parse_int(value: Any, field_name: str) -> int:
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise ValidationError(f"{field_name} must be an integer") from exc

    @staticmethod
    def parse_decimal(value: Any, field_name: str) -> Decimal:
        """Un Decimal de verdad: finito y dentro de lo que la columna aguanta.

        `Decimal("NaN")` y `Decimal("1e400")` son validos para Python, y los
        dos llegaban a la base. El primero reventaba el `NOT NULL` y salia
        **500 con HTML**; el segundo entraba, el serializer lo pasaba a
        `float` —`inf`— y `GET /api/products` devolvia `"price":Infinity`, que
        **no es JSON valido**: la carta, la portada y la ficha quedaban en
        blanco para todos los visitantes, con un solo PUT del panel. Lo midio
        el reviewer de T4-F19b.
        """
        try:
            numero = Decimal(str(value))
        except (ArithmeticError, InvalidOperation, TypeError, ValueError) as exc:
            raise ValidationError(f"{field_name} must be a valid number") from exc

        if not numero.is_finite():
            raise ValidationError(f"{field_name} must be a valid number")
        if abs(numero) > MAX_IMPORTE:
            # El tope se escribe como se escribe la plata aca: miles con
            # punto y decimales con coma. Antes salia redondeado a
            # "100.000.000", que **no es el tope** y manda a probar un numero
            # que tampoco entra (lo midio el reviewer de T20).
            tope = f"{MAX_IMPORTE:,.2f}".translate(str.maketrans(",.", ".,"))
            raise ValidationError(f"{field_name} no puede pasar de {tope}")
        return numero

    @staticmethod
    def require_entity(model: type[ModelType], entity_id: Any, label: str) -> ModelType:
        entity = db.session.get(model, entity_id)
        if not entity:
            raise NotFoundError(f"{label} not found")
        return entity
