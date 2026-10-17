"""T3: Product absorbe la receta, etiquetas, variantes y venta por unidad.

Autogenerada y despues editada a mano, por tres motivos:

1. Las columnas nuevas que son NOT NULL necesitan `server_default`, porque la
   tabla ya tiene filas.
2. `product.slug` entra como nullable, se rellena, y recien despues pasa a
   NOT NULL UNIQUE. Al reves falla en cuanto hay un producto cargado.
3. Las recetas no se tiran: antes de borrar la tabla, cada una pasa a ser un
   `Product` no disponible y con precio 0, y su texto de ingredientes se parte
   en filas de `Ingredient`. Lo que no parece un ingrediente se guarda en la
   descripcion (ADR-001).

`slugify` esta duplicado de `backend/services/slug.py` a proposito: una
migracion es una foto y no puede depender de codigo que despues cambia.

Revision ID: 0002
Revises: 0001
"""

import re
import unicodedata

from alembic import op
import sqlalchemy as sa


revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

# Mas largo que esto no es el nombre de un ingrediente, es una frase.
MAX_INGREDIENT_LENGTH = 60


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text or ""))
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", without_accents.lower()).strip("-")


def upgrade():
    op.create_table(
        "tag",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("color_token", sa.String(length=40), nullable=False, server_default="acento"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "product_tags",
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["tag.id"]),
        sa.PrimaryKeyConstraint("product_id", "tag_id"),
    )
    op.create_table(
        "product_variant",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    with op.batch_alter_table("product", schema=None) as batch_op:
        batch_op.add_column(sa.Column("slug", sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column("steps", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("prep_note", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column("unit_label", sa.String(length=40), nullable=False, server_default="unidad")
        )
        batch_op.add_column(sa.Column("min_qty", sa.Integer(), nullable=False, server_default="1"))
        batch_op.add_column(sa.Column("qty_step", sa.Integer(), nullable=False, server_default="1"))
        batch_op.add_column(
            sa.Column("allows_pickup", sa.Boolean(), nullable=False, server_default=sa.true())
        )
        batch_op.add_column(
            sa.Column("allows_delivery", sa.Boolean(), nullable=False, server_default=sa.true())
        )

    connection = op.get_bind()
    _fill_product_slugs(connection)
    _move_recipes_into_products(connection)

    with op.batch_alter_table("product", schema=None) as batch_op:
        batch_op.alter_column("slug", existing_type=sa.String(length=160), nullable=False)
        batch_op.create_unique_constraint("uq_product_slug", ["slug"])

    op.drop_table("recipe")

    with op.batch_alter_table("order", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("channel", sa.String(length=30), nullable=False, server_default="mercado_pago")
        )
        # Opcional para que el invitado pueda pedir sin cuenta (ADR-012).
        batch_op.alter_column("user_id", existing_type=sa.INTEGER(), nullable=True)


def _taken_slugs(connection) -> set:
    rows = connection.execute(sa.text("SELECT slug FROM product WHERE slug IS NOT NULL"))
    return {row[0] for row in rows}


def _free_slug(base: str, taken: set) -> str:
    candidate = base or "producto"
    attempt = 1
    while candidate in taken:
        attempt += 1
        candidate = f"{base or 'producto'}-{attempt}"
    taken.add(candidate)
    return candidate


def _fill_product_slugs(connection) -> None:
    taken = _taken_slugs(connection)
    rows = connection.execute(
        sa.text("SELECT id, name FROM product WHERE slug IS NULL ORDER BY id")
    ).fetchall()
    for product_id, name in rows:
        connection.execute(
            sa.text("UPDATE product SET slug = :slug WHERE id = :id"),
            {"slug": _free_slug(slugify(name), taken), "id": product_id},
        )


def split_ingredients(text: str):
    """Devuelve (ingredientes, lo que no se pudo mapear)."""
    pieces = re.split(r"[,\n;]| y ", str(text or ""))
    names = []
    leftovers = []
    for piece in pieces:
        cleaned = piece.strip().strip(".").strip()
        if not cleaned:
            continue
        if len(cleaned) > MAX_INGREDIENT_LENGTH:
            leftovers.append(cleaned)
        else:
            names.append(cleaned[0].upper() + cleaned[1:])
    return names, leftovers


def _ingredient_id(connection, name: str) -> int:
    lookup = sa.text("SELECT id FROM ingredient WHERE lower(name) = lower(:name)")
    existing = connection.execute(lookup, {"name": name}).fetchone()
    if existing:
        return existing[0]
    connection.execute(sa.text("INSERT INTO ingredient (name) VALUES (:name)"), {"name": name})
    return connection.execute(lookup, {"name": name}).fetchone()[0]


def _move_recipes_into_products(connection) -> None:
    recipes = connection.execute(
        sa.text(
            "SELECT id, title, summary, ingredients, steps, image_url, category"
            " FROM recipe ORDER BY id"
        )
    ).fetchall()
    if not recipes:
        return

    taken = _taken_slugs(connection)
    insert_product = sa.text(
        "INSERT INTO product (name, slug, description, steps, price, unit_label, min_qty,"
        " qty_step, category, image_url, available, allows_pickup, allows_delivery)"
        " VALUES (:name, :slug, :description, :steps, 0, 'unidad', 1, 1, :category,"
        " :image_url, :available, :allows_pickup, :allows_delivery)"
    )
    insert_link = sa.text(
        "INSERT INTO product_ingredients (product_id, ingredient_id)"
        " VALUES (:product_id, :ingredient_id)"
    )

    for _, title, summary, ingredients_text, steps, image_url, category in recipes:
        names, leftovers = split_ingredients(ingredients_text)
        description = (summary or "").strip()
        if leftovers:
            description = "\n\n".join(
                part for part in [description, "Ingredientes: " + "; ".join(leftovers)] if part
            )

        # Precio 0 y no disponible: nadie puede comprarla hasta que Andrea le
        # ponga precio desde el panel. Visible solo para ella.
        connection.execute(
            insert_product,
            {
                "name": title,
                "slug": _free_slug(slugify(title), taken),
                "description": description or None,
                "steps": (steps or "").strip() or None,
                "category": category or "general",
                "image_url": image_url,
                "available": False,
                "allows_pickup": True,
                "allows_delivery": True,
            },
        )
        product_id = connection.execute(
            sa.text("SELECT id FROM product ORDER BY id DESC LIMIT 1")
        ).fetchone()[0]

        for name in names:
            connection.execute(
                insert_link,
                {"product_id": product_id, "ingredient_id": _ingredient_id(connection, name)},
            )


def downgrade():
    """Vuelve al esquema de 0001.

    Las recetas migradas quedan como productos: despues de 0002 no hay forma
    de saber cual era receta y cual producto de verdad.
    """
    with op.batch_alter_table("order", schema=None) as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.INTEGER(), nullable=False)
        batch_op.drop_column("channel")

    op.create_table(
        "recipe",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("ingredients", sa.Text(), nullable=False),
        sa.Column("steps", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    with op.batch_alter_table("product", schema=None) as batch_op:
        batch_op.drop_constraint("uq_product_slug", type_="unique")
        for column in (
            "allows_delivery",
            "allows_pickup",
            "qty_step",
            "min_qty",
            "unit_label",
            "prep_note",
            "steps",
            "slug",
        ):
            batch_op.drop_column(column)

    op.drop_table("product_variant")
    op.drop_table("product_tags")
    op.drop_table("tag")
