import { ShoppingBag } from "lucide-react";

import { heroFallback } from "../lib/constants";
import { formatCurrency } from "../lib/format";
import type { Product } from "../lib/types";

export function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  return (
    <article className="product-card overflow-hidden border-[3px] border-borde bg-superficie/90 p-0 transition duration-300">
      <img src={product.image_url || heroFallback[0].image} alt={product.name} className="h-64 w-full object-cover" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-tinta-tenue">{product.category}</p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-tinta">{product.name}</h3>
          </div>
          <div className="bg-tinta px-3 py-1 text-xs font-semibold text-crema">{product.available ? "Stock" : "Pausa"}</div>
        </div>
        <p className="mt-3 text-sm leading-6 text-tinta-suave">{product.description}</p>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-tinta-tenue">Precio</p>
            <p className="mt-1 text-2xl font-semibold text-tinta">{formatCurrency(product.price)}</p>
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
