"""El renglon del pedido guarda el nombre de la variante que se vendio.

Sin FK a `product_variant` a proposito (ADR-029): `Product.variants` tiene
delete-orphan, asi que guardar el producto desde el panel borra las filas
viejas. Una FK desde `order_item` a algo que el panel borra de rutina es una
violacion de integridad esperando el dia en que ella edite una torta que ya
vendio. Y un pedido es historia: si renombra "8 porciones" a "mediana", el
pedido de hoy tiene que seguir diciendo lo que vendio hoy.

Nullable porque los pedidos que ya estan no tienen variante, y porque un
producto sin variantes se sigue pidiendo igual.

Revision ID: 0006
Revises: 0005
"""

from alembic import op
import sqlalchemy as sa


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("order_item") as batch:
        batch.add_column(sa.Column("variant_name", sa.String(length=120), nullable=True))


def downgrade():
    with op.batch_alter_table("order_item") as batch:
        batch.drop_column("variant_name")
