"""Visitas agregadas: la tabla page_view (F48, ADR-019).

Una tabla nueva y nada mas: no toca ninguna columna existente, asi que es
reversible sin perder datos de nadie. Lo que se va en el `downgrade` son los
contadores de visitas, que no son datos de personas (ver `security.md` N2).

El indice unico es lo que hace que la cuenta sea un `UPDATE ... + 1` en vez de
una fila por visita: sin el, dos requests simultaneos crean dos filas del mismo
dia y la suma del panel empieza a depender de la suerte.

Revision ID: 0003
Revises: 0002
"""

from alembic import op
import sqlalchemy as sa


revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "page_view",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("path", sa.String(length=120), nullable=False),
        sa.Column("device", sa.String(length=20), nullable=False, server_default="otra"),
        sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("day", "path", "device", name="uq_pageview_dia_ruta_dispositivo"),
    )
    with op.batch_alter_table("page_view", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_page_view_day"), ["day"], unique=False)


def downgrade():
    with op.batch_alter_table("page_view", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_page_view_day"))
    op.drop_table("page_view")
