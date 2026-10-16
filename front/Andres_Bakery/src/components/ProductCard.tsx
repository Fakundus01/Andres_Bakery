import { useState } from "react";
import { Info, RotateCcw, ShoppingBag } from "lucide-react";

import { heroFallback } from "../lib/constants";
import { formatCurrency } from "../lib/format";
import type { Product } from "../lib/types";

/** Se da vuelta con un botÃ³n, no con el hover: en celular no hay hover, y
 *  una tarjeta que gira sola cuando pasás el dedo es una trampa. */
export function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const [volteada, setVolteada] = useState(false);

  return (
    <div className="flip-carta" data-volteada={volteada}>
      <div className="flip-carta-interior">
        <article className="flip-cara product-card flex flex-col overflow-hidden" aria-hidden={volteada}>
          <img
            src={product.image_url || heroFallback[0].image}
            alt={product.name}
            className="h-56 w-full border-b-[3px] border-borde object-cover"
          />
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">{product.category}</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-tinta">{product.name}</h3>
              </div>
              <span className="shrink-0 border-[3px] border-borde bg-superficie-alt px-2 py-1 text-xs font-bold text-tinta">
                {product.available ? "Hay" : "Pausa"}
              </span>
            </div>

            <p className="mt-auto pt-4 font-display text-3xl font-bold text-acento">{formatCurrency(product.price)}</p>

            <div className="mt-4 flex gap-2">
              <button className="btn-primary flex-1 justify-center" type="button" onClick={onAddToCart} disabled={!product.available}>
                <ShoppingBag className="h-4 w-4" />
                Agregar
              </button>
              <button
                className="btn-secondary px-3"
                type="button"
                onClick={() => setVolteada(true)}
                aria-expanded={volteada}
                aria-label={`Ver qué lleva ${product.name}`}
                title="Ver qué lleva"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>

        <article className="flip-cara flip-cara-dorso product-card flex flex-col p-5" aria-hidden={!volteada}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">Qué lleva</p>
          <h3 className="mt-1 font-display text-2xl font-bold text-tinta">{product.name}</h3>

          <p className="mt-4 flex-1 text-sm leading-6 text-tinta-suave">
            {product.description || "Andrea todavía no cargó la descripción de este producto."}
          </p>

          {product.ingredients && product.ingredients.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.ingredients.map((ingrediente) => (
                <li key={ingrediente.id} className="border-[3px] border-borde bg-superficie-alt px-2 py-1 text-xs font-bold text-tinta">
                  {ingrediente.name}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3 border-t-[3px] border-borde pt-4">
            <p className="font-display text-2xl font-bold text-acento">{formatCurrency(product.price)}</p>
            <button className="btn-secondary px-3" type="button" onClick={() => setVolteada(false)} aria-label="Volver a la foto" title="Volver">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
