import os

# Los tests no leen backend/.env: si lo leyeran, pasarian o fallarian segun
# lo que cada maquina tenga cargado. Cada test declara su propia config.
os.environ.setdefault("ENV_FILE", "backend/tests/.sin-env-file")
