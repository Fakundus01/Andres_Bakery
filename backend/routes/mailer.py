from flask import Blueprint, request

from ..services.contact_service import contact_service
from .utils import json_endpoint


bp = Blueprint("mailer", __name__, url_prefix="/api/contact")


@bp.post("")
@json_endpoint
def send_contact():
    return contact_service.send(request.get_json(silent=True) or {})
