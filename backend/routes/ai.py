from flask import Blueprint, request

from ..services.ai_service import recipe_draft_service
from .utils import admin_required, json_endpoint


bp = Blueprint("ai", __name__, url_prefix="/api/ai")


@bp.post("/recipe-draft")
@admin_required
@json_endpoint
def recipe_draft():
    """Borrador de receta a partir de una foto ya subida (F46, ADR-020).

    Solo admin: cuesta plata por llamada. Apagado responde 503 con el motivo.
    """
    return recipe_draft_service.draft(request.get_json(silent=True) or {})
