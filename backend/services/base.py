from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, TypeVar

from ..extensions import db
from .exceptions import NotFoundError, ValidationError


ModelType = TypeVar("ModelType")


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
        try:
            return Decimal(str(value))
        except (ArithmeticError, InvalidOperation, TypeError, ValueError) as exc:
            raise ValidationError(f"{field_name} must be a valid number") from exc

    @staticmethod
    def require_entity(model: type[ModelType], entity_id: Any, label: str) -> ModelType:
        entity = db.session.get(model, entity_id)
        if not entity:
            raise NotFoundError(f"{label} not found")
        return entity
