from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required  # type: ignore

from ..services.payment_service import payment_service
from .utils import json_endpoint


bp = Blueprint("payments", __name__, url_prefix="/api/payments")


@bp.post("/checkout")
@jwt_required()
@json_endpoint
def create_checkout():
    return payment_service.create_checkout(get_jwt_identity(), request.get_json(silent=True) or {})


@bp.post("/intent")
@jwt_required()
@json_endpoint
def create_payment_intent():
    return payment_service.create_checkout(get_jwt_identity(), request.get_json(silent=True) or {})


@bp.post("/webhook")
@json_endpoint
def mercado_pago_webhook():
    return payment_service.process_webhook(request.args, request.get_json(silent=True) or {})
