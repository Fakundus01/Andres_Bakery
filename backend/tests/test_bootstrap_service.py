from __future__ import annotations

from pathlib import Path
import unittest
from uuid import uuid4

from backend.app_factory import create_app
from backend.models import User


class BootstrapServiceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        tmp_root = Path(__file__).resolve().parent / ".tmp"
        tmp_root.mkdir(parents=True, exist_ok=True)
        self.database_path = tmp_root / f"bootstrap-{uuid4().hex}.db"

    def create_backend(self, **overrides):
        base_config = {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{self.database_path.resolve().as_posix()}",
            "JWT_SECRET_KEY": "test-secret",
            "MAIL_SERVER": None,
            "FRONTEND_ORIGIN": "http://localhost:5173",
            "ADMIN_EMAIL": "admin@bakery.local",
            "ADMIN_PASSWORD": "primera-clave",
            "ADMIN_NAME": "Admin",
            "ADMIN_PASSWORD_RESET": False,
        }
        base_config.update(overrides)
        return create_app(base_config)

    def test_first_boot_creates_the_admin_with_the_configured_password(self) -> None:
        app = self.create_backend()
        with app.app_context():
            admin = User.query.filter_by(is_admin=True).first()
            self.assertIsNotNone(admin)
            self.assertEqual(admin.email, "admin@bakery.local")
            self.assertTrue(admin.check_password("primera-clave"))

    def test_second_boot_does_not_rewrite_the_password(self) -> None:
        # D13: arrancar la app no puede devolverle al admin la clave del .env.
        # Si Andrea la cambio, la suya gana.
        self.create_backend()
        app = self.create_backend(ADMIN_PASSWORD="la-del-archivo")
        with app.app_context():
            admins = User.query.filter_by(is_admin=True).all()
            self.assertEqual(len(admins), 1)
            self.assertTrue(admins[0].check_password("primera-clave"))
            self.assertFalse(admins[0].check_password("la-del-archivo"))

    def test_reset_flag_rewrites_the_password_once_asked(self) -> None:
        self.create_backend()
        app = self.create_backend(ADMIN_PASSWORD="clave-rotada", ADMIN_PASSWORD_RESET=True)
        with app.app_context():
            admin = User.query.filter_by(is_admin=True).first()
            self.assertTrue(admin.check_password("clave-rotada"))

    def test_without_admin_email_nothing_is_created(self) -> None:
        # Sin ADMIN_EMAIL no se inventa un admin: el repo es publico y un
        # default en el codigo es una puerta abierta el dia del deploy.
        app = self.create_backend(ADMIN_EMAIL="", ADMIN_PASSWORD="")
        with app.app_context():
            self.assertEqual(User.query.count(), 0)

    def test_existing_admin_keeps_being_admin_and_follows_the_email(self) -> None:
        self.create_backend()
        app = self.create_backend(ADMIN_EMAIL="andrea@bakery.local", ADMIN_NAME="Andrea")
        with app.app_context():
            admins = User.query.filter_by(is_admin=True).all()
            self.assertEqual(len(admins), 1)
            self.assertEqual(admins[0].email, "andrea@bakery.local")
            self.assertEqual(admins[0].name, "Andrea")


if __name__ == "__main__":
    unittest.main()
