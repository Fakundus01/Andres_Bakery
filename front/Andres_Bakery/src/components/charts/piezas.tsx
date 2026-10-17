import { formatCurrency } from "../../lib/format";
import type { PuntoDeSerie } from "../../lib/types";

/** Redondea el techo del eje a un número limpio (0, 1K, 2K…). */
export function ejeY(maximo: number): number {
  if (maximo <= 0) {
    return 0;
  }
  // Con techo 1, la línea del medio vale 0,5 y se etiquetaba "1" dos veces.
  // Son pedidos y visitas: no hay medio pedido.
  if (maximo <= 2) {
    return 2;
  }
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  for (const multiplo of [1, 2, 2.5, 5, 10]) {
    const candidato = magnitud * multiplo;
    if (candidato >= maximo) {
      return candidato;
    }
  }
  return magnitud * 10;
}

export function formatoCorto(valor: number, moneda = false): string {
  if (moneda) {
    return valor >= 1000 ? `$${Math.round(valor / 1000)}K` : formatCurrency(valor);
  }
  if (valor >= 1000) {
    return `${(valor / 1000).toFixed(valor >= 10000 ? 0 : 1)}K`;
  }
  return String(Math.round(valor));
}

/** La vista de tabla que todo gráfico tiene que tener.
 *
 *  Va oculta a la vista y disponible para un lector de pantalla: el gráfico ya
 *  dice lo mismo con etiquetas y tooltip, pero un SVG no se puede leer en voz
 *  alta y los números no pueden quedar atrás de una imagen.
 */
export function TablaDeSerie({
  titulo,
  datos,
  moneda = false,
}: {
  titulo: string;
  datos: PuntoDeSerie[];
  moneda?: boolean;
}) {
  return (
    <table className="sr-only">
      <caption>{titulo}</caption>
      <thead>
        <tr>
          <th scope="col">Día</th>
          <th scope="col">Valor</th>
        </tr>
      </thead>
      <tbody>
        {datos.map((punto) => (
          <tr key={punto.day}>
            <th scope="row">{punto.day}</th>
            <td>{moneda ? formatCurrency(punto.value) : punto.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
