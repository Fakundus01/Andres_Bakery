from flask import Blueprint, request

from ..services.profile_service import profile_service
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


@bp.get("/delivery")
@json_endpoint
def get_delivery():
    return site_service.get_delivery()


@bp.get("/profile")
@json_endpoint
def get_profile():
    return profile_service.get_profile()


@bp.put("/profile")
@admin_required
@json_endpoint
def update_profile():
    return profile_service.update_profile(request.get_json(silent=True) or {})
