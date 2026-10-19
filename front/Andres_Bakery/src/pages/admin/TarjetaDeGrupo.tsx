import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { textoDeUso } from "../../lib/borrados";
import type { OptionGroup } from "../../lib/types";

/** Un grupo como se ve antes de tocarlo: nombre, sabores y en qué está.
 *
 *  Antes la tarjeta **era** el editor: el nombre se renombraba en el lugar y
 *  los sabores se editaban ahí mismo, mientras que un producto se editaba en
 *  un pop-up. Eso es lo que el humano señaló —*"queda como en este lugar sí,
 *  en este lugar no"*— y lo que arregla ADR-035.
 */
export function TarjetaDeGrupo({
  grupo,
  usos,
  abierto,
  onEditar,
  onPedirBorrado,
  editor,
}: {
  grupo: OptionGroup;
  usos: number;
  /** Solo en celular: el editor se abre **dentro** de la tarjeta. */
  abierto: boolean;
  onEditar: () => void;
  onPedirBorrado: () => void;
  /** El editor, cuando va en la página en vez de en el pop-up. */
  editor?: ReactNode;
}) {
  return (
    <article className="pixel-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-display text-2xl font-semibold text-tinta">
            {grupo.name}
          </h3>
          <p className="mt-1 text-xs text-tinta-tenue">
            {grupo.required ? "Obligatorio" : "Opcional"} · {textoDeUso(usos).toLowerCase()}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button className="btn-secondary px-3 py-1 text-xs" type="button" onClick={onEditar}>
            {abierto ? "Cerrar" : "Editar"}
          </button>
          <button
            className="btn-secondary px-3 py-1 text-xs"
            type="button"
            onClick={onPedirBorrado}
            aria-label={`Borrar ${grupo.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {grupo.options.length === 0 ? (
        <p className="mt-3 border-[3px] border-dashed border-borde p-3 text-xs leading-5 text-tinta-suave">
          Sin sabores todavía. Mientras esté vacío, el cliente no puede elegir nada.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {grupo.options.map((opcion) => (
            <li
              key={opcion.id}
              className="border-[3px] border-borde bg-superficie-alt px-3 py-1 text-xs font-bold text-tinta"
            >
              {opcion.name}
            </li>
          ))}
        </ul>
      )}

      {abierto && editor ? (
        <div className="mt-4 border-t-[3px] border-borde pt-4">{editor}</div>
      ) : null}
    </article>
  );
}
