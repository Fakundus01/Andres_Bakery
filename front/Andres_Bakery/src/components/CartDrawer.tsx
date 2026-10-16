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
        <button type="button" className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-stone-900/20" onClick={openCart}>
          <ShoppingBag className="h-4 w-4" />
          Ver carrito
        </button>
      ) : null}
      {isCartOpen ? (
        <div className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-sm" onClick={closeCart}>
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl shadow-stone-950/20" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Carrito</p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-stone-950">Tu compra</h2>
              </div>
              <button type="button" className="rounded-2xl border border-stone-200 p-3" onClick={closeCart}><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
              {items.length === 0 ? (
                <EmptyState title="Todavía no agregaste productos" description="Sumá un box, torta o cookies desde la tienda para iniciar el checkout." />
              ) : (
                items.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-stone-200/70 bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-900">{item.name}</p>
                        <p className="mt-1 text-sm text-stone-500">{formatCurrency(item.price)} c/u</p>
                      </div>
                      <button type="button" className="text-sm font-semibold text-stone-500" onClick={() => removeItem(item.id)}>Quitar</button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white p-1">
                        <button className="rounded-full px-3 py-1 text-sm" type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button className="rounded-full px-3 py-1 text-sm" type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <strong className="text-stone-900">{formatCurrency(item.price * item.quantity)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between text-sm text-stone-600"><span>Subtotal</span><strong className="text-stone-900">{formatCurrency(subtotal)}</strong></div>
              <button className="btn-primary mt-4 w-full justify-center" type="button" onClick={() => { closeCart(); navigate("/checkout"); }} disabled={items.length === 0}>
                Ir al checkout
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
