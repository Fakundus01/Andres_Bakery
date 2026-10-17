import { Eye, Receipt, TrendingUp, Users } from "lucide-react";

import { GraficoRanking } from "../../components/charts/GraficoRanking";
import { GraficoSerie } from "../../components/charts/GraficoSerie";
import { LoadingPanel, StatCard, StatusPill } from "../../components/ui";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Order, ResumenMetricas } from "../../lib/types";

const RANGOS = [
  { dias: 7, etiqueta: "7 días" },
  { dias: 30, etiqueta: "30 días" },
  { dias: 90, etiqueta: "90 días" },
];

const ESTADOS: Record<string, string> = {
  pending: "A confirmar",
  paid: "Pagados",
  preparing: "En preparación",
  delivered: "Entregados",
  cancelled: "Cancelados",
};

/** El resumen del panel: números arriba, gráficos abajo (F47, F48).
 *
 *  Todo lo que se dibuja acá lo agrega el servidor (`/api/metrics/summary`): el
 *  panel no se trae los pedidos para contarlos (ADR-019).
 */
export function OverviewTab({
  resumen,
  dias,
  onDias,
  cargando,
  ordenes,
}: {
  resumen: ResumenMetricas | null;
  dias: number;
  onDias: (dias: number) => void;
  cargando: boolean;
  ordenes: Order[];
}) {
  if (!resumen) {
    return cargando ? <LoadingPanel label="Midiendo" /> : null;
  }

  const estados = resumen.orders_by_status.map((fila) => ({
    ...fila,
    label: ESTADOS[fila.label] ?? fila.label,
  }));

  return (
    <section className="space-y-6">
      {/* Los filtros, en una fila sola arriba de los gráficos. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-tinta-suave">Mostrar:</span>
        {RANGOS.map((rango) => (
          <button
            key={rango.dias}
            type="button"
            className={dias === rango.dias ? "btn-primary px-3 py-2 text-sm" : "btn-secondary px-3 py-2 text-sm"}
            onClick={() => onDias(rango.dias)}
          >
            {rango.etiqueta}
          </button>
        ))}
        {cargando ? <span className="text-sm text-tinta-tenue">actualizando…</span> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Visitas"
          value={String(resumen.visits_total)}
          detail={`Páginas abiertas en ${resumen.days} días`}
        />
        <StatCard
          title="Pedidos"
          value={String(resumen.orders_total)}
          detail={`${resumen.orders_paid} pagos confirmados en total`}
        />
        <StatCard
          title="Facturación"
          value={formatCurrency(resumen.revenue_total)}
          detail={`Pedidos creados en ${resumen.days} días`}
        />
        <StatCard title="Clientes con cuenta" value={String(resumen.customers)} detail="Sin contar tu usuario" />
      </div>

      {/* Todo en dos columnas: un gráfico a lo ancho se estira en alto con el
          viewBox y queda una pared de aire adentro del panel. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <GraficoSerie titulo="Visitas por día" datos={resumen.visits_by_day} />
        <GraficoSerie titulo="Pedidos por día" datos={resumen.orders_by_day} forma="columnas" />
        <GraficoSerie titulo="Facturación por día" datos={resumen.revenue_by_day} forma="columnas" moneda />
        <GraficoRanking
          titulo="Lo que más se pide"
          datos={resumen.top_products}
          sufijo="u."
          vacio="Todavía no hay pedidos en este período."
        />
        <GraficoRanking titulo="Estado de los pedidos" datos={estados} vacio="Todavía no hay pedidos." />
        <GraficoRanking
          titulo="Las páginas más vistas"
          datos={resumen.top_paths}
          vacio="Todavía no se registraron visitas."
        />
        <GraficoRanking
          titulo="Desde qué dispositivo entran"
          datos={resumen.devices.map((fila) => ({
            ...fila,
            label: fila.label === "mouse" ? "Computadora" : fila.label === "tactil" ? "Celular o tablet" : "Sin datos",
          }))}
          vacio="Todavía no se registraron visitas."
        />
      </div>

      <div className="pixel-panel p-6">
        <h3 className="font-display text-3xl font-semibold text-tinta">Últimos pedidos</h3>
        {ordenes.length === 0 ? (
          <p className="mt-4 border-[3px] border-dashed border-borde p-4 text-sm leading-6 text-tinta-suave">
            Cuando entre el primer pedido, aparece acá.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {ordenes.slice(0, 5).map((orden) => (
              <div key={orden.id} className="border-[3px] border-borde bg-superficie/90 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-tinta">Pedido #{orden.id}</p>
                    <p className="text-sm text-tinta-tenue">
                      {orden.user?.name ?? orden.delivery?.customer_name ?? "Invitado"} ·{" "}
                      {formatDate(orden.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl font-bold text-tinta">
                      {formatCurrency(orden.total_amount)}
                    </span>
                    <StatusPill status={orden.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs leading-5 text-tinta-tenue">
        <span className="inline-flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" />
          Las visitas se cuentan sin cookies y sin guardar de quién son
        </span>
        <span className="inline-flex items-center gap-2">
          <Users className="h-3.5 w-3.5" />
          Por eso no hay "visitantes únicos"
        </span>
        <span className="inline-flex items-center gap-2">
          <Receipt className="h-3.5 w-3.5" />
          La facturación cuenta pedidos creados, no cobrados
        </span>
        <span className="inline-flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          Los pagos confirmados son el total histórico
        </span>
      </p>
    </section>
  );
}
