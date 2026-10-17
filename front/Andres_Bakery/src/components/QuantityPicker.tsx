import { Minus, Plus } from "lucide-react";

import { textoRegla } from "../lib/cantidades";
import type { Product } from "../lib/types";

/** Los botones saltan de a `qty_step` y no bajan del `min_qty`: si se venden
 *  de a 6, acá no hay forma de pedir 7 y descubrirlo en el checkout. */
export function QuantityPicker({
  product,
  cantidad,
  onSubir,
  onBajar,
  etiquetaBajar = "Sacar",
}: {
  product: Product;
  cantidad: number;
  onSubir: () => void;
  onBajar: () => void;
  etiquetaBajar?: string;
}) {
  const regla = textoRegla(product);

  return (
    <div>
      <div className="flex items-center border-[3px] border-borde bg-superficie">
        <button
          type="button"
          className="px-3 py-2 text-tinta hover:bg-superficie-alt"
          onClick={onBajar}
          aria-label={`${etiquetaBajar} ${product.qty_step || 1} de ${product.name}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-14 text-center font-display text-lg font-bold text-tinta">
          {cantidad}
        </span>
        <button
          type="button"
          className="px-3 py-2 text-tinta hover:bg-superficie-alt"
          onClick={onSubir}
          aria-label={`Sumar ${product.qty_step || 1} de ${product.name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {regla ? <p className="mt-1 text-xs font-bold text-tinta-tenue">{regla}</p> : null}
    </div>
  );
}
