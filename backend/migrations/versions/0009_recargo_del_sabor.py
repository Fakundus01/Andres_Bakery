"""El sabor puede costar mas, y el pedido guarda lo que cobro (F61, ADR-036).

Dos columnas y la misma forma en las dos:

- `option.price_delta`: lo que ese sabor le suma al precio del tamano. La
  restriccion de que sea >= 0 vive en el servicio y no en la base, igual que
  la del precio de la variante: el mensaje tiene que salir en castellano por
  la API y no como un IntegrityError.
- `order_item_option.price_delta`: lo que ese sabor sumo **en ese pedido**.
  Copiado, como el nombre (`0008`): cambiar el recargo en marzo no puede
  cambiar lo que dice el pedido de enero.

`server_default="0"` no es decoracion: sin el, agregar una columna NOT NULL a
una tabla con filas falla, y aca hay sabores y pedidos cargados. Queda puesto
despues del backfill tambien, porque es el default honesto de la columna: un
sabor nuevo no cuesta mas que los otros.

Revision ID: 0009
Revises: 0008
"""

from alembic import op
import sqlalchemy as sa


revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    # `batch_alter_table` porque SQLite no sabe ALTER COLUMN y recrea la
    # tabla: es lo que `render_as_batch=True` ya configura en extensions.py.
    with op.batch_alter_table("option") as batch:
        batch.add_column(
            sa.Column(
                "price_delta",
                sa.Numeric(precision=10, scale=2),
                nullable=False,
                server_default="0",
            )
        )
    with op.batch_alter_table("order_item_option") as batch:
        batch.add_column(
            sa.Column(
                "price_delta",
                sa.Numeric(precision=10, scale=2),
                nullable=False,
                server_default="0",
            )
        )


def downgrade():
    """Ojo: esto **borra los recargos**, no los guarda en ningun lado.

    Volver a `0008` por cualquier razon hace que la web empiece a cobrar de
    menos sin un solo error en los logs, y recuperarlos es cargarlos a mano.
    Anotalos antes de bajar (`select name, price_delta from option`).
    """
    with op.batch_alter_table("order_item_option") as batch:
        batch.drop_column("price_delta")
    with op.batch_alter_table("option") as batch:
        batch.drop_column("price_delta")
