from flask import Blueprint, request

from ..routes.utils import admin_required, json_endpoint
from ..services.metrics_service import metrics_service


bp = Blueprint("metrics", __name__, url_prefix="/api/metrics")


@bp.post("/view")
@json_endpoint
def registrar_visita():
    """Cuenta una visita. Sin auth, sin cookie y sin guardar IP (ADR-019).

    Devuelve 204 incluso si la ruta no se reconoce: el contador no es una razon
    para que al visitante le aparezca un error.
    """
    metrics_service.registrar_visita(request.get_json(silent=True) or {})
    return None, 204


@bp.get("/summary")
@admin_required
@json_endpoint
def resumen():
    return metrics_service.resumen(request.args.get("days", type=int))
