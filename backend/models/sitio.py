"""Lo que no es carta ni pedido: visitas, textos del sitio y fotos guardadas."""

from datetime import datetime

from ..extensions import db


class StoredImage(db.Model):
    """Una fila por foto guardada, en disco o en Cloudinary (ADR-032).

    Existe por las dos deudas que abre la subida publica: sin registro no hay
    de donde sacar cuanto espacio se uso (D18) ni cuales fotos nunca llegaron
    a un pedido y se pueden borrar (D17). Las fotos que ya estaban en disco
    antes de esto no tienen fila: la cuota las cuenta de menos hasta que se
    reemplacen.
    """

    id = db.Column(db.Integer, primary_key=True)
    # El nombre del archivo en disco, o el `public_id` de Cloudinary: lo que
    # hace falta para borrarlo despues.
    storage_key = db.Column(db.String(200), nullable=False, unique=True)
    url = db.Column(db.String(500), nullable=False)
    bytes = db.Column(db.Integer, nullable=False, default=0)
    # "product" la sube Andrea desde el panel; "reference" la sube cualquiera.
    kind = db.Column(db.String(20), nullable=False, default="product")
    # Provisoria = subida pero todavia sin pedido. El barrido borra las
    # provisorias que pasaron su ventana; las usadas no se tocan nunca.
    provisional = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)


class PageView(db.Model):
    """Visitas, contadas agregadas (F48, ADR-019).

    Una fila por (dia, ruta, clase de dispositivo) y un contador que sube. No
    hay IP, ni cookie, ni user agent, ni id de sesion: es a proposito. Se puede
    saber que la carta tuvo 160 visitas; no se puede saber quien entro, ni
    reconstruir el recorrido de nadie, ni cruzar quien mira con quien compra.
    """

    __table_args__ = (
        db.UniqueConstraint("day", "path", "device", name="uq_pageview_dia_ruta_dispositivo"),
    )

    id = db.Column(db.Integer, primary_key=True)
    day = db.Column(db.Date, nullable=False, index=True)
    # Ruta ya normalizada contra las que el front conoce: "/producto/<slug>"
    # entra como "/producto" y lo que no se reconoce, como "otra".
    path = db.Column(db.String(120), nullable=False)
    device = db.Column(db.String(20), nullable=False, default="otra")
    views = db.Column(db.Integer, nullable=False, default=0)


class SiteContent(db.Model):
    key = db.Column(db.String(120), primary_key=True)
    content = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
