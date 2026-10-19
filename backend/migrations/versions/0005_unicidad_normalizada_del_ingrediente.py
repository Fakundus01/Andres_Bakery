"""El ingrediente gana un nombre normalizado, y es el que la base hace unico.

La unicidad de `name` es por nombre EXACTO, que es justo la que no alcanza:
deja entrar "Coco rallado" y "coco rallado" como dos filas. El servicio ya
comparaba normalizado, pero como `check-then-insert` sin nada que lo
respalde, asi que dos requests casi simultaneos pasaban las dos (lo midio el
reviewer de T6-F20b con 8 hilos: 3 filas).

**El caso con filo es el backfill.** Si la base ya tiene dos filas que
normalizan igual, el indice unico no se puede crear. En vez de fallar a mitad
de camino —o peor, borrar una— se les agrega un sufijo al `normalized_name`
para que convivan, y queda escrito en el log cual fue. Ninguna fila se pierde
y Andrea decide despues cual renombrar o borrar desde el panel.

Revision ID: 0005
Revises: 0004
"""

import logging

from alembic import op
import sqlalchemy as sa

from backend.services.saneado import normalizar_nombre


revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

TOPE = 120


def upgrade():
    with op.batch_alter_table("ingredient") as batch:
        batch.add_column(sa.Column("normalized_name", sa.String(length=TOPE), nullable=True))

    conexion = op.get_bind()
    filas = conexion.execute(sa.text("SELECT id, name FROM ingredient ORDER BY id")).fetchall()

    vistos: dict[str, int] = {}
    for fila in filas:
        normalizado = normalizar_nombre(fila.name, "nombre", tope=TOPE) or f"ingrediente-{fila.id}"
        if normalizado in vistos:
            # Convivir y avisar, nunca borrar en silencio.
            sufijo = 2
            while f"{normalizado} ({sufijo})" in vistos:
                sufijo += 1
            logging.getLogger("alembic").warning(
                "Ingrediente %s (%r) normaliza igual que el %s: queda como %r. "
                "Son duplicados: conviene unificarlos desde el panel.",
                fila.id, fila.name, vistos[normalizado], f"{normalizado} ({sufijo})",
            )
            normalizado = f"{normalizado} ({sufijo})"
        vistos[normalizado] = fila.id
        conexion.execute(
            sa.text("UPDATE ingredient SET normalized_name = :n WHERE id = :i"),
            {"n": normalizado[:TOPE], "i": fila.id},
        )

    with op.batch_alter_table("ingredient") as batch:
        batch.alter_column("normalized_name", existing_type=sa.String(length=TOPE), nullable=False)
        batch.create_unique_constraint("uq_ingredient_normalized_name", ["normalized_name"])


def downgrade():
    with op.batch_alter_table("ingredient") as batch:
        batch.drop_constraint("uq_ingredient_normalized_name", type_="unique")
        batch.drop_column("normalized_name")
