from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

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
    # Vacio, "?x=1" o "//evil.com/" NO son la home. Ponerles un "/" adelante
    # los convertia en "/" y le inflaban la cuenta a la portada.
    if not ruta.startswith("/") or ruta.startswith("//"):
        return OTRA
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
        """Suma una visita, aguantando que lleguen dos a la vez.

        Un SELECT y despues un INSERT se pisan: dos visitas simultaneas a la
        misma ruta el mismo dia ven las dos que la fila no existe, las dos
        insertan, y la segunda choca contra el indice unico. Eso salia como un
        500 en un endpoint **publico**, justo lo que la ruta promete que no
        pasa. Y el `views = views + 1` resuelto en Python perdia cuentas.

        Por eso: primero un UPDATE atomico (lo resuelve la base, no nosotros);
        si no habia fila, se inserta; y si alguien se adelanto en el medio, se
        vuelve a sumar sobre la suya.
        """
        dia = hoy or datetime.utcnow().date()
        ruta = normalizar_ruta(data.get("path"))
        dispositivo = normalizar_dispositivo(data.get("device"))

        if self._sumar_una(dia, ruta, dispositivo):
            return

        db.session.add(PageView(day=dia, path=ruta, device=dispositivo, views=1))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            self._sumar_una(dia, ruta, dispositivo)

    def _sumar_una(self, dia: date, ruta: str, dispositivo: str) -> bool:
        filas = (
            db.session.query(PageView)
            .filter_by(day=dia, path=ruta, device=dispositivo)
            .update({PageView.views: PageView.views + 1}, synchronize_session=False)
        )
        if filas:
            db.session.commit()
        return bool(filas)

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
        # Con borde de arriba: sin el, un pedido con fecha futura (reloj
        # corrido, backfill) entraba en el total y no en la serie, y los dos
        # numeros del mismo panel dejaban de coincidir.
        hasta_dt = datetime.combine(hasta, datetime.max.time())

        pedidos_por_dia = self._por_dia_de_pedidos(func.count(Order.id), desde_dt, hasta_dt)
        plata_por_dia = self._por_dia_de_pedidos(
            func.coalesce(func.sum(Order.total_amount), 0), desde_dt, hasta_dt
        )
        visitas_por_dia = {
            str(fila[0]): int(fila[1])
            for fila in db.session.query(PageView.day, func.sum(PageView.views))
            .filter(PageView.day >= desde, PageView.day <= hasta)
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
            "orders_by_status": self._pedidos_por_estado(desde_dt, hasta_dt),
            "top_products": self._productos_mas_pedidos(desde_dt, hasta_dt),
            "top_paths": self._rutas_mas_vistas(desde, hasta),
            "devices": self._dispositivos(desde, hasta),
        }

    def _por_dia_de_pedidos(self, agregado, desde_dt: datetime, hasta_dt: datetime) -> dict[str, float]:
        filas = (
            db.session.query(func.date(Order.created_at), agregado)
            .filter(Order.created_at >= desde_dt, Order.created_at <= hasta_dt)
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

    def _pedidos_por_estado(self, desde_dt: datetime, hasta_dt: datetime) -> list[dict]:
        """Tambien dentro de la ventana.

        El grafico vive en la misma grilla que cuelga del selector de 7/30/90
        dias: si ignoraba la ventana, un pedido de hace dos anios aparecia en
        el panel de 7 dias sin avisar.
        """
        filas = (
            db.session.query(Order.status, func.count(Order.id))
            .filter(Order.created_at >= desde_dt, Order.created_at <= hasta_dt)
            .group_by(Order.status)
            .all()
        )
        return sorted(
            [{"label": str(fila[0] or "sin estado"), "value": int(fila[1])} for fila in filas],
            key=lambda item: item["value"],
            reverse=True,
        )

    def _productos_mas_pedidos(self, desde_dt: datetime, hasta_dt: datetime) -> list[dict]:
        filas = (
            db.session.query(
                Product.name,
                func.sum(OrderItem.quantity),
                func.sum(OrderItem.quantity * OrderItem.unit_price),
            )
            .join(OrderItem, OrderItem.product_id == Product.id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.created_at >= desde_dt, Order.created_at <= hasta_dt)
            .group_by(Product.name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(TOPE_RANKING)
            .all()
        )
        return [
            {"label": str(fila[0]), "value": int(fila[1] or 0), "revenue": round(float(fila[2] or 0), 2)}
            for fila in filas
        ]

    def _rutas_mas_vistas(self, desde: date, hasta: date) -> list[dict]:
        filas = (
            db.session.query(PageView.path, func.sum(PageView.views))
            .filter(PageView.day >= desde, PageView.day <= hasta)
            .group_by(PageView.path)
            .order_by(func.sum(PageView.views).desc())
            .limit(TOPE_RANKING)
            .all()
        )
        return [{"label": str(fila[0]), "value": int(fila[1] or 0)} for fila in filas]

    def _dispositivos(self, desde: date, hasta: date) -> list[dict]:
        filas = (
            db.session.query(PageView.device, func.sum(PageView.views))
            .filter(PageView.day >= desde, PageView.day <= hasta)
            .group_by(PageView.device)
            .order_by(func.sum(PageView.views).desc())
            .all()
        )
        return [{"label": str(fila[0]), "value": int(fila[1] or 0)} for fila in filas]


metrics_service = MetricsService()
