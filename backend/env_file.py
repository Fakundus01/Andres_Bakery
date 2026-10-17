"""Lector de .env sin dependencias nuevas (ADR-015).

Hasta ahora `backend/.env` era un archivo decorativo: nadie lo leia, y el back
corria con los defaults de `config.py` (D12). Esto lo carga a `os.environ`
antes de que `Config` evalue sus `os.getenv`.

Regla: lo que ya esta en el entorno gana. Un .env del repo no pisa lo que puso
el deploy ni lo que exportaste en la terminal para una corrida puntual.
"""

from __future__ import annotations

import os
from pathlib import Path


def parse_env(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, _, value = line.partition("=")
        key = key.strip()
        if key.startswith("export "):
            key = key[len("export "):].strip()
        if not key:
            continue

        values[key] = _clean_value(value.strip())
    return values


def _clean_value(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    # Un '#' con espacio delante es comentario al final de la linea. Un valor
    # que necesita el '#' de verdad (una direccion, por ejemplo) va entre comillas.
    return value.split(" #")[0].strip()


def load_env_file(path: str | Path) -> list[str]:
    """Carga las claves que falten y devuelve cuales fueron."""
    env_file = Path(path)
    if not env_file.is_file():
        return []

    loaded: list[str] = []
    for key, value in parse_env(env_file.read_text(encoding="utf-8-sig")).items():
        if key in os.environ:
            continue
        os.environ[key] = value
        loaded.append(key)
    return loaded
