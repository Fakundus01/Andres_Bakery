"""La carta: productos, etiquetas, variantes, ingredientes y opciones."""

from datetime import datetime

from sqlalchemy.orm import validates

from ..extensions import db


product_ingredients = db.Table(
    "product_ingredients",
    db.Column("product_id", db.Integer, db.ForeignKey("product.id"), primary_key=True),
    db.Column(
        "ingredient_id",
        db.Integer,
        db.ForeignKey("ingredient.id"),
        primary_key=True,
    ),
)

product_option_groups = db.Table(
    "product_option_groups",
    db.Column("product_id", db.Integer, db.ForeignKey("product.id"), primary_key=True),
    db.Column(
        "option_group_id",
        db.Integer,
        db.ForeignKey("option_group.id"),
        primary_key=True,
    ),
)

product_tags = db.Table(
    "product_tags",
    db.Column("product_id", db.Integer, db.ForeignKey("product.id"), primary_key=True),
    db.Column("tag_id", db.Integer, db.ForeignKey("tag.id"), primary_key=True),
)


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(160), nullable=False, unique=True)
    description = db.Column(db.Text)
    steps = db.Column(db.Text)
    prep_note = db.Column(db.Text)

    price = db.Column(db.Numeric(10, 2), nullable=False)
    # price es el precio de UNA unit_label. min_qty y qty_step son el minimo de
    # pedido y el salto: "se venden de a 6" es min_qty=6, qty_step=6.
    unit_label = db.Column(db.String(40), nullable=False, default="unidad")
    min_qty = db.Column(db.Integer, nullable=False, default=1)
    qty_step = db.Column(db.Integer, nullable=False, default=1)

    category = db.Column(db.String(120), default="general")
    image_url = db.Column(db.String(500))
    available = db.Column(db.Boolean, default=True)
    allows_pickup = db.Column(db.Boolean, nullable=False, default=True)
    allows_delivery = db.Column(db.Boolean, nullable=False, default=True)

    order_items = db.relationship("OrderItem", back_populates="product", lazy=True)
    ingredients = db.relationship(
        "Ingredient",
        secondary=product_ingredients,
        back_populates="products",
        lazy=True,
    )
    tags = db.relationship(
        "Tag",
        secondary=product_tags,
        back_populates="products",
        lazy=True,
    )
    option_groups = db.relationship(
        "OptionGroup",
        secondary=product_option_groups,
        back_populates="products",
        lazy=True,
        order_by="OptionGroup.sort_order",
    )
    variants = db.relationship(
        "ProductVariant",
        back_populates="product",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="ProductVariant.sort_order",
    )


class Tag(db.Model):
    """Las crea Andrea: "sin TACC", "vegano", "frio" (ADR-006).

    Son su declaracion bajo su responsabilidad: el software las muestra,
    no las certifica.
    """

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), nullable=False, unique=True)
    slug = db.Column(db.String(80), nullable=False, unique=True)
    color_token = db.Column(db.String(40), nullable=False, default="acento")
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    products = db.relationship(
        "Product",
        secondary=product_tags,
        back_populates="tags",
        lazy=True,
    )


class ProductVariant(db.Model):
    """Solo para lo que se vende entero con tamanos: "torta 8 porciones" (ADR-007)."""

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    product = db.relationship("Product", back_populates="variants")


class Ingredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True)
    # La unicidad que importa es esta, no la de `name` (ADR-030): el nombre
    # exacto deja entrar "Coco rallado" y "coco rallado" como dos filas. Sin
    # una restriccion que lo respalde, el chequeo del servicio es un
    # `check-then-insert` y dos requests casi simultaneos pasan las dos.
    normalized_name = db.Column(db.String(120), nullable=False, unique=True, index=True)
    unit = db.Column(db.String(40))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship(
        "Product",
        secondary=product_ingredients,
        back_populates="ingredients",
        lazy=True,
    )

    @validates("name")
    def _derivar_normalizado(self, _clave: str, valor: str) -> str:
        """El normalizado sale del nombre, siempre, sin que nadie se acuerde.

        Podria setearlo el servicio y listo, pero entonces cualquier camino
        que cree un `Ingredient` sin pasar por ahi —un test, una migracion, un
        arreglo a mano— deja una fila con el normalizado inconsistente, y la
        restriccion unica que la sostiene (ADR-030) pasa a mentir. Derivarlo
        aca hace que eso no se pueda.
        """
        from ..services.saneado import normalizar_nombre

        self.normalized_name = normalizar_nombre(valor, "nombre", tope=120)
        return valor


class OptionGroup(db.Model):
    """Lo que la chef define para que el cliente elija: "Bizcocho", "Relleno".

    Globales como las etiquetas y los ingredientes (ADR-031): "Relleno" se
    escribe una vez y se engancha a las tortas que lo usen. Definirlos por
    producto la obligaria a recargar la misma lista en cada torta, que es
    justo el trabajo que el panel existe para ahorrarle.
    """

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    # Misma unicidad que el ingrediente y por la misma razon (ADR-030): la
    # exacta deja entrar "Relleno" y "relleno" como dos grupos.
    normalized_name = db.Column(db.String(120), nullable=False, unique=True, index=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    # Lo que decide si la torta se puede pedir sin elegir este grupo. Una
    # torta sin relleno elegido no es un pedido que ella pueda cumplir.
    required = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    options = db.relationship(
        "Option",
        back_populates="group",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="Option.sort_order",
    )
    products = db.relationship(
        "Product",
        secondary=product_option_groups,
        back_populates="option_groups",
        lazy=True,
    )

    @validates("name")
    def _derivar_normalizado(self, _clave: str, valor: str) -> str:
        from ..services.saneado import normalizar_nombre

        self.normalized_name = normalizar_nombre(valor, "nombre", tope=120)
        return valor


class Option(db.Model):
    """Un sabor de un grupo. El pedido guarda su nombre, no su id (ADR-031)."""

    __table_args__ = (
        db.UniqueConstraint(
            "option_group_id", "normalized_name", name="uq_option_grupo_normalizado"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    option_group_id = db.Column(
        db.Integer, db.ForeignKey("option_group.id"), nullable=False, index=True
    )
    name = db.Column(db.String(120), nullable=False)
    normalized_name = db.Column(db.String(120), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    group = db.relationship("OptionGroup", back_populates="options")

    @validates("name")
    def _derivar_normalizado(self, _clave: str, valor: str) -> str:
        from ..services.saneado import normalizar_nombre

        self.normalized_name = normalizar_nombre(valor, "nombre", tope=120)
        return valor
