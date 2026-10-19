import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";

import type { OptionGroup } from "../../lib/types";

/** Un grupo con sus sabores: renombrar, agregar, borrar (F57).
 *
 *  Vive en su propio archivo porque `OpcionesTab` ya arma el formulario de
 *  alta y la lista (R05), y porque cada grupo tiene su propio estado de
 *  edición: el nombre que se está tipeando en "Relleno" no tiene nada que ver
 *  con el de "Bizcocho".
 */
export function GrupoDeOpciones({
  grupo,
  usos,
  onRenombrar,
  onObligatoriedad,
  onBorrar,
  onCrearOpcion,
  onRenombrarOpcion,
  onBorrarOpcion,
}: {
  grupo: OptionGroup;
  usos: number;
  onRenombrar: (id: number, nombre: string) => void;
  onObligatoriedad: (id: number, obligatorio: boolean) => void;
  onBorrar: (id: number) => void;
  onCrearOpcion: (grupoId: number, nombre: string) => void;
  onRenombrarOpcion: (grupoId: number, opcionId: number, nombre: string) => void;
  onBorrarOpcion: (grupoId: number, opcionId: number) => void;
}) {
  const [nombreDelGrupo, setNombreDelGrupo] = useState(grupo.name);
  const [editandoGrupo, setEditandoGrupo] = useState(false);
  const [sabor, setSabor] = useState("");
  const [editandoOpcion, setEditandoOpcion] = useState<number | null>(null);
  const [nombreDeOpcion, setNombreDeOpcion] = useState("");
  const [confirmando, setConfirmando] = useState(false);

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

  /** El renglón que lee justo antes de algo que no se deshace. */
  const textoDeBorrado = () => {
    if (usos === 0) {
      return "¿Borrar este grupo y sus sabores? No se deshace. Los pedidos viejos no cambian.";
    }
    if (usos === 1) {
      return "Si lo borrás sale del producto que lo tiene, con todos sus sabores. No se deshace.";
    }
    return `Si lo borrás sale de los ${usos} productos que lo tienen, con todos sus sabores. No se deshace.`;
  };

  return (
    <article className="pixel-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {editandoGrupo ? (
          <div className="flex min-w-0 flex-1 gap-2">
            <input
              className="field"
              value={nombreDelGrupo}
              autoFocus
              onChange={(evento) => setNombreDelGrupo(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  if (nombreDelGrupo.trim() && nombreDelGrupo.trim() !== grupo.name) {
                    onRenombrar(grupo.id, nombreDelGrupo.trim());
                  }
                  setEditandoGrupo(false);
                }
                if (evento.key === "Escape") {
                  setNombreDelGrupo(grupo.name);
                  setEditandoGrupo(false);
                }
              }}
              aria-label={`Nuevo nombre para ${grupo.name}`}
            />
            <button
              className="btn-secondary shrink-0 px-3"
              type="button"
              onClick={() => {
                if (nombreDelGrupo.trim() && nombreDelGrupo.trim() !== grupo.name) {
                  onRenombrar(grupo.id, nombreDelGrupo.trim());
                }
                setEditandoGrupo(false);
              }}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              className="btn-secondary shrink-0 px-3"
              type="button"
              onClick={() => {
                setNombreDelGrupo(grupo.name);
                setEditandoGrupo(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="min-w-0">
            <h3 className="break-words font-display text-2xl font-semibold text-tinta">
              {grupo.name}
            </h3>
            <p className="mt-1 text-xs text-tinta-tenue">
              {grupo.required ? "Obligatorio" : "Opcional"} ·{" "}
              {usos === 0 ? "sin productos" : usos === 1 ? "en 1 producto" : `en ${usos} productos`}
            </p>
          </div>
        )}

        <div className="flex shrink-0 gap-2">
          <button
            className="btn-secondary px-3 py-1 text-xs"
            type="button"
            onClick={() => setEditandoGrupo((actual) => !actual)}
          >
            Renombrar
          </button>
          <button
            className="btn-secondary px-3 py-1 text-xs"
            type="button"
            onClick={() => setConfirmando(true)}
            aria-label={`Borrar ${grupo.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <label className="mt-3 flex items-center gap-3 border-[3px] border-borde bg-superficie px-4 py-2 text-xs font-medium text-tinta-suave">
        <input
          type="checkbox"
          checked={grupo.required}
          onChange={(evento) => onObligatoriedad(grupo.id, evento.target.checked)}
        />
        Hay que elegir uno para poder pedir
      </label>

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

      {confirmando ? (
        <div className="mt-3 border-t-[3px] border-borde pt-3">
          <p className="text-xs leading-5 text-tinta">{textoDeBorrado()}</p>
          <div className="mt-2 flex gap-2">
            <button
              className="btn-primary px-3 py-1 text-xs"
              type="button"
              onClick={() => {
                onBorrar(grupo.id);
                setConfirmando(false);
              }}
            >
              Sí, borrar
            </button>
            <button
              className="btn-secondary px-3 py-1 text-xs"
              type="button"
              onClick={() => setConfirmando(false)}
            >
              No
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
