import { useState } from "react";
import { Check, X } from "lucide-react";

import { Field } from "../../components/ui";
import { SaboresDelGrupo } from "./SaboresDelGrupo";
import type { OptionGroup } from "../../lib/types";

/** Editar un grupo: el nombre, si es obligatorio y sus sabores (F57).
 *
 *  Salió de `GrupoDeOpciones`, que mezclaba la tarjeta con la edición y ya
 *  pasaba las 270 líneas (R05). Ahora la tarjeta solo muestra, y esto edita:
 *  en computadora adentro de un pop-up, en celular abierto en la propia
 *  tarjeta (ADR-034, ADR-035). La lista de sabores vive en `SaboresDelGrupo`
 *  desde que cada uno tiene su recargo (F61).
 *
 *  **Cada cosa se guarda cuando la hacés**, no al final: renombrar el grupo,
 *  marcar obligatorio y agregar un sabor son tres llamadas distintas al back.
 *  Por eso el pie del pop-up dice "Listo" y no "Guardar cambios": prometer un
 *  guardado que ya pasó sería mentir.
 *
 *  El nombre, eso sí, **se guarda con Enter o con el tilde**, no al salir del
 *  campo. Guardarlo en el `blur` parecía más cómodo y era una trampa: cualquier
 *  clic afuera —incluido el de cerrar— mandaba el PUT, así que no había forma
 *  de tipear un nombre y después abandonarlo (lo marcó el reviewer de T19).
 */
export function EditorDeGrupo({
  grupo,
  onRenombrar,
  onObligatoriedad,
  onCrearOpcion,
  onEditarOpcion,
  onBorrarOpcion,
}: {
  grupo: OptionGroup;
  onRenombrar: (id: number, nombre: string) => void;
  onObligatoriedad: (id: number, obligatorio: boolean) => void;
  onCrearOpcion: (grupoId: number, nombre: string, recargo: number) => void;
  onEditarOpcion: (grupoId: number, opcionId: number, nombre: string, recargo: number) => void;
  onBorrarOpcion: (grupoId: number, opcionId: number) => void;
}) {
  const [nombre, setNombre] = useState(grupo.name);

  const guardarNombre = () => {
    const limpio = nombre.trim();
    if (limpio && limpio !== grupo.name) {
      onRenombrar(grupo.id, limpio);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Nombre del grupo">
        <div className="flex gap-2">
          <input
            className="field"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                guardarNombre();
              }
              if (evento.key === "Escape" && nombre !== grupo.name) {
                // Sin esto el Escape sigue burbujeando hasta el `<dialog>`, que
                // cierra el pop-up entero: la misma tecla hacía dos cosas
                // distintas según el ancho de la pantalla.
                evento.stopPropagation();
                setNombre(grupo.name);
              }
            }}
            aria-label={`Nombre de ${grupo.name}`}
          />
          <button
            className="btn-secondary shrink-0 px-3"
            type="button"
            onClick={guardarNombre}
            aria-label="Guardar el nombre"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            className="btn-secondary shrink-0 px-3"
            type="button"
            onClick={() => setNombre(grupo.name)}
            disabled={nombre === grupo.name}
            aria-label="Dejar el nombre como estaba"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Field>

      <label className="flex items-center gap-3 border-[3px] border-borde bg-superficie px-4 py-3 text-sm font-medium text-tinta-suave">
        <input
          type="checkbox"
          checked={grupo.required}
          onChange={(evento) => onObligatoriedad(grupo.id, evento.target.checked)}
        />
        Hay que elegir uno para poder pedir
      </label>

      <SaboresDelGrupo
        grupo={grupo}
        onCrearOpcion={onCrearOpcion}
        onEditarOpcion={onEditarOpcion}
        onBorrarOpcion={onBorrarOpcion}
      />
    </div>
  );
}
