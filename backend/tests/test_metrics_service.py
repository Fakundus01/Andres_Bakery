from __future__ import annotations

from datetime import date, datetime, time, timedelta

from backend.extensions import db
from backend.models import Order, OrderItem, PageView
from backend.services.metrics_service import MetricsService, normalizar_dispositivo, normalizar_ruta
from backend.tests.support import BackendServiceTestCase


class NormalizacionTestCase(BackendServiceTestCase):
    def test_una_ficha_de_producto_cuenta_como_una_sola_ruta(self) -> None:
        self.assertEqual(normalizar_ruta("/producto/brownie-clasico"), "/producto")
        self.assertEqual(normalizar_ruta("/producto/cookies-new-york"), "/producto")

    def test_las_rutas_conocidas_quedan_tal_cual(self) -> None:
        for ruta in ("/", "/tienda", "/historia", "/cv", "/admin"):
            self.assertEqual(normalizar_ruta(ruta), ruta)

    def test_una_url_inventada_no_llena_la_tabla(self) -> None:
        """Sin esto, cualquiera crea filas nuevas pegando URLs (ADR-019)."""
        for basura in ("/lo-que-sea", "/wp-admin", "../../etc", 42, None, "/" + "x" * 500):
            self.assertEqual(normalizar_ruta(basura), "otra")

    def test_lo_vacio_y_lo_raro_no_cuentan_como_la_portada(self) -> None:
        """Ponerle un "/" adelante a cualquier cosa inflaba la cuenta de "/"."""
        for basura in ("", "   ", "?x=1", "#abajo", "//evil.com/", "evil.com"):
            self.assertEqual(normalizar_ruta(basura), "otra", repr(basura))

    def test_la_query_y_el_hash_no_abren_rutas_nuevas(self) -> None:
        self.assertEqual(normalizar_ruta("/tienda?tag=sin-tacc"), "/tienda")
        self.assertEqual(normalizar_ruta("/tienda#abajo"), "/tienda")
        self.assertEqual(normalizar_ruta("/tienda/"), "/tienda")

    def test_el_dispositivo_es_grueso_a_proposito(self) -> None:
        self.assertEqual(normalizar_dispositivo("mouse"), "mouse")
        self.assertEqual(normalizar_dispositivo("TACTIL"), "tactil")
        self.assertEqual(normalizar_dispositivo("iPhone 15 Pro Max Safari 17"), "otra")


class MetricsServiceTestCase(BackendServiceTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.service = MetricsService()
        self.hoy = date(2026, 10, 17)

    def test_contar_una_visita_suma_en_la_misma_fila(self) -> None:
        for _ in range(3):
            self.service.registrar_visita({"path": "/tienda", "device": "mouse"}, hoy=self.hoy)

        filas = PageView.query.all()
        self.assertEqual(len(filas), 1)
        self.assertEqual(filas[0].views, 3)

    def test_no_guarda_nada_que_identifique_a_la_persona(self) -> None:
        self.service.registrar_visita(
            {"path": "/tienda", "device": "mouse", "ip": "1.2.3.4", "user_agent": "Chrome", "session": "abc"},
            hoy=self.hoy,
        )

        fila = PageView.query.one()
        columnas = {columna.name for columna in PageView.__table__.columns}
        self.assertEqual(columnas, {"id", "day", "path", "device", "views"})
        self.assertEqual(fila.path, "/tienda")

    def test_dispositivos_y_dias_distintos_son_filas_distintas(self) -> None:
        self.service.registrar_visita({"path": "/tienda", "device": "mouse"}, hoy=self.hoy)
        self.service.registrar_visita({"path": "/tienda", "device": "tactil"}, hoy=self.hoy)
        self.service.registrar_visita({"path": "/tienda", "device": "mouse"}, hoy=self.hoy - timedelta(days=1))

        self.assertEqual(PageView.query.count(), 3)

    def test_el_resumen_rellena_los_dias_vacios_con_cero(self) -> None:
        resumen = self.service.resumen(7, hoy=self.hoy)

        self.assertEqual(len(resumen["visits_by_day"]), 7)
        self.assertEqual(resumen["visits_by_day"][0]["day"], "2026-10-11")
        self.assertEqual(resumen["visits_by_day"][-1]["day"], "2026-10-17")
        self.assertTrue(all(punto["value"] == 0 for punto in resumen["visits_by_day"]))

    def test_el_resumen_cuenta_plata_pedidos_y_visitas(self) -> None:
        usuario = self.create_user()
        producto = self.create_product(price="1800.00")
        self.create_order(
            user=usuario,
            product=producto,
            quantity=6,
            status="paid",
            created_at=datetime.combine(self.hoy, time(12, 0)),
        )
        self.service.registrar_visita({"path": "/tienda", "device": "mouse"}, hoy=self.hoy)
        self.service.registrar_visita({"path": "/", "device": "tactil"}, hoy=self.hoy)

        resumen = self.service.resumen(30, hoy=self.hoy)

        self.assertEqual(resumen["orders_total"], 1)
        self.assertEqual(resumen["orders_paid"], 1)
        self.assertEqual(resumen["revenue_total"], 13300.0)  # 6 x 1800 + 2500 de envio
        self.assertEqual(resumen["visits_total"], 2)
        self.assertEqual(resumen["customers"], 1)

    def test_el_ranking_de_productos_ordena_por_cantidad(self) -> None:
        usuario = self.create_user()
        poco = self.create_product(name="Torta", price="14000.00")
        mucho = self.create_product(name="Brownie", price="1800.00")
        dentro_de_la_ventana = datetime.combine(self.hoy, time(12, 0))
        self.create_order(user=usuario, product=poco, quantity=1, created_at=dentro_de_la_ventana)
        self.create_order(user=usuario, product=mucho, quantity=12, created_at=dentro_de_la_ventana)

        ranking = self.service.resumen(30, hoy=self.hoy)["top_products"]

        self.assertEqual([item["label"] for item in ranking], ["Brownie", "Torta"])
        self.assertEqual(ranking[0]["value"], 12)
        self.assertEqual(ranking[0]["revenue"], 21600.0)

    def test_lo_de_antes_de_la_ventana_no_entra(self) -> None:
        usuario = self.create_user()
        producto = self.create_product(price="1000.00")
        viejo = self.create_order(user=usuario, product=producto, quantity=1)
        viejo.created_at = datetime(2026, 1, 1)
        db.session.commit()

        resumen = self.service.resumen(7, hoy=self.hoy)

        self.assertEqual(resumen["orders_total"], 0)
        self.assertEqual(resumen["top_products"], [])
        # El pedido existe: lo que no entra es la ventana, no la fila.
        self.assertEqual(Order.query.count(), 1)
        self.assertEqual(OrderItem.query.count(), 1)

    def test_dos_visitas_a_la_vez_no_le_tiran_un_500_al_visitante(self) -> None:
        """La carrera real: las dos ven que la fila no existe y las dos insertan.

        Se fuerza la rama del choque haciendo que el UPDATE atomico diga "no
        habia fila" aunque otra request ya la creo. Antes esto salia como
        IntegrityError sin atrapar, o sea un 500 en un endpoint publico.
        """
        self.service.registrar_visita({"path": "/tienda", "device": "mouse"}, hoy=self.hoy)

        original = self.service._sumar_una
        intentos = {"n": 0}

        def primera_vez_miente(*args, **kwargs):
            intentos["n"] += 1
            if intentos["n"] == 1:
                return False
            return original(*args, **kwargs)

        self.service._sumar_una = primera_vez_miente
        try:
            self.service.registrar_visita({"path": "/tienda", "device": "mouse"}, hoy=self.hoy)
        finally:
            self.service._sumar_una = original

        fila = PageView.query.one()
        self.assertEqual(fila.views, 2)

    def test_el_estado_de_los_pedidos_respeta_la_ventana(self) -> None:
        """El grafico cuelga del selector de 7/30/90 dias como todo lo demas."""
        usuario = self.create_user()
        producto = self.create_product(price="1000.00")
        viejo = self.create_order(user=usuario, product=producto, quantity=1)
        viejo.created_at = datetime(2024, 1, 1)
        db.session.commit()

        resumen = self.service.resumen(7, hoy=self.hoy)

        self.assertEqual(resumen["orders_by_status"], [])
        self.assertEqual(resumen["orders_total"], 0)

    def test_lo_de_manana_no_entra_en_la_ventana_de_hoy(self) -> None:
        self.service.registrar_visita({"path": "/tienda", "device": "mouse"}, hoy=self.hoy)
        self.service.registrar_visita(
            {"path": "/tienda", "device": "mouse"}, hoy=self.hoy + timedelta(days=1)
        )

        resumen = self.service.resumen(7, hoy=self.hoy)

        # El total y la serie del mismo panel tienen que coincidir.
        self.assertEqual(resumen["visits_total"], 1)
        self.assertEqual(sum(punto["value"] for punto in resumen["visits_by_day"]), 1)
        self.assertEqual(resumen["top_paths"], [{"label": "/tienda", "value": 1}])

    def test_los_dias_se_recortan_a_un_rango_sano(self) -> None:
        self.assertEqual(self.service.resumen(0, hoy=self.hoy)["days"], 1)
        self.assertEqual(self.service.resumen(9999, hoy=self.hoy)["days"], 365)
