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
            "ADMIN_EMAIL": "andreacastilloarraez18@gmail.com",
            "ADMIN_PASSWORD": "admin123",
            "ADMIN_NAME": "Admin",
        }
        base_config.update(overrides)
        return create_app(base_config)

    def test_bootstrap_updates_existing_admin_credentials_and_email(self) -> None:
        first_app = self.create_backend(ADMIN_EMAIL="admin@bakery.local", ADMIN_PASSWORD="legacy-pass", ADMIN_NAME="Legacy")
        with first_app.app_context():
            admin = User.query.filter_by(is_admin=True).first()
            self.assertIsNotNone(admin)
            self.assertEqual(admin.email, "admin@bakery.local")
            self.assertTrue(admin.check_password("legacy-pass"))

        second_app = self.create_backend(
            ADMIN_EMAIL="andreacastilloarraez18@gmail.com",
            ADMIN_PASSWORD="admin123",
            ADMIN_NAME="Andrea",
        )
        with second_app.app_context():
            admins = User.query.filter_by(is_admin=True).all()
            self.assertEqual(len(admins), 1)
            admin = admins[0]
            self.assertEqual(admin.email, "andreacastilloarraez18@gmail.com")
            self.assertEqual(admin.name, "Andrea")
            self.assertTrue(admin.check_password("admin123"))


if __name__ == "__main__":
    unittest.main()
