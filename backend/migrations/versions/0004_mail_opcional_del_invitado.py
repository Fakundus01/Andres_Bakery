"""El mail del cliente pasa a opcional: el invitado pide por WhatsApp (F23, ADR-025).

Quien pide sin cuenta deja nombre y telefono, que es el canal por donde se
cierra el pedido. El mail era `nullable=False` porque hasta ahora todo pedido
venia de un usuario registrado, que siempre tiene uno.

SQLite no sabe hacer ALTER COLUMN, asi que va con `batch_alter_table`: Alembic
copia la tabla, la recrea con la columna nueva y mueve las filas.

El `downgrade` es el que tiene filo: volver a NOT NULL con filas sin mail
revienta. Por eso primero les pone un placeholder reconocible en vez de fallar
a mitad de camino y dejar la tabla a medio copiar.

Revision ID: 0004
Revises: 0003
"""

from alembic import op
import sqlalchemy as sa


revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("order_delivery") as batch:
        batch.alter_column(
            "customer_email",
            existing_type=sa.String(length=255),
            nullable=True,
        )


def downgrade():
    op.execute(
        "UPDATE order_delivery SET customer_email = 'sin-mail@pedido-whatsapp.local' "
        "WHERE customer_email IS NULL OR customer_email = ''"
    )
    with op.batch_alter_table("order_delivery") as batch:
        batch.alter_column(
            "customer_email",
            existing_type=sa.String(length=255),
            nullable=False,
        )
