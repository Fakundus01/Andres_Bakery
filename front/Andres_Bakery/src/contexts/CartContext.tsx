import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { acomodarCantidad, bajarCantidad, cantidadInicial, subirCantidad } from "../lib/cantidades";
import type { Product } from "../lib/types";

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, cantidad?: number) => void;
  removeItem: (productId: number) => void;
  /** Suma un salto del producto (de a 6 si se vende de a 6). */
  subir: (productId: number) => void;
  /** Resta un salto; por debajo del mínimo saca el producto del carrito. */
  bajar: (productId: number) => void;
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

function leerCarritoGuardado(): CartItem[] {
  for (const vieja of CLAVES_VIEJAS) {
    localStorage.removeItem(vieja);
  }

  const stored = localStorage.getItem(CART_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const guardado = JSON.parse(stored) as CartItem[];
    return guardado
      .filter((item) => Boolean(item?.slug && item?.unit_label))
      // El producto pudo cambiar de mínimo o de salto despues de guardarse:
      // se acomoda al entrar y no recien en el checkout.
      .map((item) => ({ ...item, quantity: acomodarCantidad(item, item.quantity) }));
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(leerCarritoGuardado);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const persist = (next: CartItem[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    setItems(next);
  };

  const addItem = (product: Product, cantidad?: number) => {
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      persist(
        items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: subirCantidad(item, item.quantity) }
            : item,
        ),
      );
      setIsCartOpen(true);
      return;
    }

    const inicial = cantidad ? acomodarCantidad(product, cantidad) : cantidadInicial(product);
    persist([...items, { ...product, quantity: inicial }]);
    setIsCartOpen(true);
  };

  const removeItem = (productId: number) => {
    persist(items.filter((item) => item.id !== productId));
  };

  const subir = (productId: number) => {
    persist(
      items.map((item) =>
        item.id === productId ? { ...item, quantity: subirCantidad(item, item.quantity) } : item,
      ),
    );
  };

  const bajar = (productId: number) => {
    const item = items.find((candidato) => candidato.id === productId);
    if (!item) {
      return;
    }

    const siguiente = bajarCantidad(item, item.quantity);
    if (siguiente === 0) {
      removeItem(productId);
      return;
    }
    persist(
      items.map((candidato) =>
        candidato.id === productId ? { ...candidato, quantity: siguiente } : candidato,
      ),
    );
  };

  const clearCart = () => {
    localStorage.removeItem(CART_STORAGE_KEY);
    setItems([]);
  };

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

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
