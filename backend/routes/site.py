from flask import Blueprint, request

from ..services.site_service import site_service
from .utils import admin_required, json_endpoint


bp = Blueprint("site", __name__, url_prefix="/api/site")


@bp.get("/about")
@json_endpoint
def get_about():
    return site_service.get_about()


@bp.put("/about")
@admin_required
@json_endpoint
def update_about():
    return site_service.update_about(request.get_json(silent=True) or {})
