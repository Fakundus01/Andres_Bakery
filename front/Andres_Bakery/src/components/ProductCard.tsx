import { ShoppingBag } from "lucide-react";

import { heroFallback } from "../lib/constants";
import { formatCurrency } from "../lib/format";
import type { Product } from "../lib/types";

export function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  return (
    <article className="product-card overflow-hidden rounded-[32px] border border-white/70 bg-white/90 p-0 shadow-xl shadow-orange-950/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-950/10">
      <img src={product.image_url || heroFallback[0].image} alt={product.name} className="h-64 w-full object-cover" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{product.category}</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-stone-950">{product.name}</h3>
          </div>
          <div className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">{product.available ? "Stock" : "Pausa"}</div>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">{product.description}</p>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-stone-500">Precio</p>
            <p className="mt-1 text-2xl font-semibold text-stone-950">{formatCurrency(product.price)}</p>
          </div>
          <button className="btn-primary" type="button" onClick={onAddToCart}>
            <ShoppingBag className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
