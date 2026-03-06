from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request  # type: ignore

from ..models import User
from ..services.exceptions import ServiceError


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Admin privileges required"}), 403
        return fn(*args, **kwargs)

    return wrapper


def json_endpoint(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            if isinstance(result, tuple):
                payload, status = result
            else:
                payload, status = result, 200
            if status == 204:
                return ("", 204)
            return jsonify(payload), status
        except ServiceError as exc:
            return jsonify({"error": exc.message}), exc.status_code

    return wrapper
