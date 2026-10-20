import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import { recargoTipeado, textoDelRecargo } from "../../lib/recargos";
import { formatCurrency } from "../../lib/format";
import type { OptionChoice, OptionGroup } from "../../lib/types";

/** Los sabores de un grupo: agregarlos, renombrarlos, ponerles recargo y
 *  borrarlos (F57, F61).
 *
 *  Salió de `EditorDeGrupo` cuando el recargo le agregó un campo a cada
 *  renglón y el archivo se iba de las 300 líneas (R05).
 *
 *  **El nombre y el recargo se guardan juntos**, con un solo PUT: son la misma
 *  edición de la misma fila, y separarlos haría que renombrar un sabor con
 *  recargo pidiera dos pasos. Vacío es cero, que es cómo se saca un recargo.
 */
export function SaboresDelGrupo({
  grupo,
  onCrearOpcion,
  onEditarOpcion,
  onBorrarOpcion,
}: {
  grupo: OptionGroup;
  onCrearOpcion: (grupoId: number, nombre: string, recargo: number) => void;
  onEditarOpcion: (grupoId: number, opcionId: number, nombre: string, recargo: number) => void;
  onBorrarOpcion: (grupoId: number, opcionId: number) => void;
}) {
  const [sabor, setSabor] = useState("");
  const [recargoNuevo, setRecargoNuevo] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [recargo, setRecargo] = useState("");
  const [aviso, setAviso] = useState("");

  const MAL_EL_RECARGO = "El recargo tiene que ser 0 o más, sin signos ni letras.";

  /** Lo que se va a cobrar, mientras tipea. El campo del precio del tamaño
   *  ya lo hace, y acá hacía más falta: escribir "1.500" pensando mil
   *  quinientos y que entre $1,50 es plata cobrada de menos que nadie nota
   *  hasta que suma el pedido a mano (review de T20). */
  const eco = (texto: string): string => {
    if (!texto.trim()) {
      return "";
    }
    const monto = recargoTipeado(texto);
    if (monto === null) {
      return MAL_EL_RECARGO;
    }
    return monto > 0
      ? `Se va a cobrar +${formatCurrency(monto, { conCentavos: !Number.isInteger(monto) })}`
      : "Sin recargo";
  };

  const agregar = () => {
    const limpio = sabor.trim();
    const monto = recargoTipeado(recargoNuevo);
    if (!limpio) {
      return;
    }
    if (monto === null) {
      setAviso(MAL_EL_RECARGO);
      return;
    }
    setAviso("");
    onCrearOpcion(grupo.id, limpio, monto);
    setSabor("");
    setRecargoNuevo("");
  };

  const abrir = (opcion: OptionChoice) => {
    setEditando(opcion.id);
    setNombre(opcion.name);
    // El cero no se escribe: el campo vacío y el cero son lo mismo, y
    // mostrar "0" invita a borrarlo para después escribir el número.
    setRecargo(opcion.price_delta ? String(opcion.price_delta) : "");
    setAviso("");
  };

  const guardar = (opcion: OptionChoice) => {
    const limpio = nombre.trim();
    const monto = recargoTipeado(recargo);
    if (!limpio) {
      return;
    }
    if (monto === null) {
      setAviso(MAL_EL_RECARGO);
      return;
    }
    setAviso("");
    if (limpio !== opcion.name || monto !== (opcion.price_delta ?? 0)) {
      onEditarOpcion(grupo.id, opcion.id, limpio, monto);
    }
    setEditando(null);
  };

  /** Escape cancela lo que se está editando, **no** el pop-up: sin esto el
   *  evento llega al `<dialog>` y cierra todo (lo marcó el reviewer de T19). */
  const cancelarConEscape = (evento: React.KeyboardEvent, cancelar: () => void) => {
    if (evento.key === "Escape") {
      evento.stopPropagation();
      cancelar();
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-tinta-tenue">
        Los sabores de {grupo.name}
      </p>
      <p className="mt-1 text-xs leading-5 text-tinta-suave">
        Si un sabor sale más caro, ponele un recargo: se le suma al precio del tamaño que elija el
        cliente. Sin recargo, no cambia nada.
      </p>

      <ul className="mt-3 space-y-2">
        {grupo.options.map((opcion) => (
          <li key={opcion.id} className="border-[3px] border-borde bg-superficie-alt p-2">
            {editando === opcion.id ? (
              <div className="flex flex-wrap gap-2">
                <input
                  className="field min-w-32 flex-1"
                  value={nombre}
                  autoFocus
                  onChange={(evento) => setNombre(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter") {
                      evento.preventDefault();
                      guardar(opcion);
                    }
                    cancelarConEscape(evento, () => setEditando(null));
                  }}
                  aria-label={`Nuevo nombre para ${opcion.name}`}
                />
                <input
                  className="field w-24 shrink-0"
                  value={recargo}
                  inputMode="decimal"
                  placeholder="+$"
                  onChange={(evento) => setRecargo(evento.target.value)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter") {
                      evento.preventDefault();
                      guardar(opcion);
                    }
                    cancelarConEscape(evento, () => setEditando(null));
                  }}
                  aria-label={`Recargo de ${opcion.name}`}
                />
                <button
                  className="btn-secondary shrink-0 px-3"
                  type="button"
                  onClick={() => guardar(opcion)}
                  aria-label={`Guardar ${opcion.name}`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  className="btn-secondary shrink-0 px-3"
                  type="button"
                  onClick={() => setEditando(null)}
                  aria-label={`Dejar ${opcion.name} como estaba`}
                >
                  <X className="h-4 w-4" />
                </button>
                {eco(recargo) ? (
                  <p className="w-full text-xs text-tinta-suave">{eco(recargo)}</p>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-words text-sm font-bold text-tinta">
                  {opcion.name}
                  {textoDelRecargo(opcion) ? (
                    <span className="ml-2 font-normal text-tinta-suave">
                      {textoDelRecargo(opcion)}
                    </span>
                  ) : null}
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="btn-secondary px-2 py-1 text-xs"
                    type="button"
                    onClick={() => abrir(opcion)}
                  >
                    Editar
                  </button>
                  {/* Un sabor se borra sin preguntar, al revés que el grupo:
                      es una palabra que se vuelve a escribir en dos segundos,
                      y un pop-up adentro de otro pop-up es peor que el riesgo
                      que evita. */}
                  <button
                    className="btn-secondary px-2 py-1 text-xs"
                    type="button"
                    onClick={() => onBorrarOpcion(grupo.id, opcion.id)}
                    aria-label={`Borrar ${opcion.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {grupo.options.length === 0 ? (
        <p className="mt-3 border-[3px] border-dashed border-borde p-3 text-xs leading-5 text-tinta-suave">
          Este grupo todavía no tiene sabores. Mientras esté vacío, el cliente no puede elegir nada.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className="field min-w-32 flex-1"
          value={sabor}
          onChange={(evento) => setSabor(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              agregar();
            }
          }}
          placeholder={`Agregar a ${grupo.name}: dulce de leche, frutilla…`}
          aria-label={`Sabor nuevo para ${grupo.name}`}
        />
        <input
          className="field w-24 shrink-0"
          value={recargoNuevo}
          inputMode="decimal"
          placeholder="+$"
          onChange={(evento) => setRecargoNuevo(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              agregar();
            }
          }}
          aria-label={`Recargo del sabor nuevo de ${grupo.name}`}
        />
        <button
          className="btn-secondary shrink-0 px-3"
          type="button"
          onClick={agregar}
          disabled={!sabor.trim()}
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
        {eco(recargoNuevo) ? (
          <p className="w-full text-xs text-tinta-suave">{eco(recargoNuevo)}</p>
        ) : null}
      </div>

      {aviso ? (
        <p className="mt-2 border-[3px] border-borde bg-superficie-alt px-3 py-2 text-xs leading-5 text-tinta">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
