from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import SiteContent
from .utils import admin_required


bp = Blueprint("site", __name__, url_prefix="/api/site")


@bp.get("/about")
def get_about():
    content = SiteContent.query.get("about")
    if not content:
        return jsonify({"content": ""})
    return jsonify({"content": content.content})


@bp.put("/about")
@admin_required
def update_about():
    data = request.get_json(silent=True) or {}
    content_text = data.get("content", "")
    content = SiteContent.query.get("about")
    if not content:
        content = SiteContent(key="about", content=content_text)
        db.session.add(content)
    else:
        content.content = content_text
    db.session.commit()
    return jsonify({"status": "updated"})
