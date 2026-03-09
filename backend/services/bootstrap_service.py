from __future__ import annotations

from decimal import Decimal
from typing import Mapping

from ..extensions import db
from ..models import Product, Recipe, SiteContent, User


class BootstrapService:
    def __init__(self, config: Mapping[str, object]) -> None:
        self.config = config

    def bootstrap(self) -> None:
        self.ensure_admin()
        self.ensure_site_content()
        self.ensure_catalog_seed_data()

    def ensure_admin(self) -> None:
        admin_email = str(self.config["ADMIN_EMAIL"]).strip().lower()
        admin_password = str(self.config["ADMIN_PASSWORD"])
        admin_name = str(self.config["ADMIN_NAME"])

        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            admin = User.query.filter_by(is_admin=True).order_by(User.id.asc()).first()

        if not admin:
            admin = User(
                name=admin_name,
                email=admin_email,
                is_admin=True,
            )
            db.session.add(admin)

        admin.name = admin_name
        admin.email = admin_email
        admin.is_admin = True
        admin.set_password(admin_password)
        db.session.commit()

    def ensure_site_content(self) -> None:
        if not db.session.get(SiteContent, "about"):
            db.session.add(
                SiteContent(
                    key="about",
                    content=(
                        "Andres Bakery crea dulces artesanales, cajas para regalar y recetas "
                        "caseras con una identidad visual cálida, cercana y muy de barrio."
                    ),
                )
            )
            db.session.commit()

    def ensure_catalog_seed_data(self) -> None:
        if Product.query.count() == 0:
            db.session.add_all(
                [
                    Product(
                        name="Box Merienda Villa Maipú",
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
