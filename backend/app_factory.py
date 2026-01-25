from flask import Flask, jsonify

from .config import Config
from .extensions import db, jwt, mail
from .models import SiteContent, User
from .routes import auth, ingredients, mailer, orders, payments, products, recipes, site, users


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

    app.register_blueprint(auth.bp)
    app.register_blueprint(products.bp)
    app.register_blueprint(orders.bp)
    app.register_blueprint(ingredients.bp)
    app.register_blueprint(users.bp)
    app.register_blueprint(site.bp)
    app.register_blueprint(mailer.bp)
    app.register_blueprint(payments.bp)
    app.register_blueprint(recipes.bp)

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

    with app.app_context():
        db.create_all()
        _ensure_admin(app)
        _ensure_site_content()

    return app


def _ensure_admin(app: Flask) -> None:
    admin_email = app.config["ADMIN_EMAIL"]
    admin = User.query.filter_by(email=admin_email).first()
    if not admin:
        admin = User(
            name=app.config["ADMIN_NAME"],
            email=admin_email,
            is_admin=True,
        )
        admin.set_password(app.config["ADMIN_PASSWORD"])
        db.session.add(admin)
    else:
        admin.is_admin = True
    db.session.commit()


def _ensure_site_content() -> None:
    if not SiteContent.query.get("about"):
        about = SiteContent(
            key="about",
            content=(
                "Somos un emprendimiento familiar que cocina con ingredientes frescos y "
                "recetas con amor de hogar."
            ),
        )
        db.session.add(about)
        db.session.commit()
