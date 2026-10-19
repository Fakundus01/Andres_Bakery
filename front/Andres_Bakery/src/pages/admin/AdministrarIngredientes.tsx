import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";

import { textoDeBorrado, textoDeUso } from "../../lib/borrados";
import type { Ingredient } from "../../lib/types";

/** Corregir un tipeo y sacar lo que sobra (F20, T6-F20b).
 *
 *  Sin esto, el panel sabía **crear** ingredientes globales y nada más: un
 *  "Chocolte" quedaba publicado en la ficha y en el dorso de la tarjeta para
 *  siempre. El PUT y el DELETE existían en el back desde T3, sin usar.
 *
 *  **La excepción a ADR-035:** acá la confirmación de borrado sigue siendo en
 *  la propia fila y no un pop-up, porque esto se edita **adentro** del
 *  formulario del producto, que en computadora ya es un pop-up. Uno adentro
 *  de otro es peor que lo que arregla. El texto, eso sí, ya es el compartido.
 */
export function AdministrarIngredientes({
  ingredientes,
  usos,
  onRenombrar,
  onBorrar,
}: {
  ingredientes: Ingredient[];
  usos: Record<number, number>;
  onRenombrar: (id: number, nombre: string) => void;
  onBorrar: (id: number) => void;
}) {
  const [editando, setEditando] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [confirmando, setConfirmando] = useState<number | null>(null);

  const empezarAEditar = (ingrediente: Ingredient) => {
    setConfirmando(null);
    setEditando(ingrediente.id);
    setNombre(ingrediente.name);
  };

  const guardar = (ingrediente: Ingredient) => {
    const limpio = nombre.trim();
    if (limpio && limpio !== ingrediente.name) {
      onRenombrar(ingrediente.id, limpio);
    }
    setEditando(null);
  };

  return (
    <ul className="mt-2 space-y-2">
      {ingredientes.map((ingrediente) => (
        <li key={ingrediente.id} className="border-[3px] border-borde bg-superficie p-3">
          {editando === ingrediente.id ? (
            <div className="flex gap-2">
              <input
                className="field"
                value={nombre}
                autoFocus
                onChange={(evento) => setNombre(evento.target.value)}
                onKeyDown={(evento) => {
                  // Enter acá también mandaría el formulario del producto.
                  if (evento.key === "Enter") {
                    evento.preventDefault();
                    guardar(ingrediente);
                  }
                  if (evento.key === "Escape") {
                    setEditando(null);
                  }
                }}
                aria-label={`Nuevo nombre para ${ingrediente.name}`}
              />
              <button className="btn-secondary shrink-0 px-3" type="button" onClick={() => guardar(ingrediente)}>
                <Check className="h-4 w-4" />
              </button>
              <button className="btn-secondary shrink-0 px-3" type="button" onClick={() => setEditando(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-tinta">{ingrediente.name}</p>
                <p className="text-xs text-tinta-tenue">{textoDeUso(usos[ingrediente.id] ?? 0)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  className="btn-secondary px-3 py-1 text-xs"
                  type="button"
                  onClick={() => empezarAEditar(ingrediente)}
                >
                  Renombrar
                </button>
                <button
                  className="btn-secondary px-3 py-1 text-xs"
                  type="button"
                  onClick={() => setConfirmando(ingrediente.id)}
                  aria-label={`Borrar ${ingrediente.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {confirmando === ingrediente.id ? (
            <div className="mt-2 border-t-[3px] border-borde pt-2">
              <p className="text-xs leading-5 text-tinta">{textoDeBorrado("ingrediente", usos[ingrediente.id] ?? 0)}</p>
              <div className="mt-2 flex gap-2">
                <button
                  className="btn-primary px-3 py-1 text-xs"
                  type="button"
                  onClick={() => {
                    onBorrar(ingrediente.id);
                    setConfirmando(null);
                  }}
                >
                  Sí, borrar
                </button>
                <button className="btn-secondary px-3 py-1 text-xs" type="button" onClick={() => setConfirmando(null)}>
                  No
                </button>
              </div>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
