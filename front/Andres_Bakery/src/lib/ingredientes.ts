import type { Ingredient } from "./types";

/** El ingrediente es global: su nombre es único en la base, así que
 *  "Chocolate semiamargo" se escribe una vez y lo reusan todos los productos.
 *
 *  Todo lo de acá existe por un problema concreto: el asistente de IA escribe
 *  "azucar impalpable" y en la base está "Azúcar impalpable". Crear el
 *  duplicado le ensucia la lista a Andrea para siempre, y nadie lo limpia.
 *
 *  **Esto espeja a `backend/services/saneado.py::normalizar_nombre`**, y el
 *  espejo se mantiene con propiedades Unicode en los dos lados y no con
 *  rangos escritos a mano: una primera versión usaba `[̀-ͯ]` acá y
 *  `unicodedata.combining` allá, y divergían en árabe, hebreo y devanagari.
 *  Lo midió el reviewer de T6-F20b.
 */

export type EstadoDelSugerido = "elegido" | "existe" | "nuevo";

/** Lo que no se ve pero ocupa lugar: espacio de ancho cero, guión suave, la
 *  marca de orden de bytes. Con uno adentro, "Azúcar" se ve idéntico a
 *  "Azúcar" y sería un duplicado que nadie puede distinguir mirando. Se van
 *  del todo, no se vuelven espacio. */
const INVISIBLES = /\p{Cf}/gu;

/** Cualquier espacio en blanco y cualquier carácter de control pasa a ser un
 *  espacio común, para que después colapsen todos juntos. */
const ESPACIOS = /[\p{White_Space}\p{Cc}]/gu;

/** Toda marca combinante: acentos, pero también los de los alfabetos que no
 *  son el nuestro. */
const COMBINANTES = /\p{M}/gu;

const ENIE_DESCOMPUESTA = /ñ/gi;

function limpiarParaComparar(nombre: string): string {
  return nombre.replace(INVISIBLES, "").replace(ESPACIOS, " ");
}

export function normalizar(nombre: string | null | undefined): string {
  return limpiarParaComparar(nombre ?? "")
    .normalize("NFD")
    // `NFD` parte la ñ en "n" + tilde, y el barrido de la línea siguiente la
    // dejaría en "n". La ñ no es una n con acento: es otra letra. Se
    // recompone antes de barrer, o "Piña" y "Pina" pasan a ser el mismo
    // ingrediente y uno de los dos nombres desaparece sin que nadie lo haya
    // decidido.
    .replace(ENIE_DESCOMPUESTA, "ñ")
    .replace(COMBINANTES, "")
    .toLowerCase()
    .trim()
    .replace(/ +/g, " ");
}

/** El nombre tal como se va a **guardar**, a diferencia de `normalizar`, que
 *  es solo para comparar.
 *
 *  Las mayúsculas y los acentos son de ella y no se tocan. Lo único que se
 *  saca es el espacio de más: si no, "Harina   0000" queda escrito así en la
 *  lista para siempre, aunque para comparar valga lo mismo que "Harina 0000".
 */
export function limpiarNombre(nombre: string | null | undefined): string {
  return limpiarParaComparar(nombre ?? "")
    .trim()
    .replace(/ +/g, " ");
}

/** El ingrediente que ya existe con ese nombre, escrito como se escriba.
 *
 *  La comparación es por nombre completo y no por `includes`: "Chocolate" no
 *  es "Chocolate semiamargo". Son dos ingredientes distintos y cuáles existen
 *  lo decide ella.
 */
export function buscarIngrediente(
  lista: Ingredient[],
  nombre: string | null | undefined,
): Ingredient | null {
  const buscado = normalizar(nombre);
  if (!buscado) {
    return null;
  }
  return lista.find((ingrediente) => normalizar(ingrediente.name) === buscado) ?? null;
}

/** Qué ofrecerle a Andrea para un ingrediente que propuso la IA: nada si ya
 *  está marcado, "agregar" si existe en la lista, "crear y agregar" si no. */
export function estadoDelSugerido(
  lista: Ingredient[],
  elegidos: number[],
  nombre: string,
): { estado: EstadoDelSugerido; ingrediente: Ingredient | null } {
  const ingrediente = buscarIngrediente(lista, nombre);
  if (!ingrediente) {
    return { estado: "nuevo", ingrediente: null };
  }
  return {
    estado: elegidos.includes(ingrediente.id) ? "elegido" : "existe",
    ingrediente,
  };
}
