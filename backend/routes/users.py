from flask import Blueprint

from ..services.auth_service import auth_service
from .utils import admin_required, json_endpoint


bp = Blueprint("users", __name__, url_prefix="/api/users")


@bp.get("")
@admin_required
@json_endpoint
def list_users():
    return auth_service.list_users()
