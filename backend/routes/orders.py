from flask import Blueprint, request
from flask_jwt_extended import (  # type: ignore
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)

from ..extensions import db
from ..models import User
from ..services.order_service import order_service
from ..services.rate_limit import (
    TOPES_INTENTOS_PEDIDO,
    TOPES_PEDIDO_CON_CUENTA,
    TOPES_PEDIDO_PUBLICO,
)
from .utils import admin_required, json_endpoint, limitar


bp = Blueprint("orders", __name__, url_prefix="/api/orders")


@bp.post("")
@limitar("pedido_con_cuenta", TOPES_PEDIDO_CON_CUENTA, topes_intentos=TOPES_INTENTOS_PEDIDO)
@jwt_required()
@json_endpoint
def create_order():
    return order_service.create_order(get_jwt_identity(), request.get_json(silent=True) or {}), 201


@bp.post("/whatsapp")
@limitar("pedido_whatsapp", TOPES_PEDIDO_PUBLICO, topes_intentos=TOPES_INTENTOS_PEDIDO)
@json_endpoint
def create_whatsapp_order():
    """Pedido sin cuenta (F23, F31, ADR-025).

    Publica a proposito: el invitado no tiene token. Si viene uno valido, el
    pedido queda atado a esa cuenta y aparece en "mis pedidos"; si viene uno
    vencido, se ignora. Un token viejo en el navegador no puede ser la razon
    de que alguien no pueda comprar.
    """
    return (
        order_service.create_whatsapp_order(
            request.get_json(silent=True) or {},
            user=_usuario_si_hay_token(),
        ),
        201,
    )


@bp.get("")
@jwt_required()
@json_endpoint
def list_orders():
    return order_service.list_orders(get_jwt_identity())


@bp.get("/<int:order_id>")
@jwt_required()
@json_endpoint
def get_order(order_id: int):
    return order_service.get_order(get_jwt_identity(), order_id)


@bp.patch("/<int:order_id>/status")
@admin_required
@json_endpoint
def update_order_status(order_id: int):
    return order_service.update_status(order_id, request.get_json(silent=True) or {})


def _usuario_si_hay_token() -> User | None:
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
    except Exception:
        # `optional=True` deja pasar la falta de token, no uno roto o vencido:
        # eso levanta excepcion y aca no es un error, es un invitado.
        return None
    if not identity:
        return None
    try:
        return db.session.get(User, int(identity))
    except (TypeError, ValueError):
        return None
