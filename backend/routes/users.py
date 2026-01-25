from flask import Blueprint, jsonify

from ..models import User
from .utils import admin_required


bp = Blueprint("users", __name__, url_prefix="/api/users")


@bp.get("")
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify(
        [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "is_admin": user.is_admin,
                "created_at": user.created_at.isoformat(),
            }
            for user in users
        ]
    )
