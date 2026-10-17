import type { Dispatch, FormEvent, SetStateAction } from "react";

import { TagBadge } from "../../components/TagBadge";
import { Field } from "../../components/ui";
import type { Tag } from "../../lib/types";
import type { TagForm } from "../../lib/ui-types";

// Los mismos nombres que valida el back (`tag_service.COLOR_TOKENS`).
const COLORES: Array<{ id: string; label: string }> = [
  { id: "acento", label: "Rosa / principal" },
  { id: "acento-2", label: "Verde / secundario" },
  { id: "exito", label: "Verde oscuro" },
  { id: "alerta", label: "Mostaza" },
  { id: "error", label: "Rojo" },
  { id: "tinta", label: "Marrón oscuro" },
];

export function TagsTab({
  tags,
  tagForm,
  setTagForm,
  editingTagId,
  setEditingTagId,
  onSubmit,
  onReset,
  onDelete,
}: {
  tags: Tag[];
  tagForm: TagForm;
  setTagForm: Dispatch<SetStateAction<TagForm>>;
  editingTagId: number | null;
  setEditingTagId: Dispatch<SetStateAction<number | null>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onDelete: (tagId: number) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <form className="pixel-panel space-y-4 p-6" onSubmit={onSubmit}>
        <h3 className="font-display text-3xl font-semibold text-tinta">
          {editingTagId ? "Editar etiqueta" : "Nueva etiqueta"}
        </h3>

        <p className="border-[3px] border-borde bg-alerta-suave p-3 text-xs leading-5 text-tinta">
          Ojo con "sin TACC" y las etiquetas de alérgenos: lo que pongas acá es{" "}
          <strong>tu declaración</strong>. La web la muestra tal cual, no la certifica.
        </p>

        <Field label="Nombre">
          <input
            className="field"
            value={tagForm.name}
            onChange={(event) => setTagForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="sin TACC, vegano, frío..."
            required
          />
        </Field>

        <Field label="Color">
          <select
            className="field"
            value={tagForm.color_token}
            onChange={(event) => setTagForm((current) => ({ ...current, color_token: event.target.value }))}
          >
            {COLORES.map((color) => (
              <option key={color.id} value={color.id}>{color.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Orden">
          <input
            className="field"
            type="number"
            step="1"
            value={tagForm.sort_order}
            onChange={(event) => setTagForm((current) => ({ ...current, sort_order: event.target.value }))}
          />
        </Field>
        <p className="text-xs leading-5 text-tinta-tenue">
          El número más chico aparece primero en los filtros de la carta.
        </p>

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" type="submit">{editingTagId ? "Guardar cambios" : "Crear etiqueta"}</button>
          <button className="btn-secondary" type="button" onClick={onReset}>Limpiar</button>
        </div>
      </form>

      <div className="pixel-panel p-6">
        <h3 className="font-display text-2xl font-semibold text-tinta">Las que ya tenés</h3>
        {tags.length === 0 ? (
          <p className="mt-4 border-[3px] border-dashed border-borde p-5 text-sm leading-6 text-tinta-suave">
            Todavía no hay ninguna. Las etiquetas no vienen puestas de fábrica a propósito: las que
            importan en tu carta las sabés vos.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-borde bg-superficie-alt p-4"
              >
                <div className="flex items-center gap-3">
                  <TagBadge tag={tag} torcido={false} />
                  <code className="text-xs text-tinta-tenue">/{tag.slug}</code>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs"
                    type="button"
                    onClick={() => {
                      setEditingTagId(tag.id);
                      setTagForm({ name: tag.name, color_token: tag.color_token, sort_order: String(tag.sort_order) });
                    }}
                  >
                    Editar
                  </button>
                  <button className="btn-secondary px-3 py-1.5 text-xs" type="button" onClick={() => onDelete(tag.id)}>
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
