import { useNavigate } from "react-router-dom";
import { ArrowRight, ShoppingBag, X } from "lucide-react";

import { useCart } from "../contexts/CartContext";
import { formatCurrency } from "../lib/format";
import { EmptyState } from "./ui";

export function CartDrawer() {
  const navigate = useNavigate();
  const { closeCart, isCartOpen, items, openCart, removeItem, subtotal, updateQuantity } = useCart();

  return (
    <>
      {!isCartOpen ? (
        <button type="button" className="btn-primary fixed bottom-6 right-6 z-40" onClick={openCart}>
          <ShoppingBag className="h-4 w-4" />
          Ver carrito
        </button>
      ) : null}
      {isCartOpen ? (
        <div className="fixed inset-0 z-50 bg-tinta/30" onClick={closeCart}>
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l-[4px] border-borde bg-superficie p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-tinta-tenue">Carrito</p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-tinta">Tu compra</h2>
              </div>
              <button type="button" className="btn-secondary p-3" onClick={closeCart}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
              {items.length === 0 ? (
                <EmptyState title="Todavía no agregaste productos" description="Sumá un box, torta o cookies desde la tienda para iniciar el checkout." />
              ) : (
                items.map((item) => (
                  <div key={item.id} className="border-[3px] border-borde bg-superficie-alt p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-tinta">{item.name}</p>
                        <p className="mt-1 text-sm text-tinta-tenue">{formatCurrency(item.price)} c/u</p>
                      </div>
                      <button type="button" className="text-sm font-semibold text-tinta-tenue" onClick={() => removeItem(item.id)}>Quitar</button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 border-[3px] border-borde bg-superficie p-1">
                        <button className="px-3 py-1 text-sm" type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button className="px-3 py-1 text-sm" type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <strong className="text-tinta">{formatCurrency(item.price * item.quantity)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 border-t-[3px] border-borde pt-4">
              <div className="flex items-center justify-between text-sm text-tinta-suave"><span>Subtotal</span><strong className="text-tinta">{formatCurrency(subtotal)}</strong></div>
              <button className="btn-primary mt-4 w-full justify-center" type="button" onClick={() => { closeCart(); navigate("/checkout"); }} disabled={items.length === 0}>
                Ir al checkout
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="btn-secondary mt-3 w-full justify-center" type="button" onClick={() => { closeCart(); navigate("/carrito"); }}>
                Ver el carrito completo
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
