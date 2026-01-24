from flask import Flask, jsonify

from .config import Config
from .extensions import db, jwt, mail
from .models import User
from .routes import auth, mailer, orders, payments, products


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)

    app.register_blueprint(auth.bp)
    app.register_blueprint(products.bp)
    app.register_blueprint(orders.bp)
    app.register_blueprint(mailer.bp)
    app.register_blueprint(payments.bp)

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "not found"}), 404

    with app.app_context():
        db.create_all()
        _ensure_admin(app)

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
