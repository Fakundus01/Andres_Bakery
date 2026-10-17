import { Plus, Trash2 } from "lucide-react";

import { Field } from "../../components/ui";
import type { EntradaCv } from "../../lib/types";

/** Las listas del CV: experiencia y formación se editan igual, así que es un
 *  solo componente y no dos copias (vive aparte para que `PerfilTab` no pase
 *  de 300 líneas, R05). */
export function ListaDeEntradas({
  titulo,
  entradas,
  agregar,
  cambiar,
  borrar,
}: {
  titulo: string;
  entradas: EntradaCv[];
  agregar: () => void;
  cambiar: (indice: number, cambios: Partial<EntradaCv>) => void;
  borrar: (indice: number) => void;
}) {
  return (
    <div className="space-y-3 border-t-[3px] border-borde pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-2xl font-bold text-tinta">{titulo}</p>
        <button className="btn-secondary px-3 py-2 text-sm" type="button" onClick={agregar}>
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {entradas.length === 0 ? (
        <p className="border-[3px] border-dashed border-borde p-3 text-sm leading-6 text-tinta-suave">
          Vacío por ahora. Lo que no cargues no aparece en el CV.
        </p>
      ) : null}

      {entradas.map((entrada, indice) => (
        <div key={indice} className="space-y-3 border-[3px] border-borde p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
            <input
              className="field"
              value={entrada.title}
              onChange={(evento) => cambiar(indice, { title: evento.target.value })}
              placeholder="Qué hacías / qué estudiaste"
            />
            <input
              className="field"
              value={entrada.place ?? ""}
              onChange={(evento) => cambiar(indice, { place: evento.target.value })}
              placeholder="Dónde"
            />
            <input
              className="field"
              value={entrada.period ?? ""}
              onChange={(evento) => cambiar(indice, { period: evento.target.value })}
              placeholder="2021 – hoy"
            />
            <button
              className="btn-secondary px-3"
              type="button"
              aria-label={`Quitar de ${titulo}`}
              onClick={() => borrar(indice)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <Field label="Detalle (opcional)">
            <textarea
              className="field min-h-20"
              value={entrada.detail ?? ""}
              onChange={(evento) => cambiar(indice, { detail: evento.target.value })}
            />
          </Field>
        </div>
      ))}

      <p className="text-xs leading-5 text-tinta-suave">
        Sin el primer campo cargado, la entrada no se guarda.
      </p>
    </div>
  );
}
