import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { acomodarCantidad, bajarCantidad, cantidadInicial, subirCantidad } from "../lib/cantidades";
import {
  claveDelRenglon,
  subtotalDelCarrito,
  type Personalizacion,
} from "../lib/carrito";
import type { Product } from "../lib/types";

/** Un renglón del carrito: el producto más lo que se eligió para ÉSTE.
 *
 *  Dos tortas iguales con distinto relleno son dos renglones, así que el
 *  producto ya no alcanza como identidad: la calcula `claveDelRenglon`
 *  (F19a, F58). Guardar la clave sería peor —un carrito viejo no la tiene—,
 *  por eso se calcula siempre. */
export interface CartItem extends Product, Personalizacion {
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, cantidad?: number, personalizacion?: Personalizacion) => void;
  /** Todas toman la clave del renglón (`claveDelRenglon`), no el id del
   *  producto: con tamaños y sabores, el id ya no identifica un renglón. */
  removeItem: (clave: string) => void;
  /** Suma un salto del producto (de a 6 si se vende de a 6). */
  subir: (clave: string) => void;
  /** Resta un salto; por debajo del mínimo saca el renglón del carrito. */
  bajar: (clave: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

// La clave lleva version: un carrito guardado antes de T3 no tiene slug ni
// unidad y arrastra el precio viejo. Mostrarlo seria mentirle al cliente, asi
// que se descarta en vez de intentar completarlo a mano.
const CART_STORAGE_KEY = "andres-bakery-cart-v2";
const CLAVES_VIEJAS = ["andres-bakery-cart"];
const CartContext = createContext<CartContextValue | null>(null);

/** Tocar `localStorage` tira excepción en una ventana privada o con los datos
 *  de sitio bloqueados. Sin esto, el carrito dejaba la página en blanco para
 *  esa persona: no se podía ni mirar la carta. Sin guardado el carrito igual
 *  funciona; se pierde al recargar, que es mucho mejor que no abrir. */
function guardarCarrito(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Dura lo que dure la pestaña.
  }
}

function olvidarCarrito(clave: string = CART_STORAGE_KEY): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Nada que borrar y nada que romper.
  }
}

function leerCarritoGuardado(): CartItem[] {
  for (const vieja of CLAVES_VIEJAS) {
    olvidarCarrito(vieja);
  }

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!stored) {
    return [];
  }

  try {
    const guardado = JSON.parse(stored) as CartItem[];
    return guardado
      // La cantidad tiene que ser un número de verdad: el JSON guardado puede
      // venir de una versión vieja o tocado a mano, y un "ocho" ahí adentro
      // deja la cantidad y el total en NaN.
      .filter((item) => Boolean(item?.slug && item?.unit_label) && Number.isFinite(Number(item?.quantity)))
      // El producto pudo cambiar de mínimo o de salto despues de guardarse:
      // se acomoda al entrar y no recien en el checkout.
      .map((item) => ({ ...item, quantity: acomodarCantidad(item, item.quantity) }));
  } catch {
    olvidarCarrito();
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(leerCarritoGuardado);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const persist = (next: CartItem[]) => {
    guardarCarrito(next);
    setItems(next);
  };

  const addItem = (product: Product, cantidad?: number, personalizacion?: Personalizacion) => {
    const nuevo: CartItem = {
      ...product,
      ...personalizacion,
      quantity: cantidad ? acomodarCantidad(product, cantidad) : cantidadInicial(product),
    };
    const clave = claveDelRenglon(nuevo);

    const existente = items.find((item) => claveDelRenglon(item) === clave);
    if (existente) {
      // Misma configuración ⇒ sube la cantidad del renglón que ya está, no
      // aparece uno repetido debajo del otro.
      persist(
        items.map((item) =>
          claveDelRenglon(item) === clave
            ? { ...item, quantity: subirCantidad(item, item.quantity) }
            : item,
        ),
      );
      setIsCartOpen(true);
      return;
    }

    persist([...items, nuevo]);
    setIsCartOpen(true);
  };

  const removeItem = (clave: string) => {
    persist(items.filter((item) => claveDelRenglon(item) !== clave));
  };

  const subir = (clave: string) => {
    persist(
      items.map((item) =>
        claveDelRenglon(item) === clave
          ? { ...item, quantity: subirCantidad(item, item.quantity) }
          : item,
      ),
    );
  };

  const bajar = (clave: string) => {
    const item = items.find((candidato) => claveDelRenglon(candidato) === clave);
    if (!item) {
      return;
    }

    const siguiente = bajarCantidad(item, item.quantity);
    if (siguiente === 0) {
      removeItem(clave);
      return;
    }
    persist(
      items.map((candidato) =>
        claveDelRenglon(candidato) === clave ? { ...candidato, quantity: siguiente } : candidato,
      ),
    );
  };

  const clearCart = () => {
    olvidarCarrito();
    setItems([]);
  };

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    // El precio del renglón, no el del producto: con la torta de 8 porciones
    // el resumen decía $6.000 y el servidor cobraba $14.000 (F19a).
    const subtotal = subtotalDelCarrito(items);

    return {
      items,
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      addItem,
      removeItem,
      subir,
      bajar,
      clearCart,
      itemCount,
      subtotal,
    };
  }, [isCartOpen, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
