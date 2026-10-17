from functools import wraps

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request  # type: ignore

from ..models import User
from ..services.exceptions import RateLimitError, ServiceError
from ..services.rate_limit import Tope, limitador


def limitar(ambito: str, topes: tuple[Tope, ...]):
    """Tope de requests por IP para esta ruta (D2, ADR-026).

    Va por FUERA de `json_endpoint` para poder contestar con `Retry-After`,
    que `json_endpoint` no sabe poner.

    `remote_addr` detras de un proxy es el proxy: ver la nota de
    `services/rate_limit.py` antes de desplegar.
    """

    def decorador(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_app.config.get("RATE_LIMIT_ENABLED", True):
                return fn(*args, **kwargs)
            clave = f"{ambito}:{request.remote_addr or 'sin-ip'}"
            try:
                limitador.exigir(clave, topes)
            except RateLimitError as exc:
                respuesta = jsonify({"error": exc.message})
                respuesta.status_code = exc.status_code
                respuesta.headers["Retry-After"] = str(exc.espera_segundos)
                return respuesta
            return fn(*args, **kwargs)

        return wrapper

    return decorador


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
