import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import { Field } from "../../components/ui";
import type { OptionGroup } from "../../lib/types";

/** Editar un grupo: el nombre, si es obligatorio y sus sabores (F57).
 *
 *  Salió de `GrupoDeOpciones`, que mezclaba la tarjeta con la edición y ya
 *  pasaba las 270 líneas (R05). Ahora la tarjeta solo muestra, y esto edita:
 *  en computadora adentro de un pop-up, en celular abierto en la propia
 *  tarjeta (ADR-034, ADR-035).
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
  onRenombrarOpcion,
  onBorrarOpcion,
}: {
  grupo: OptionGroup;
  onRenombrar: (id: number, nombre: string) => void;
  onObligatoriedad: (id: number, obligatorio: boolean) => void;
  onCrearOpcion: (grupoId: number, nombre: string) => void;
  onRenombrarOpcion: (grupoId: number, opcionId: number, nombre: string) => void;
  onBorrarOpcion: (grupoId: number, opcionId: number) => void;
}) {
  const [nombre, setNombre] = useState(grupo.name);
  const [sabor, setSabor] = useState("");
  const [editandoOpcion, setEditandoOpcion] = useState<number | null>(null);
  const [nombreDeOpcion, setNombreDeOpcion] = useState("");

  const guardarNombre = () => {
    const limpio = nombre.trim();
    if (limpio && limpio !== grupo.name) {
      onRenombrar(grupo.id, limpio);
    }
  };

  const agregarSabor = () => {
    const limpio = sabor.trim();
    if (!limpio) {
      return;
    }
    onCrearOpcion(grupo.id, limpio);
    setSabor("");
  };

  const guardarOpcion = (opcionId: number, nombreActual: string) => {
    const limpio = nombreDeOpcion.trim();
    if (limpio && limpio !== nombreActual) {
      onRenombrarOpcion(grupo.id, opcionId, limpio);
    }
    setEditandoOpcion(null);
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

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-tinta-tenue">
          Los sabores de {grupo.name}
        </p>

        <ul className="mt-3 space-y-2">
          {grupo.options.map((opcion) => (
            <li key={opcion.id} className="border-[3px] border-borde bg-superficie-alt p-2">
              {editandoOpcion === opcion.id ? (
                <div className="flex gap-2">
                  <input
                    className="field"
                    value={nombreDeOpcion}
                    autoFocus
                    onChange={(evento) => setNombreDeOpcion(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === "Enter") {
                        evento.preventDefault();
                        guardarOpcion(opcion.id, opcion.name);
                      }
                      if (evento.key === "Escape") {
                        evento.stopPropagation();
                        setEditandoOpcion(null);
                      }
                    }}
                    aria-label={`Nuevo nombre para ${opcion.name}`}
                  />
                  <button
                    className="btn-secondary shrink-0 px-3"
                    type="button"
                    onClick={() => guardarOpcion(opcion.id, opcion.name)}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-secondary shrink-0 px-3"
                    type="button"
                    onClick={() => setEditandoOpcion(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 break-words text-sm font-bold text-tinta">
                    {opcion.name}
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className="btn-secondary px-2 py-1 text-xs"
                      type="button"
                      onClick={() => {
                        setEditandoOpcion(opcion.id);
                        setNombreDeOpcion(opcion.name);
                      }}
                    >
                      Renombrar
                    </button>
                    {/* Un sabor se borra sin preguntar, al revés que el grupo:
                        es una palabra que se vuelve a escribir en dos
                        segundos, y un pop-up adentro de otro pop-up es peor
                        que el riesgo que evita. */}
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

        <div className="mt-3 flex gap-2">
          <input
            className="field"
            value={sabor}
            onChange={(evento) => setSabor(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                agregarSabor();
              }
            }}
            placeholder={`Agregar a ${grupo.name}: dulce de leche, frutilla…`}
            aria-label={`Sabor nuevo para ${grupo.name}`}
          />
          <button
            className="btn-secondary shrink-0 px-3"
            type="button"
            onClick={agregarSabor}
            disabled={!sabor.trim()}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
