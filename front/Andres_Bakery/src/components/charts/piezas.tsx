import { formatCurrency } from "../../lib/format";
import type { PuntoDeSerie } from "../../lib/types";

/** Las marcas del eje: de 0 al techo, en pasos "lindos".
 *
 *  Devuelve la lista y no solo el techo, y esa es toda la gracia. Antes el
 *  gráfico dibujaba tres líneas fijas —abajo, al medio y arriba— y la del
 *  medio valía la mitad del techo: con techo 5 valía 2,5 y la etiqueta la
 *  redondeaba a "3". La línea decía un número y estaba en otro. No hay medio
 *  pedido ni media visita.
 *
 *  Con pasos de 1, 2, 5, 10, 20… cada marca cae donde dice que cae.
 */
export function ticksDelEje(maximo: number): number[] {
  // `Number.isFinite` y no solo `<= 0`: con NaN la comparacion da false, se
  // colaba hasta el final y devolvia [0, NaN]. Eso ponia atributos invalidos
  // en el SVG y el grafico salia en blanco, sin error. Y es alcanzable: basta
  // con que a un punto de la serie le falte el `value`.
  if (!Number.isFinite(maximo) || maximo <= 0) {
    return [0];
  }
  const magnitud = 10 ** Math.floor(Math.log10(maximo));
  for (const multiplo of [1, 2, 5, 10]) {
    const paso = magnitud * multiplo;
    const cuantas = Math.ceil(maximo / paso);
    if (cuantas <= 4) {
      // toPrecision mata la basura de coma flotante (0.30000000000000004).
      return Array.from({ length: cuantas + 1 }, (_, i) => Number((i * paso).toPrecision(12)));
    }
  }
  // Inalcanzable con cualquier numero finito positivo: con multiplo 10
  // siempre entra una sola linea. Queda por si acaso, con un valor sano.
  return [0, maximo];
}

/** El techo del eje: la última marca. */
export function ejeY(maximo: number): number {
  const marcas = ticksDelEje(maximo);
  return marcas[marcas.length - 1];
}

export function formatoCorto(valor: number, moneda = false): string {
  if (!Number.isFinite(valor)) {
    return "—";
  }
  if (moneda) {
    // Formato parejo en todo el eje: antes el 0 salia como "$ 0" (moneda
    // completa) al lado de "$5K", y los dos convivian en la misma columna.
    return valor >= 1000 ? `$${Math.round(valor / 1000)}K` : `$${Math.round(valor)}`;
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
