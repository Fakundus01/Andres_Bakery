from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import func

from ..extensions import db
from ..models import Order, OrderItem, PageView, Product, User


# Las rutas que el front tiene. Lo que no esta en esta lista cuenta como "otra":
# sin esto, cualquiera llena la tabla pegando URLs inventadas (ADR-019).
RUTAS = (
    "/",
    "/tienda",
    "/producto",
    "/historia",
    "/cv",
    "/configuracion",
    "/carrito",
    "/checkout",
    "/pedidos",
    "/ingresar",
    "/registro",
    "/admin",
)

DISPOSITIVOS = ("mouse", "tactil")

OTRA = "otra"
MAX_DIAS = 365
TOPE_RANKING = 8


def normalizar_ruta(valor: object) -> str:
    if not isinstance(valor, str):
        return OTRA
    ruta = valor.strip().split("?")[0].split("#")[0]
    if not ruta.startswith("/"):
        ruta = f"/{ruta}"
    if len(ruta) > 1:
        ruta = ruta.rstrip("/") or "/"
    if ruta in RUTAS:
        return ruta
    # "/producto/brownie-clasico" cuenta como una sola ruta: medir cada ficha
    # por separado no cambia ninguna decision y multiplica las filas.
    raiz = f"/{ruta.split('/')[1]}" if len(ruta.split("/")) > 1 else ruta
    return raiz if raiz in RUTAS else OTRA


def normalizar_dispositivo(valor: object) -> str:
    if isinstance(valor, str) and valor.strip().lower() in DISPOSITIVOS:
        return valor.strip().lower()
    return OTRA


class MetricsService:
    """Lo que dibujan los graficos del panel, ya agregado (F47, F48, ADR-019)."""

    def registrar_visita(self, data: dict, *, hoy: date | None = None) -> None:
        dia = hoy or datetime.utcnow().date()
        ruta = normalizar_ruta(data.get("path"))
        dispositivo = normalizar_dispositivo(data.get("device"))

        fila = PageView.query.filter_by(day=dia, path=ruta, device=dispositivo).one_or_none()
        if fila is None:
            db.session.add(PageView(day=dia, path=ruta, device=dispositivo, views=1))
        else:
            fila.views = fila.views + 1
        db.session.commit()

    def resumen(self, dias: object = 30, *, hoy: date | None = None) -> dict:
        # Ausente o ilegible => 30. Un numero puesto a mano se respeta y se
        # recorta: `?days=0` es un pedido, no un error, y vale un dia.
        try:
            pedidos = 30 if dias is None else int(dias)
        except (TypeError, ValueError):
            pedidos = 30
        dias = max(1, min(MAX_DIAS, pedidos))
        hasta = hoy or datetime.utcnow().date()
        desde = hasta - timedelta(days=dias - 1)
        desde_dt = datetime.combine(desde, datetime.min.time())

        pedidos_por_dia = self._por_dia_de_pedidos(func.count(Order.id), desde_dt)
        plata_por_dia = self._por_dia_de_pedidos(func.coalesce(func.sum(Order.total_amount), 0), desde_dt)
        visitas_por_dia = {
            str(fila[0]): int(fila[1])
            for fila in db.session.query(PageView.day, func.sum(PageView.views))
            .filter(PageView.day >= desde)
            .group_by(PageView.day)
            .all()
        }

        return {
            "days": dias,
            "from": desde.isoformat(),
            "to": hasta.isoformat(),
            "revenue_total": round(sum(plata_por_dia.values()), 2),
            "orders_total": sum(int(valor) for valor in pedidos_por_dia.values()),
            "orders_paid": Order.query.filter(Order.status == "paid").count(),
            "customers": User.query.filter(User.is_admin.is_(False)).count(),
            "visits_total": sum(visitas_por_dia.values()),
            "revenue_by_day": self._serie(plata_por_dia, desde, hasta),
            "orders_by_day": self._serie(pedidos_por_dia, desde, hasta),
            "visits_by_day": self._serie(visitas_por_dia, desde, hasta),
            "orders_by_status": self._pedidos_por_estado(),
            "top_products": self._productos_mas_pedidos(desde_dt),
            "top_paths": self._rutas_mas_vistas(desde),
            "devices": self._dispositivos(desde),
        }

    def _por_dia_de_pedidos(self, agregado, desde_dt: datetime) -> dict[str, float]:
        filas = (
            db.session.query(func.date(Order.created_at), agregado)
            .filter(Order.created_at >= desde_dt)
            .group_by(func.date(Order.created_at))
            .all()
        )
        return {str(fila[0]): float(fila[1] or 0) for fila in filas}

    def _serie(self, valores: dict[str, float], desde: date, hasta: date) -> list[dict]:
        """Rellena los dias sin datos con cero.

        El grafico no tiene que adivinar huecos: una linea con tres puntos
        salteados miente sobre la forma de la semana.
        """
        serie = []
        dia = desde
        while dia <= hasta:
            clave = dia.isoformat()
            serie.append({"day": clave, "value": round(float(valores.get(clave, 0)), 2)})
            dia += timedelta(days=1)
        return serie

    def _pedidos_por_estado(self) -> list[dict]:
        filas = db.session.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
        return sorted(
            [{"label": str(fila[0] or "sin estado"), "value": int(fila[1])} for fila in filas],
            key=lambda item: item["value"],
            reverse=True,
        )

    def _productos_mas_pedidos(self, desde_dt: datetime) -> list[dict]:
        filas = (
            db.session.query(
                Product.name,
                func.sum(OrderItem.quantity),
                func.sum(OrderItem.quantity * OrderItem.unit_price),
            )
            .join(OrderItem, OrderItem.product_id == Product.id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.created_at >= desde_dt)
            .group_by(Product.name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(TOPE_RANKING)
            .all()
        )
        return [
            {"label": str(fila[0]), "value": int(fila[1] or 0), "revenue": round(float(fila[2] or 0), 2)}
            for fila in filas
        ]

    def _rutas_mas_vistas(self, desde: date) -> list[dict]:
        filas = (
            db.session.query(PageView.path, func.sum(PageView.views))
            .filter(PageView.day >= desde)
            .group_by(PageView.path)
            .order_by(func.sum(PageView.views).desc())
            .limit(TOPE_RANKING)
            .all()
        )
        return [{"label": str(fila[0]), "value": int(fila[1] or 0)} for fila in filas]

    def _dispositivos(self, desde: date) -> list[dict]:
        filas = (
            db.session.query(PageView.device, func.sum(PageView.views))
            .filter(PageView.day >= desde)
            .group_by(PageView.device)
            .order_by(func.sum(PageView.views).desc())
            .all()
        )
        return [{"label": str(fila[0]), "value": int(fila[1] or 0)} for fila in filas]


metrics_service = MetricsService()
