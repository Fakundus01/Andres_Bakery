from flask import Blueprint, request

from ..services.contact_service import contact_service
from ..services.rate_limit import TOPES_CONTACTO
from .utils import json_endpoint, limitar


bp = Blueprint("mailer", __name__, url_prefix="/api/contact")


@bp.post("")
@limitar("contacto", TOPES_CONTACTO)
@json_endpoint
def send_contact():
    return contact_service.send(request.get_json(silent=True) or {})
