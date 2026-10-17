from flask import Blueprint, request

from ..services.tag_service import tag_service
from .utils import admin_required, json_endpoint


bp = Blueprint("tags", __name__, url_prefix="/api/tags")


@bp.get("")
@json_endpoint
def list_tags():
    return tag_service.list()


@bp.post("")
@admin_required
@json_endpoint
def create_tag():
    return tag_service.create(request.get_json(silent=True) or {}), 201


@bp.put("/<int:tag_id>")
@admin_required
@json_endpoint
def update_tag(tag_id: int):
    return tag_service.update(tag_id, request.get_json(silent=True) or {})


@bp.delete("/<int:tag_id>")
@admin_required
@json_endpoint
def delete_tag(tag_id: int):
    return tag_service.delete(tag_id)
