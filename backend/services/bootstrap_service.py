from __future__ import annotations

from decimal import Decimal
from typing import Mapping

from ..extensions import db
from ..models import Product, SiteContent, User


class BootstrapService:
    def __init__(self, config: Mapping[str, object]) -> None:
        self.config = config
        self.warnings: list[str] = []

    def bootstrap(self) -> list[str]:
        """Devuelve los avisos que el humano tiene que leer al arrancar."""
        self.warnings = []
        if not self.config.get("JWT_SECRET_FROM_ENV", True):
            self.warnings.append(
                "JWT_SECRET_KEY no esta en el entorno: se usa una al azar y cada "
                "reinicio cierra las sesiones abiertas. Cargala en backend/.env."
            )
        self.ensure_admin()
        self.ensure_site_content()
        self.ensure_catalog_seed_data()
        return self.warnings

    def ensure_admin(self) -> None:
        admin_email = str(self.config.get("ADMIN_EMAIL") or "").strip().lower()
        admin_password = str(self.config.get("ADMIN_PASSWORD") or "")
        admin_name = str(self.config.get("ADMIN_NAME") or "Admin")

        if not admin_email:
            self.warnings.append(
                "No hay admin: falta ADMIN_EMAIL en backend/.env. El panel queda "
                "sin dueno a proposito, antes que con una clave que esta en el repo."
            )
            return

        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            admin = User.query.filter_by(is_admin=True).order_by(User.id.asc()).first()

        if not admin:
            if not admin_password:
                self.warnings.append(
                    f"No se creo el admin {admin_email}: falta ADMIN_PASSWORD en backend/.env."
                )
                return
            admin = User(name=admin_name, email=admin_email, is_admin=True)
            admin.set_password(admin_password)
            db.session.add(admin)
        elif self.config.get("ADMIN_PASSWORD_RESET") and admin_password:
            # Rotacion explicita y de una sola vez: arrancar la app no puede
            # devolverle al admin la clave del archivo (D13).
            admin.set_password(admin_password)
            self.warnings.append(
                "ADMIN_PASSWORD_RESET estaba en true: se reescribio la clave del "
                "admin. Volvelo a false para que el proximo arranque no la pise."
            )

        admin.name = admin_name
        admin.email = admin_email
        admin.is_admin = True
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
        """Semilla de muestra para una base vacia.

        Es contenido inventado, de relleno: no es la carta de Andrea. Las
        etiquetas (sin TACC, vegano) **no se siembran** a proposito: son su
        declaracion y las crea ella desde el panel.
        """
        if Product.query.count() > 0:
            return

        db.session.add_all(
            [
                Product(
                    name="Box Merienda Villa Maipu",
                    slug="box-merienda-villa-maipu",
                    description="Mini torta, cookies de manteca y un blend de te para regalar o compartir.",
                    price=Decimal("18900.00"),
                    unit_label="box",
                    category="boxes",
                    image_url="https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1200&q=80",
                    available=True,
                ),
                Product(
                    name="Cheesecake de Frutos Rojos",
                    slug="cheesecake-de-frutos-rojos",
                    description="Base crocante, crema suave y terminacion brillante con frutos rojos.",
                    price=Decimal("14200.00"),
                    unit_label="torta",
                    prep_note="Se encarga con 48 horas de anticipacion.",
                    category="tortas",
                    image_url="https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=80",
                    available=True,
                ),
                Product(
                    name="Cookies New York",
                    slug="cookies-new-york",
                    description="Galletas grandes, centro tierno y chips de chocolate intenso.",
                    price=Decimal("1600.00"),
                    unit_label="unidad",
                    min_qty=6,
                    qty_step=6,
                    category="cookies",
                    image_url="https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80",
                    available=True,
                ),
                Product(
                    name="Brownie Tentacion",
                    slug="brownie-tentacion",
                    description="Brownie humedo con nueces, salsa de chocolate y terminacion especiada.",
                    steps=(
                        "1. Derretir el chocolate con la manteca a bano maria.\n"
                        "2. Batir los huevos con el azucar hasta que blanqueen.\n"
                        "3. Unir las dos mezclas e incorporar la harina tamizada.\n"
                        "4. Hornear 25 minutos a 180 grados y dejar enfriar antes de cortar."
                    ),
                    price=Decimal("2100.00"),
                    unit_label="unidad",
                    min_qty=6,
                    qty_step=6,
                    category="brownies",
                    image_url="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80",
                    available=True,
                ),
            ]
        )
        db.session.commit()
