"""El renglon se personaliza: opciones elegidas, nota y foto de referencia.

Tres cosas, todas del mismo pedido (F58/F59, ADR-031/032):

- `order_item.note`: lo que escribio quien compro sobre como quiere la torta.
  300 caracteres y una sola linea, para que no finja un campo del sistema.
- `order_item.reference_image`: la URL de la foto, **siempre una que emitimos
  nosotros**. La validacion vive en el servicio; la columna solo la guarda.
- `order_item_option`: lo elegido, copiado por nombre y sin FK a `option`, por
  lo mismo que `variant_name` en `0006`.

Y `stored_image`, que es el registro de lo subido: sin el no hay de donde
sacar cuanto espacio se uso (D18) ni que fotos nunca llegaron a un pedido y se
pueden borrar (D17). **Las fotos que ya estan en disco no se registran**: no
se puede saber a que producto pertenecen ni si alguien las usa, y una fila
inventada seria peor que no tenerla. La cuota las cuenta de menos hasta que se
reemplacen.

Revision ID: 0008
Revises: 0007
"""

from alembic import op
import sqlalchemy as sa


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("order_item") as batch:
        batch.add_column(sa.Column("note", sa.String(length=300), nullable=True))
        batch.add_column(sa.Column("reference_image", sa.String(length=500), nullable=True))

    op.create_table(
        "order_item_option",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_item_id", sa.Integer(), nullable=False),
        sa.Column("group_name", sa.String(length=120), nullable=False),
        sa.Column("option_name", sa.String(length=120), nullable=False),
        sa.ForeignKeyConstraint(["order_item_id"], ["order_item.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_order_item_option_order_item_id", "order_item_option", ["order_item_id"]
    )

    op.create_table(
        "stored_image",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=200), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("kind", sa.String(length=20), nullable=False, server_default="product"),
        sa.Column("provisional", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key", name="uq_stored_image_storage_key"),
    )
    op.create_index("ix_stored_image_provisional", "stored_image", ["provisional"])
    op.create_index("ix_stored_image_created_at", "stored_image", ["created_at"])


def downgrade():
    op.drop_index("ix_stored_image_created_at", table_name="stored_image")
    op.drop_index("ix_stored_image_provisional", table_name="stored_image")
    op.drop_table("stored_image")
    op.drop_index("ix_order_item_option_order_item_id", table_name="order_item_option")
    op.drop_table("order_item_option")
    with op.batch_alter_table("order_item") as batch:
        batch.drop_column("reference_image")
        batch.drop_column("note")
