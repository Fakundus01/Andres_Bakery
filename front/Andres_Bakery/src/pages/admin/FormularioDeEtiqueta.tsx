import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Field } from "../../components/ui";
import type { TagForm } from "../../lib/ui-types";

/** El id del `<form>`, para que el botón de guardar viva en el pie del pop-up
 *  (el mismo truco de `FormularioDeProducto`: `button[form=...]`). */
export const ID_DEL_FORMULARIO_DE_ETIQUETA = "formulario-de-etiqueta";

// Los mismos nombres que valida el back (`tag_service.COLOR_TOKENS`).
const COLORES: Array<{ id: string; label: string }> = [
  { id: "acento", label: "Rosa / principal" },
  { id: "acento-2", label: "Verde / secundario" },
  { id: "exito", label: "Verde oscuro" },
  { id: "alerta", label: "Mostaza" },
  { id: "error", label: "Rojo" },
  { id: "tinta", label: "Marrón oscuro" },
];

/** Cargar o editar una etiqueta. Salió de `TagsTab` para poder mostrarse en
 *  dos lugares: en la página (celular) y adentro del pop-up (computadora,
 *  ADR-034 extendido en ADR-035). */
export function FormularioDeEtiqueta({
  tagForm,
  setTagForm,
  onSubmit,
}: {
  tagForm: TagForm;
  setTagForm: Dispatch<SetStateAction<TagForm>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form id={ID_DEL_FORMULARIO_DE_ETIQUETA} className="space-y-4" onSubmit={onSubmit}>
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
    </form>
  );
}
