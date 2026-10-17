import type { Product } from "./types";

/** Espejo de `backend/services/quantity.py`.
 *
 *  Está duplicado a propósito: acá sirve para que los botones + y - salten de
 *  6 en 6 y nadie llegue al checkout con una cantidad que el servidor va a
 *  rechazar. El que decide sigue siendo el back (V4). */

type ReglaCantidad = Pick<Product, "min_qty" | "qty_step">;

function minimo(producto: ReglaCantidad) {
  return Math.max(1, producto.min_qty || 1);
}

function salto(producto: ReglaCantidad) {
  return Math.max(1, producto.qty_step || 1);
}

export function cantidadInicial(producto: ReglaCantidad) {
  return minimo(producto);
}

export function esCantidadValida(producto: ReglaCantidad, cantidad: number) {
  return cantidad >= minimo(producto) && (cantidad - minimo(producto)) % salto(producto) === 0;
}

export function subirCantidad(producto: ReglaCantidad, cantidad: number) {
  return Math.max(minimo(producto), cantidad + salto(producto));
}

/** Bajar por debajo del mínimo devuelve 0: quien llama decide si eso es
 *  "sacar del carrito" o "no hacer nada". */
export function bajarCantidad(producto: ReglaCantidad, cantidad: number) {
  const siguiente = cantidad - salto(producto);
  return siguiente < minimo(producto) ? 0 : siguiente;
}

/** Acomoda una cantidad cualquiera (la del localStorage de ayer, por ejemplo)
 *  al mínimo y al salto que el producto tiene hoy.
 *
 *  **Redondea para abajo, nunca para arriba.** Con `Math.round`, en un producto
 *  que se vende de a 6, pedir 9 terminaba en 12: la mitad de arriba del salto
 *  le subía el pedido —y el precio— a alguien que no lo pidió. Entre darle de
 *  menos y cobrarle de más, de menos.
 *
 *  Una cantidad que no es un número (un carrito viejo manoseado a mano) cae
 *  al mínimo en vez de propagar `NaN` hasta el total. */
export function acomodarCantidad(producto: ReglaCantidad, cantidad: number) {
  if (!Number.isFinite(cantidad) || cantidad <= minimo(producto)) {
    return minimo(producto);
  }
  const pasos = Math.floor((cantidad - minimo(producto)) / salto(producto));
  return minimo(producto) + pasos * salto(producto);
}

/** "se venden de a 6" / "mínimo 3 unidades" / "" cuando no hay regla. */
export function textoRegla(producto: Product) {
  const min = minimo(producto);
  const paso = salto(producto);
  if (paso > 1) {
    return `Se venden de a ${paso} ${producto.unit_label}`;
  }
  if (min > 1) {
    return `Mínimo ${min} ${producto.unit_label}`;
  }
  return "";
}
