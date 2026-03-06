from decimal import Decimal

from flask import Flask, jsonify

from .config import Config
from .extensions import db, jwt, mail
from .models import Product, Recipe, SiteContent, User
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
        _ensure_catalog_seed_data()

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
                "Andres Bakery crea dulces artesanales, cajas para regalar y recetas "
                "caseras con una identidad visual calida, cercana y muy de barrio."
            ),
        )
        db.session.add(about)
        db.session.commit()


def _ensure_catalog_seed_data() -> None:
    if Product.query.count() == 0:
        db.session.add_all(
            [
                Product(
                    name="Box Merienda Villa Maipu",
                    description="Mini torta, cookies de manteca y un blend de te para regalar o compartir.",
                    price=Decimal("18900.00"),
                    category="boxes",
                    image_url="https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1200&q=80",
                    available=True,
                ),
                Product(
                    name="Cheesecake de Frutos Rojos",
                    description="Base crocante, crema suave y terminacion brillante con frutos rojos.",
                    price=Decimal("14200.00"),
                    category="tortas",
                    image_url="https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=80",
                    available=True,
                ),
                Product(
                    name="Cookies New York x6",
                    description="Galletas grandes, centro tierno y chips de chocolate intenso.",
                    price=Decimal("9600.00"),
                    category="cookies",
                    image_url="https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80",
                    available=True,
                ),
                Product(
                    name="Brownie Tentacion",
                    description="Brownie humedo con nueces, salsa de chocolate y terminacion especiada.",
                    price=Decimal("8300.00"),
                    category="brownies",
                    image_url="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80",
                    available=True,
                ),
            ]
        )
        db.session.commit()

    if Recipe.query.count() == 0:
        db.session.add_all(
            [
                Recipe(
                    title="Roll de canela glaseado",
                    summary="Una receta tibia y aromatica para desayunos de fin de semana.",
                    ingredients="Harina, leche, manteca, azucar mascabo, canela y glas.",
                    steps="Mezclar, amasar, dejar levar, enrollar, hornear y glasear.",
                    image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
                    category="brunch",
                    status="published",
                ),
                Recipe(
                    title="Lemon pie cremoso",
                    summary="Acidez justa, merengue sedoso y base que no falla.",
                    ingredients="Harina, manteca, limon, huevos, azucar y leche condensada.",
                    steps="Hacer base, cocinar crema de limon, cubrir con merengue y dorar.",
                    image_url="https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=1200&q=80",
                    category="tartas",
                    status="published",
                ),
                Recipe(
                    title="Budin marmolado de cacao",
                    summary="Ideal para acompanar cafe y sumar una receta noble al recetario.",
                    ingredients="Huevos, harina, azucar, aceite, vainilla y cacao.",
                    steps="Batir, dividir mezcla, marmolar, hornear y dejar enfriar.",
                    image_url="https://images.unsplash.com/photo-1541599188778-cdc73298e8be?auto=format&fit=crop&w=1200&q=80",
                    category="budines",
                    status="published",
                ),
            ]
        )
        db.session.commit()
