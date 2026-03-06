from flask import Flask, jsonify

from .config import Config
from .extensions import db, jwt, mail
from .routes import auth, ingredients, mailer, orders, payments, products, recipes, site, users
from .services.bootstrap_service import BootstrapService


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
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
        origin = app.config.get("FRONTEND_ORIGIN", "*")
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response

    @app.route("/api/<path:path>", methods=["OPTIONS"])
    def cors_preflight(path):
        return ("", 204)
