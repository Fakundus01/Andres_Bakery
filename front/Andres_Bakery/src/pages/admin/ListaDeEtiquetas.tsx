import { TagBadge } from "../../components/TagBadge";
import { textoDeUso } from "../../lib/borrados";
import type { Tag } from "../../lib/types";

/** Las etiquetas que ya existen, con en cuántos productos está cada una.
 *
 *  Salió de `TagsTab` cuando la pestaña pasó a orquestar el pop-up (R05). El
 *  conteo no es decorativo: es lo que vuelve entendible el cartel de borrado.
 */
export function ListaDeEtiquetas({
  tags,
  usos,
  conTitulo = false,
  onEditar,
  onPedirBorrado,
}: {
  tags: Tag[];
  usos: Record<number, number>;
  /** En celular la lista va abajo del formulario y necesita su encabezado;
   *  en computadora es lo único que hay en la pantalla y el título sobra. */
  conTitulo?: boolean;
  onEditar: (tag: Tag) => void;
  onPedirBorrado: (tag: Tag) => void;
}) {
  if (tags.length === 0) {
    return (
      <p className="pixel-panel border-dashed p-6 text-sm leading-6 text-tinta-suave">
        Todavía no hay ninguna. Las etiquetas no vienen puestas de fábrica a propósito: las que
        importan en tu carta las sabés vos.
      </p>
    );
  }

  return (
    <>
      {conTitulo ? (
        <h3 className="font-display text-2xl font-semibold text-tinta">Las que ya tenés</h3>
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {tags.map((tag) => (
          <li
            key={tag.id}
            className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-borde bg-superficie-alt p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <TagBadge tag={tag} torcido={false} />
                <code className="text-xs text-tinta-tenue">/{tag.slug}</code>
              </div>
              <p className="mt-1 text-xs text-tinta-tenue">{textoDeUso(usos[tag.id] ?? 0)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="btn-secondary px-3 py-1.5 text-xs"
                type="button"
                onClick={() => onEditar(tag)}
              >
                Editar
              </button>
              <button
                className="btn-secondary px-3 py-1.5 text-xs"
                type="button"
                onClick={() => onPedirBorrado(tag)}
              >
                Borrar
              </button>
            </div>
            </li>
        ))}
      </ul>
    </>
  );
}
