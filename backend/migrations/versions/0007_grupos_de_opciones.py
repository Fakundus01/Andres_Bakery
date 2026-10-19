"""Los grupos de opciones y sus sabores (F57, ADR-031).

"Bizcocho" y "Relleno" con su lista, globales como las etiquetas y los
ingredientes, y enganchados a los productos que los usen.

La unicidad del nombre es por el **normalizado** y no por el exacto, igual que
el ingrediente desde `0005` (ADR-030): la exacta deja entrar "Relleno" y
"relleno" como dos grupos. El sabor es unico dentro de su grupo, no en toda la
base: "Chocolate" puede ser bizcocho y relleno a la vez.

Tablas nuevas, nada que migrar: no hay backfill ni caso de choque.

Revision ID: 0007
Revises: 0006
"""

from alembic import op
import sqlalchemy as sa


revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "option_group",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("normalized_name", sa.String(length=120), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("normalized_name", name="uq_option_group_normalized_name"),
    )
    op.create_index(
        "ix_option_group_normalized_name", "option_group", ["normalized_name"]
    )

    op.create_table(
        "option",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("option_group_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("normalized_name", sa.String(length=120), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["option_group_id"], ["option_group.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "option_group_id", "normalized_name", name="uq_option_grupo_normalizado"
        ),
    )
    op.create_index("ix_option_option_group_id", "option", ["option_group_id"])

    op.create_table(
        "product_option_groups",
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("option_group_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["option_group_id"], ["option_group.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
        sa.PrimaryKeyConstraint("product_id", "option_group_id"),
    )


def downgrade():
    op.drop_table("product_option_groups")
    op.drop_index("ix_option_option_group_id", table_name="option")
    op.drop_table("option")
    op.drop_index("ix_option_group_normalized_name", table_name="option_group")
    op.drop_table("option_group")
