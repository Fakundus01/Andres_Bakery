import { formatCurrency } from "../../lib/format";
import type { BarraDeRanking } from "../../lib/types";

/** Ranking horizontal: lo que más se pide, las páginas más vistas, los estados
 *  de los pedidos (F47, ADR-019).
 *
 *  Barras horizontales porque los nombres son largos ("Cookies New York x6") y
 *  en columnas verticales quedarían en diagonal o cortados. El valor va escrito
 *  al lado de cada barra, así que esto **es** su propia tabla: no hace falta
 *  color para distinguir filas.
 */
export function GraficoRanking({
  titulo,
  datos,
  moneda = false,
  sufijo = "",
  vacio = "Todavía no hay datos.",
}: {
  titulo: string;
  datos: BarraDeRanking[];
  moneda?: boolean;
  sufijo?: string;
  vacio?: string;
}) {
  const maximo = Math.max(1, ...datos.map((barra) => barra.value));

  return (
    <figure className="pixel-panel p-5">
      <figcaption>
        <h4 className="font-display text-2xl font-bold text-tinta">{titulo}</h4>
      </figcaption>

      {datos.length === 0 ? (
        <p className="mt-3 border-[3px] border-dashed border-borde p-4 text-sm leading-6 text-tinta-suave">
          {vacio}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {datos.map((barra) => (
            <li key={barra.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-bold text-tinta" title={barra.label}>
                  {barra.label}
                </span>
                <span className="shrink-0 text-sm text-tinta-suave">
                  {moneda ? formatCurrency(barra.value) : barra.value}
                  {sufijo ? ` ${sufijo}` : ""}
                  {barra.revenue !== undefined ? ` · ${formatCurrency(barra.revenue)}` : ""}
                </span>
              </div>
              {/* 16px de alto: barra fina, y el resto de la fila queda aire. */}
              <div className="mt-1 h-4 w-full border-[3px] border-borde bg-superficie-alt">
                <div
                  className="h-full bg-acento"
                  style={{ width: `${Math.max(2, (barra.value / maximo) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
