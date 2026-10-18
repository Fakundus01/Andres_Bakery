from functools import wraps

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request  # type: ignore

from ..models import User
from ..services.exceptions import RateLimitError, ServiceError
from ..services.rate_limit import Tope, limitador


def limitar(ambito: str, topes: tuple[Tope, ...], *, topes_intentos: tuple[Tope, ...] = ()):
    """Tope de requests por IP para esta ruta (D2, ADR-026).

    Va por FUERA de `json_endpoint` para poder contestar con `Retry-After`,
    que `json_endpoint` no sabe poner.

    Con `topes_intentos`, `topes` cuenta **solo lo que salió bien** y los
    intentos fallidos van al tope laxo. Es para el pedido del invitado: con
    todo en la misma cuenta, tres errores de formulario —cambió el barrio,
    puso mal el teléfono— lo dejaban un minuto sin poder comprar, justo al
    cuarto intento, que era el bueno. En el login es al revés y no se usa:
    ahí el intento fallido es exactamente lo que hay que contar.

    `remote_addr` detras de un proxy es el proxy: ver la nota de
    `services/rate_limit.py` antes de desplegar.
    """

    def decorador(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_app.config.get("RATE_LIMIT_ENABLED", True):
                return fn(*args, **kwargs)

            quien = request.remote_addr or "sin-ip"
            clave = f"{ambito}:{quien}"
            try:
                limitador.exigir(clave, topes, anotar=not topes_intentos)
                if topes_intentos:
                    limitador.exigir(f"{ambito}:intento:{quien}", topes_intentos)
            except RateLimitError as exc:
                respuesta = jsonify({"error": exc.message})
                respuesta.status_code = exc.status_code
                respuesta.headers["Retry-After"] = str(exc.espera_segundos)
                return respuesta

            resultado = fn(*args, **kwargs)
            if topes_intentos and _salio_bien(resultado):
                limitador.anotar(clave, topes)
            return resultado

        return wrapper

    return decorador


def _salio_bien(resultado) -> bool:
    estado = 200
    if isinstance(resultado, tuple) and len(resultado) >= 2:
        estado = resultado[1]
    elif hasattr(resultado, "status_code"):
        estado = resultado.status_code
    return isinstance(estado, int) and estado < 400


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
