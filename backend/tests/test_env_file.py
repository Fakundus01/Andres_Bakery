from __future__ import annotations

import os
from pathlib import Path
import tempfile
import unittest

from backend.env_file import load_env_file, parse_env


class ParseEnvTestCase(unittest.TestCase):
    def test_ignores_comments_and_blank_lines(self) -> None:
        self.assertEqual(parse_env("\n# un comentario\n\nKEY=value\n"), {"KEY": "value"})

    def test_keeps_the_equals_sign_inside_the_value(self) -> None:
        # Las URLs de base y los secretos en base64 traen '=' en el medio.
        self.assertEqual(
            parse_env("DATABASE_URL=sqlite:///a.db?cache=shared"),
            {"DATABASE_URL": "sqlite:///a.db?cache=shared"},
        )

    def test_quoted_value_keeps_the_hash(self) -> None:
        self.assertEqual(parse_env('ADDRESS="Calle 123 # 4"'), {"ADDRESS": "Calle 123 # 4"})

    def test_unquoted_value_drops_the_trailing_comment(self) -> None:
        self.assertEqual(parse_env("FEE=2500 # en pesos"), {"FEE": "2500"})

    def test_accepts_the_export_prefix(self) -> None:
        self.assertEqual(parse_env("export KEY=value"), {"KEY": "value"})

    def test_line_without_equals_is_not_a_variable(self) -> None:
        self.assertEqual(parse_env("esto no es una asignacion"), {})


class LoadEnvFileTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.env_path = Path(self.directory.name) / ".env"

    def forget(self, *keys: str) -> None:
        for key in keys:
            self.addCleanup(os.environ.pop, key, None)

    def test_missing_file_is_not_an_error(self) -> None:
        self.assertEqual(load_env_file(Path(self.directory.name) / "no-existe"), [])

    def test_loads_the_keys_that_were_missing(self) -> None:
        self.env_path.write_text("BAKERY_TEST_A=uno\nBAKERY_TEST_B=dos\n", encoding="utf-8")
        self.forget("BAKERY_TEST_A", "BAKERY_TEST_B")

        loaded = load_env_file(self.env_path)

        self.assertEqual(sorted(loaded), ["BAKERY_TEST_A", "BAKERY_TEST_B"])
        self.assertEqual(os.environ["BAKERY_TEST_A"], "uno")

    def test_does_not_overwrite_what_the_environment_already_said(self) -> None:
        # El deploy y la terminal mandan: un .env del repo no los pisa.
        self.env_path.write_text("BAKERY_TEST_C=del-archivo\n", encoding="utf-8")
        self.forget("BAKERY_TEST_C")
        os.environ["BAKERY_TEST_C"] = "del-entorno"

        loaded = load_env_file(self.env_path)

        self.assertEqual(loaded, [])
        self.assertEqual(os.environ["BAKERY_TEST_C"], "del-entorno")


if __name__ == "__main__":
    unittest.main()
