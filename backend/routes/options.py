from flask import Blueprint, request

from ..services.option_service import option_service
from .utils import admin_required, json_endpoint


bp = Blueprint("options", __name__, url_prefix="/api/option-groups")


@bp.get("")
@json_endpoint
def list_option_groups():
    """Publico: la ficha del producto necesita saber que se puede elegir.

    Lo que devuelve son nombres de sabores que ella misma publica en la carta,
    sin nada del esquema (ver `Serializer.option_group`).
    """
    return option_service.list()


@bp.post("")
@admin_required
@json_endpoint
def create_option_group():
    """201 si se creó, 200 si ya existía con ese nombre (ADR-030/031)."""
    payload, creado = option_service.create(request.get_json(silent=True) or {})
    return payload, (201 if creado else 200)


@bp.put("/<int:group_id>")
@admin_required
@json_endpoint
def update_option_group(group_id: int):
    return option_service.update(group_id, request.get_json(silent=True) or {})


@bp.delete("/<int:group_id>")
@admin_required
@json_endpoint
def delete_option_group(group_id: int):
    return option_service.delete(group_id)


@bp.post("/<int:group_id>/options")
@admin_required
@json_endpoint
def create_option(group_id: int):
    payload, creada = option_service.create_option(
        group_id, request.get_json(silent=True) or {}
    )
    return payload, (201 if creada else 200)


@bp.put("/<int:group_id>/options/<int:option_id>")
@admin_required
@json_endpoint
def update_option(group_id: int, option_id: int):
    return option_service.update_option(
        group_id, option_id, request.get_json(silent=True) or {}
    )


@bp.delete("/<int:group_id>/options/<int:option_id>")
@admin_required
@json_endpoint
def delete_option(group_id: int, option_id: int):
    return option_service.delete_option(group_id, option_id)
