from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required  # type: ignore

from ..services.auth_service import auth_service
from .utils import json_endpoint


bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
@json_endpoint
def register():
    return auth_service.register(request.get_json(silent=True) or {}), 201


@bp.post("/login")
@json_endpoint
def login():
    return auth_service.login(request.get_json(silent=True) or {})


@bp.get("/me")
@jwt_required()
@json_endpoint
def me():
    return auth_service.get_profile(get_jwt_identity())
