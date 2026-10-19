import type { Product, ProductVariant } from "./types";

/** Los tamaños de un producto, del formulario del panel al payload (F19b).
 *
 *  Vive afuera de React porque es lo que **define precios**: el renglón del
 *  carrito y el pedido se cobran con el precio del tamaño elegido (ADR-029).
 *  Un error acá no es una pantalla fea, es plata mal cobrada.
 */

/** Una fila del editor. El precio es texto porque viene de un `<input>`, y el
 *  `id` viaja para que el back actualice la fila en vez de reemplazarla: si
 *  los ids cambian, el carrito que alguien tenía abierto queda inservible. */
export interface FilaDeVariante {
  id?: number;
  name: string;
  price: string;
}

export const MAX_VARIANTES = 12;

/** Con qué arranca una fila nueva. */
export function filaVacia(): FilaDeVariante {
  return { name: "", price: "" };
}

/** Las filas del producto que se está editando, con sus ids. */
export function filasDelProducto(product: Product): FilaDeVariante[] {
  return (product.variants ?? []).map((variante) => ({
    id: variante.id,
    name: variante.name,
    price: String(variante.price),
  }));
}

/** Lo que falta para poder guardar, o "" si está todo.
 *
 *  El back valida lo mismo y contesta 400; esto existe para que Andrea no
 *  tenga que descubrirlo después de apretar guardar.
 */
export function queFaltaEnLosTamanos(filas: FilaDeVariante[]): string {
  const cargadas = filas.filter((fila) => !estaVacia(fila));

  for (const fila of cargadas) {
    if (!fila.name.trim()) {
      return "Hay un tamaño sin nombre. Escribile uno o borrá esa fila.";
    }
    if (!precioValido(fila.price)) {
      return `El tamaño «${fila.name.trim()}» necesita un precio mayor que cero.`;
    }
  }

  const nombres = cargadas.map((fila) => fila.name.trim().toLowerCase());
  const repetido = nombres.find((nombre, indice) => nombres.indexOf(nombre) !== indice);
  if (repetido) {
    return `Hay dos tamaños que se llaman igual («${repetido}»). Cambiale el nombre a uno.`;
  }

  if (cargadas.length > MAX_VARIANTES) {
    return `Son demasiados tamaños para una ficha (máximo ${MAX_VARIANTES}).`;
  }
  return "";
}

/** Las filas listas para el back: sin las vacías, con el precio en número y
 *  el orden que tienen en pantalla.
 *
 *  Las filas vacías se descartan en silencio a propósito: una fila que se
 *  agregó y no se llenó es un arrepentimiento, no un error que valga un
 *  cartel. */
export function tamanosParaElPayload(
  filas: FilaDeVariante[],
): Array<{ id?: number; name: string; price: number; sort_order: number }> {
  return filas
    .filter((fila) => !estaVacia(fila))
    .map((fila, posicion) => ({
      ...(fila.id === undefined ? {} : { id: fila.id }),
      name: fila.name.trim(),
      price: Number(fila.price),
      sort_order: posicion,
    }));
}

/** Mover una fila sin reordenar a mano: lo que la pantalla llama "subir". */
export function moverTamano(
  filas: FilaDeVariante[],
  desde: number,
  hacia: number,
): FilaDeVariante[] {
  if (hacia < 0 || hacia >= filas.length || desde === hacia) {
    return filas;
  }
  const copia = [...filas];
  const [fila] = copia.splice(desde, 1);
  copia.splice(hacia, 0, fila);
  return copia;
}

/** Qué le va a pasar al cliente si se guarda esto, dicho antes de guardar.
 *
 *  Con tamaños, el precio base deja de ser lo que se cobra (ADR-029/007), y
 *  eso no se ve en ninguna parte del formulario: el campo "Precio de una
 *  unidad" sigue ahí, con su número. */
export function avisoDeLosTamanos(
  filas: FilaDeVariante[],
  variantesGuardadas: ProductVariant[] | undefined,
): string {
  const cargadas = filas.filter((fila) => !estaVacia(fila));
  if (!cargadas.length) {
    return (variantesGuardadas ?? []).length
      ? "Si guardás sin tamaños, se borran los que tenía y vuelve a venderse al precio de arriba."
      : "";
  }

  const borrados = (variantesGuardadas ?? []).filter(
    (guardada) => !cargadas.some((fila) => fila.id === guardada.id),
  );
  const base =
    "Con tamaños cargados, el precio que se cobra sale del tamaño elegido y no del precio de arriba.";
  if (!borrados.length) {
    return base;
  }
  const nombres = borrados.map((variante) => `«${variante.name}»`).join(", ");
  return `${base} Ojo: al guardar se borra ${nombres}, y quien lo tenga en el carrito va a tener que elegir de nuevo.`;
}

function estaVacia(fila: FilaDeVariante): boolean {
  return !fila.name.trim() && !fila.price.trim();
}

function precioValido(precio: string): boolean {
  const numero = Number(precio);
  return Boolean(precio.trim()) && Number.isFinite(numero) && numero > 0;
}
