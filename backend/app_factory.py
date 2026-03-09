from flask import Flask, jsonify, request

from .config import Config
from .extensions import db, jwt, mail
from .routes import auth, ingredients, mailer, orders, payments, products, recipes, site, users
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
        db.create_all()
        BootstrapService(app.config).bootstrap()

    return app


def _init_extensions(app: Flask) -> None:
    db.init_app(app)
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
    app.register_blueprint(recipes.bp)


def _register_http_handlers(app: Flask) -> None:
    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "not found"}), 404

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
