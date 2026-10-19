import type { Product } from "./types";

/** Lo que se le dice a alguien justo antes de borrar algo (ADR-035).
 *
 *  Estaba escrito dos veces a mano —`AdministrarIngredientes` y el que fue
 *  `GrupoDeOpciones` (hoy `EditorDeGrupo`) tenían su propio `textoDeBorrado`—
 *  y en la carta y las etiquetas no estaba escrito en ningún lado: "Eliminar"
 *  borraba de una.
 *
 *  Lo único difícil acá es el castellano: el plural y el género. "Si lo
 *  borrás sale de los 1 productos" es lo que sale de interpolar un número sin
 *  mirarlo, y es la clase de frase que hace que ella no borre nada por no
 *  entender qué le están preguntando.
 */
export type Borrable = "producto" | "etiqueta" | "grupo" | "ingrediente" | "sabor";

type Plantilla = {
  /** «lo» o «la» según la palabra: la etiqueta se borra, el grupo también. */
  pronombre: "lo" | "la";
  /** Lo que se lleva puesto además de sí mismo, con su propia puntuación:
   *  sin la coma, "sale de los 3 productos que lo tienen con todos sus
   *  sabores" se lee como si los productos tuvieran los sabores. */
  arrastre?: string;
  /** Lo que se dice cuando no lo usa ningún producto. */
  suelto: string;
};

const PLANTILLAS: Record<"etiqueta" | "grupo" | "ingrediente", Plantilla> = {
  etiqueta: {
    pronombre: "la",
    arrastre: " y de los filtros de la carta",
    suelto: "No la tiene ningún producto: solo desaparece de los filtros de la carta.",
  },
  grupo: {
    pronombre: "lo",
    arrastre: ", con todos sus sabores",
    suelto:
      "Ningún producto lo usa. Se va con todos sus sabores. Los pedidos que ya lo tienen no cambian.",
  },
  ingrediente: {
    pronombre: "lo",
    suelto: "No lo usa ningún producto.",
  },
};

/** Una cuenta rota no puede volverse parte de la frase.
 *
 *  Si el conteo falla, el cartel sigue siendo legible —habla como si no lo
 *  usara nadie— en vez de decir "sale de los NaN productos".
 */
function enteroPositivo(usos: number): number {
  // `isSafeInteger` y no `isInteger`: `1e21` es entero para JavaScript y se
  // interpola como "1e+21", que en la frase queda ilegible. No es alcanzable
  // —el conteo lo acota la cantidad de productos— pero el filtro es gratis.
  return Number.isSafeInteger(usos) && usos > 0 ? usos : 0;
}

export function textoDeBorrado(que: Borrable, usos = 0): string {
  if (que === "producto") {
    // La pregunta que ella hace siempre: "si lo borro, ¿pierdo los pedidos?".
    // La respuesta es no, y por ADR-029 es verdad: el pedido copió el nombre
    // y el precio, no apunta al producto.
    return "Sale de la carta. Los pedidos que ya lo tienen no cambian. No se deshace.";
  }
  if (que === "sabor") {
    return "El cliente deja de poder elegirlo. Los pedidos que ya lo pidieron no cambian. No se deshace.";
  }

  const plantilla = PLANTILLAS[que];
  const cuantos = enteroPositivo(usos);
  if (cuantos === 0) {
    return `${plantilla.suelto} No se deshace.`;
  }

  const arrastre = plantilla.arrastre ?? "";
  const tiene = `${plantilla.pronombre} tiene`;
  if (cuantos === 1) {
    return `Si ${plantilla.pronombre} borrás sale del producto que ${tiene}${arrastre}. No se deshace.`;
  }
  return `Si ${plantilla.pronombre} borrás sale de los ${cuantos} productos que ${tiene}n${arrastre}. No se deshace.`;
}

export function textoDeUso(usos: number): string {
  const cuantos = enteroPositivo(usos);
  if (cuantos === 0) {
    // Sin género: esto lo usan las etiquetas (femenino) y los grupos y los
    // ingredientes (masculino). "No **lo** usa ningún producto" sobre una
    // etiqueta era el único castellano mal del módulo que existe por el
    // castellano, y lo marcó el reviewer de T19.
    return "No está en ningún producto";
  }
  return cuantos === 1 ? "Está en 1 producto" : `Está en ${cuantos} productos`;
}

/** En cuántos productos está cada etiqueta.
 *
 *  El mismo cálculo que `useOpcionesDelPanel` hace para los grupos y
 *  `useIngredientesDelPanel` para los ingredientes, que es lo que deja decir
 *  "sale de los 3 productos que la tienen" **antes** de borrarla.
 */
export function contarEtiquetas(productos: Product[]): Record<number, number> {
  const cuenta: Record<number, number> = {};
  for (const producto of productos) {
    for (const etiqueta of producto.tags ?? []) {
      cuenta[etiqueta.id] = (cuenta[etiqueta.id] ?? 0) + 1;
    }
  }
  return cuenta;
}
