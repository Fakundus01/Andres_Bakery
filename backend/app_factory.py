from flask import Flask, jsonify, request
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError

from .config import Config
from .extensions import db, jwt, mail, migrate
from .routes import (
    ai,
    auth,
    ingredients,
    mailer,
    metrics,
    options,
    orders,
    payments,
    products,
    site,
    tags,
    uploads,
    users,
)
from .services.bootstrap_service import BootstrapService


def create_app(config_overrides: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)
    app.json.ensure_ascii = False

    _init_extensions(app)
    _register_blueprints(app)
    _register_http_handlers(app)

    with app.app_context():
        warnings = _prepare_database(app)

    if not app.config.get("TESTING"):
        for warning in warnings:
            app.logger.warning(warning)

    return app


UPGRADE_HINT = (
    "Corre: backend/.venv/Scripts/python.exe -m flask --app backend.app db upgrade"
)


def _prepare_database(app: Flask) -> list[str]:
    """El esquema lo manejan las migraciones (ADR-010); create_all es de tests.

    Si la base esta atrasada respecto del modelo, arrancar no puede explotar:
    es justo el estado en el que queda cualquiera que hace `git pull` antes de
    migrar. Se avisa y la app levanta igual para que `flask db upgrade` corra.
    """
    if app.config.get("TESTING"):
        db.create_all()

    if not inspect(db.engine).has_table("user"):
        return [f"La base no tiene tablas todavia. {UPGRADE_HINT}"]

    try:
        return BootstrapService(app.config).bootstrap()
    except OperationalError as exc:
        db.session.rollback()
        return [f"La base no esta al dia con el modelo ({exc.orig}). {UPGRADE_HINT}"]


def _init_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db, directory="backend/migrations")
    jwt.init_app(app)
    mail.init_app(app)


def _register_blueprints(app: Flask) -> None:
    app.register_blueprint(auth.bp)
    app.register_blueprint(products.bp)
    app.register_blueprint(orders.bp)
    app.register_blueprint(ingredients.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(site.bp)
    app.register_blueprint(mailer.bp)
    app.register_blueprint(payments.bp)
    app.register_blueprint(tags.bp)
    app.register_blueprint(options.bp)
    app.register_blueprint(uploads.bp)
    app.register_blueprint(metrics.bp)
    app.register_blueprint(ai.bp)


def _register_http_handlers(app: Flask) -> None:
    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "not found"}), 404

    @app.errorhandler(413)
    def payload_too_large(error):
        """El tope de Flask corta antes de que el archivo llegue al servicio.

        Sin esto el cliente recibe el HTML de error de Werkzeug, que el front
        no sabe leer. Con esto recibe el mismo {"error": ...} que todo el resto.

        El numero que se nombra es el de **la ruta que se llamo**: decirle
        "mas de 4 MB" a quien sube por la ruta publica, cuyo tope son 2, es
        mandarlo a adivinar (lo marco el reviewer de T18).
        """
        if request.path == "/api/uploads/referencia":
            tope = min(
                int(app.config.get("REFERENCE_UPLOAD_MAX_BYTES") or 0) or float("inf"),
                int(app.config.get("UPLOAD_MAX_BYTES") or 0) or float("inf"),
            )
        else:
            tope = int(app.config.get("UPLOAD_MAX_BYTES", 0))
        megas = (tope if tope != float("inf") else 0) / (1024 * 1024)
        return jsonify({"error": f"El archivo pesa mas de {megas:.0f} MB."}), 413

    @app.after_request
    def add_security_headers(response):
        """Entraron con la subida de archivos (ADR-018, cierra D3).

        Desde que el back sirve archivos que subio una persona, estos headers
        dejan de ser hardening: son parte del control. CORP va en cross-origin
        a proposito — el front corre en otro origen y tiene que poder mostrar
        las fotos; lo que no queremos es que alguien las lea como otra cosa.
        """
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "cross-origin")
        # El back sirve JSON e imagenes, nunca HTML con scripts: la CSP mas
        # restrictiva que existe le alcanza.
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'",
        )
        return response

    @app.after_request
    def add_cors_headers(response):
        origin = _resolve_cors_origin(app)
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            if origin != "*":
                response.headers["Vary"] = "Origin"
        return response

    @app.route("/api/<path:path>", methods=["OPTIONS"])
    def cors_preflight(path):
        return ("", 204)


def _resolve_cors_origin(app: Flask) -> str | None:
    request_origin = request.headers.get("Origin")
    allowed_origins = app.config.get("FRONTEND_ORIGINS") or []

    if not isinstance(allowed_origins, list):
        raw_value = str(app.config.get("FRONTEND_ORIGIN", "*")).strip()
        if raw_value == "*":
            allowed_origins = ["*"]
        else:
            allowed_origins = [origin.strip() for origin in raw_value.split(",") if origin.strip()]

    if "*" in allowed_origins:
        return "*"
    if request_origin and request_origin in allowed_origins:
        return request_origin
    if not request_origin and allowed_origins:
        return allowed_origins[0]
    return None
