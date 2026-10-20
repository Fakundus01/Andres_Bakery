/** Todo lo que sabe del recargo de un sabor (F61, ADR-036).
 *
 *  Vive afuera de `carrito.ts` porque es lo que **mueve plata** y porque ese
 *  archivo pasaba las 300 líneas (R05): acá están la suma que se le muestra a
 *  quien compra, el texto del chip y lo que el panel tipea. El que se cobra lo
 *  decide el servidor con los mismos números leídos de la base.
 */
import { formatCurrency } from "./format";
import type { OptionChoice } from "./types";

/** Lo que suman los sabores elegidos, o 0.
 *
 *  Filtra lo que no es un número positivo porque la entrada no siempre es la
 *  API: un renglón de `localStorage` lo escribió otra versión del front, y un
 *  `NaN` ahí adentro convertiría el total del carrito en "$ NaN". */
export function recargoDeLasOpciones(opciones: OptionChoice[] | undefined): number {
  return (opciones ?? []).reduce((suma, opcion) => suma + recargoDeUnSabor(opcion), 0);
}

/** El recargo escrito para mostrar al lado del sabor, o "" si no tiene.
 *
 *  Un sabor sin recargo **no** dice "+$0" (ADR-036): el cero es el caso
 *  normal, y escribirlo convierte una lista de sabores en una lista de
 *  precios. */
export function textoDelRecargo(opcion: OptionChoice): string {
  const recargo = recargoDeUnSabor(opcion);
  if (recargo <= 0) {
    return "";
  }
  // Los centavos solo cuando los hay: "+$500" se lee de un saltito, y
  // "+$500,00" obliga a leer dos números para entender uno.
  return `+${formatCurrency(recargo, { conCentavos: !Number.isInteger(recargo) })}`;
}

/** Lo que ella tipeó en el campo del recargo, en número, o `null` si no
 *  sirve. Vacío es cero: borrar el campo es cómo se saca un recargo.
 *
 *  Acepta la coma porque acá se escribe "500,50" y `Number("500,50")` es
 *  `NaN`: sin esto, poner el recargo con coma lo rechazaría sin explicar por
 *  qué, o peor, lo guardaría como cero. */
export function recargoTipeado(texto: string): number | null {
  if (!texto.trim()) {
    return 0;
  }
  const numero = Number(sinSeparadorDeMiles(texto.trim()));
  if (!Number.isFinite(numero) || numero < 0) {
    return null;
  }
  // Dos decimales, que es lo que la columna guarda: 500,999 entraría como
  // 501,00 en la base y la pantalla seguiría diciendo otra cosa.
  return Math.round(numero * 100) / 100;
}

/** "1.500" acá es mil quinientos, no uno con cincuenta.
 *
 *  El punto es separador de miles cuando hay una coma —"1.500,50"— o cuando
 *  separa grupos de exactamente tres dígitos. "1.5" sigue siendo uno y medio:
 *  nadie escribe mil quinientos así. Leerlo mal guardaba $1,50 donde ella
 *  quiso poner $1.500 (review de T20). */
function sinSeparadorDeMiles(texto: string): string {
  if (texto.includes(",")) {
    return texto.replace(/\./g, "").replace(",", ".");
  }
  // El primer grupo no puede arrancar en cero: "0.001" es un milésimo mal
  // escrito, no una cifra con separador de miles.
  return /^[1-9]\d{0,2}(\.\d{3})+$/.test(texto) ? texto.replace(/\./g, "") : texto;
}

export function recargoDeUnSabor(opcion: OptionChoice): number {
  const recargo = Number(opcion.price_delta);
  return Number.isFinite(recargo) && recargo > 0 ? recargo : 0;
}
