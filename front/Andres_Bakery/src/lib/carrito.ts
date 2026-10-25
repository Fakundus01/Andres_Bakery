import { normalizar } from "./ingredientes";
import { recargoDeLasOpciones, recargoDeUnSabor } from "./recargos";
import type { OptionChoice, OptionGroup, Product, ProductVariant, Tag } from "./types";

/** La identidad y el precio de un renglón del carrito (F19a, F58).
 *
 *  Hasta ahora el renglón **era** el producto: `addItem`, `subir` y `bajar`
 *  buscaban por `item.id`. Con tamaños y sabores eso deja de alcanzar: dos
 *  tortas iguales con distinto relleno son dos renglones, y la torta de 8
 *  porciones no vale lo mismo que la de 12.
 *
 *  Vive afuera de React para poder probarlo sin montar nada: es la decisión
 *  de qué se agrupa con qué y cuánto sale, y eso no se mira a ojo.
 */

/** La etiqueta que habilita la personalización (decidido el 2026-10-19).
 *
 *  Elegir sabores, escribir cómo la querés y mandar una foto es **para las
 *  tortas a pedido**, no para toda la carta. La puerta es una etiqueta porque
 *  es algo que Andrea ya maneja: se la pone al producto y listo.
 *
 *  **El back es quien lo decide** y lo dice en `GET /api/site/delivery`
 *  (`personalization_tag`): tener el string escrito en los dos lados era la
 *  deuda D27, porque cambiarlo de un lado dejaba de ofrecer la personalización
 *  sin un solo error en los logs. Esta constante queda como **red** para
 *  cuando la config no cargó todavía, no como fuente de verdad. */
export const TAG_PERSONALIZABLE = "tortas-personalizadas";
export const NOMBRE_TAG_PERSONALIZABLE = "tortas personalizadas";

/** Tope de la nota del renglón, igual que `TOPE_NOTA` del back. Si se pasa,
 *  el servidor la recorta: mejor que el formulario no deje llegar hasta ahí. */
export const TOPE_NOTA = 300;

/** La nota tal como la va a medir el servidor.
 *
 *  `saneado.texto(una_linea=True)` convierte cada salto de línea en " · "
 *  **antes** de recortar a 300: con cinco renglones, una nota de 300
 *  caracteres llegaba recortada y el contador de la pantalla decía que
 *  entraba (lo marcó el review de T18, hasta 198 caracteres perdidos).
 *  Contando acá lo mismo que allá, lo que se ve es lo que llega. */
export function notaParaElPedido(nota: string | null | undefined): string {
  const enUnaLinea = (nota ?? "")
    .replace(/[\r\n]+/g, " · ")
    .replace(/( · )+/g, " · ")
    .replace(/ +/g, " ")
    .trim();
  // Una nota de solo espacios y saltos quedaba convertida en el separador:
  // "·" guardado como nota, y el panel mostrando «Nota: ·». El back hace lo
  // mismo desde el mismo día (review de T18).
  return /^[·\s]*$/.test(enUnaLinea) ? "" : enUnaLinea;
}

/** El aviso que aparece al agregar algo al carrito (F64, ADR-037).
 *
 *  Dice **qué** entró, que es lo único que el drawer no dice: el drawer
 *  muestra el carrito entero, no el renglón que acaba de entrar.
 *
 *  Y **no lleva link**. La primera versión colgaba un «Ir al carrito», y el
 *  review de T23 lo midió a 390px: ese link de 71×20 se dibujaba encima de
 *  los botones del carrito abierto y se llevaba el **29,7% de «Ayuda»** y el
 *  **10,4% de «Ver el carrito completo»**. Además era redundante, porque
 *  `addItem` abre el drawer: cuando el aviso aparece, el carrito ya está en
 *  pantalla.
 *
 *  **Nombra el tamaño cuando hay uno** (D29). Sin eso el texto se armaba con
 *  `product.name` y nada más, así que agregar 8 porciones y después 12 del
 *  mismo Cheesecake daba UN aviso —el dedup de `agregarAviso` se llevaba el
 *  primero— mientras el carrito mostraba correctamente los dos renglones. Lo
 *  midió el review de T23 (hallazgo 6) con la carta real, y el dato ya lo
 *  tiene `addItem` en la mano.
 *
 *  Vive acá y no adentro de `addItem` para que la decisión se pueda probar
 *  sin montar nada (ADR-023: la lógica pura sale del componente). */
export function avisoDeAgregado(
  product: Pick<Product, "name">,
  variante?: ProductVariant | null,
): { texto: string } {
  // El nombre del tamaño lo escribe Andrea en el panel: puede llegar en
  // blanco, y «Cheesecake ()» es peor que no decir el tamaño.
  const tamano = (variante?.name ?? "").trim();
  return {
    texto: `«${product.name}»${tamano ? ` (${tamano})` : ""} se agregó al carrito`,
  };
}

/** Lo que el cliente eligió para ESTE renglón. Todo opcional: un producto sin
 *  variantes ni grupos se pide igual que siempre. */
export interface Personalizacion {
  variante?: ProductVariant | null;
  opciones?: OptionChoice[];
  nota?: string;
  fotoDeReferencia?: string;
}

/** El mínimo que hace falta para calcular clave y precio: un `CartItem`
 *  entra acá, pero también un producto con lo que se acaba de elegir en la
 *  ficha, que todavía no es un renglón. */
export interface RenglonBase extends Personalizacion {
  id: number;
  price: number;
}

/** La clave del renglón, calculada y nunca guardada.
 *
 *  Un carrito viejo en `localStorage` no tiene variante ni opciones: cae en
 *  la forma "sin nada" y sigue funcionando. Por eso **no hace falta subir
 *  `CART_STORAGE_KEY` a v3**, y conviene no hacerlo: vaciarle el carrito a
 *  quien estaba comprando es peor que el problema que resolvería.
 *
 *  Va por `JSON.stringify` y no por `${a}:${b}` porque la nota la escribe el
 *  cliente: con un separador a mano, una nota con dos puntos podría armar la
 *  clave de otro renglón y fusionar dos tortas distintas.
 */
export function claveDelRenglon(renglon: RenglonBase): string {
  return JSON.stringify([
    renglon.id,
    renglon.variante?.id ?? 0,
    idsDeOpciones(renglon.opciones),
    (renglon.nota ?? "").trim(),
    renglon.fotoDeReferencia ?? "",
  ]);
}

/** Dos renglones con la misma configuración se agrupan; cambiar una coma en
 *  la nota hace un renglón nuevo, que es lo correcto: son dos tortas
 *  distintas para quien las hace. */
export function mismaConfiguracion(uno: RenglonBase, otro: RenglonBase): boolean {
  return claveDelRenglon(uno) === claveDelRenglon(otro);
}

/** El precio de una unidad del renglón: el tamaño elegido más los recargos
 *  de los sabores (F61, ADR-036).
 *
 *  Esto es para mostrar. El que se cobra lo calcula el servidor con los
 *  mismos números leídos de la base: si acá dijera otra cosa, la sorpresa
 *  aparecería en el total y no en la ficha. */
export function precioDelRenglon(renglon: RenglonBase): number {
  const base = renglon.variante ? renglon.variante.price : renglon.price;
  return base + recargoDeLasOpciones(renglon.opciones);
}

export function subtotalDelCarrito(renglones: Array<RenglonBase & { quantity: number }>): number {
  return renglones.reduce(
    (total, renglon) => total + precioDelRenglon(renglon) * renglon.quantity,
    0,
  );
}

/** Los ids ordenados: el orden en que se eligieron los sabores no hace a dos
 *  tortas distintas. */
function idsDeOpciones(opciones: OptionChoice[] | undefined): number[] {
  return (opciones ?? []).map((opcion) => opcion.id).sort((uno, otro) => uno - otro);
}

/** El precio más bajo con el que se puede comprar, para la tarjeta.
 *
 *  La carta mostraba `product.price` incluso cuando el producto solo se vende
 *  por tamaños: el precio base puede no ser comprable, y entrar a la ficha
 *  para ver otro número es una sorpresa fea (review de T18). Con tamaños, la
 *  tarjeta dice "desde" y el más barato. */
export function precioDesde(product: Product): number {
  const tamanos = product.variants ?? [];
  const base = tamanos.length
    ? Math.min(...tamanos.map((tamano) => tamano.price))
    : product.price;
  return base + recargoMinimoObligatorio(product);
}

/** Lo que **no se puede esquivar**: si un grupo obligatorio no tiene ningún
 *  sabor sin recargo, su más barato entra en el precio mínimo.
 *
 *  Sin esto la tarjeta decía "desde $14.200" sobre una torta que no se podía
 *  comprar por menos de $14.500, que es la misma sorpresa que el review de
 *  T18 hizo arreglar cuando el precio base no era comprable. */
function recargoMinimoObligatorio(product: Product): number {
  return (product.option_groups ?? [])
    .filter((grupo) => grupo.required && grupo.options.length)
    .reduce((suma, grupo) => suma + Math.min(...grupo.options.map(recargoDeUnSabor)), 0);
}

/** Cómo está el producto del formulario respecto de la etiqueta que habilita
 *  la personalización.
 *
 *  `parecida` existe por un caso que encontró el review de T18: puede haber
 *  dos etiquetas que se llamen igual y solo una habilite, porque lo que manda
 *  es el slug. Decirle "no la tiene" sobre una que sí marcó sería volverla
 *  loca, así que el panel nombra cuál es la que sirve. */
export function estadoDeLaEtiqueta(
  etiquetas: Tag[],
  elegidas: number[],
  slug: string = TAG_PERSONALIZABLE,
): { etiquetada: boolean; parecida?: string } {
  const marcadas = etiquetas.filter((etiqueta) => elegidas.includes(etiqueta.id));
  if (marcadas.some((etiqueta) => etiqueta.slug === slug)) {
    return { etiquetada: true };
  }
  const parecida = marcadas.find(
    (etiqueta) => normalizar(etiqueta.name) === normalizar(NOMBRE_TAG_PERSONALIZABLE),
  );
  return { etiquetada: false, parecida: parecida?.name };
}

/** ¿Es una torta a pedido? Lo dice la etiqueta, no los grupos.
 *
 *  Si fuera por los grupos, asignarle "Relleno" por error a una docena de
 *  cookies las convertiría en algo que no se puede pedir sin elegir relleno. */
export function esPersonalizable(product: Product, slug: string = TAG_PERSONALIZABLE): boolean {
  return (product.tags ?? []).some((tag) => tag.slug === slug);
}

/** ¿Este producto se arma antes de pedirlo?
 *
 *  Con tamaños o con personalización, el botón "Agregar" de la tarjeta no
 *  alcanza: si falta elegir un relleno obligatorio el servidor va a rechazar
 *  el pedido, y con razón. La tarjeta manda a la ficha, que es donde se
 *  elige. */
export function sePersonaliza(product: Product, slug: string = TAG_PERSONALIZABLE): boolean {
  return Boolean(product.variants?.length) || esPersonalizable(product, slug);
}

/** Lo que falta elegir antes de poder agregar al carrito, o "" si está todo.
 *
 *  Es el espejo de `_exigir_los_obligatorios` del back. Avisarlo acá es
 *  comodidad: quien decide sigue siendo el servidor. */
export function queFaltaElegir(
  grupos: OptionGroup[] | undefined,
  elegidas: Record<number, number | undefined>,
): string {
  const faltan = (grupos ?? [])
    .filter((grupo) => grupo.required && !elegidas[grupo.id])
    .map((grupo) => grupo.name);
  return faltan.length ? `Falta elegir: ${faltan.join(", ")}.` : "";
}

/** Las opciones elegidas como objetos, en el orden que les puso la chef. */
export function opcionesElegidas(
  grupos: OptionGroup[] | undefined,
  elegidas: Record<number, number | undefined>,
): OptionChoice[] {
  const encontradas: OptionChoice[] = [];
  for (const grupo of [...(grupos ?? [])].sort((uno, otro) => uno.sort_order - otro.sort_order)) {
    const elegida = grupo.options.find((opcion) => opcion.id === elegidas[grupo.id]);
    if (elegida) {
      encontradas.push(elegida);
    }
  }
  return encontradas;
}

/** El nombre del grupo al que pertenece una opción, para mostrarla en el
 *  carrito y en el panel ("Relleno: Dulce de leche"). */
export function grupoDeLaOpcion(
  grupos: OptionGroup[] | undefined,
  opcionId: number,
): string {
  const grupo = (grupos ?? []).find((candidato) =>
    candidato.options.some((opcion) => opcion.id === opcionId),
  );
  return grupo?.name ?? "";
}
