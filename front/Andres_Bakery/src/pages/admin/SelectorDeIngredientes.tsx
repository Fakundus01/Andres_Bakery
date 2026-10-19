import { useState, type KeyboardEvent } from "react";
import { LoaderCircle, Plus, Settings2 } from "lucide-react";

import { buscarIngrediente } from "../../lib/ingredientes";
import { AdministrarIngredientes } from "./AdministrarIngredientes";
import type { Ingredient } from "../../lib/types";

/** Los ingredientes de un producto (F20).
 *
 *  El m2m y el CRUD existían desde T3 y nadie los usaba: esto es la pantalla
 *  que faltaba. Vive en su propio archivo porque `ProductsTab` ya estaba en
 *  239 líneas (R05).
 */
export function SelectorDeIngredientes({
  ingredientes,
  elegidos,
  usos,
  onAlternar,
  onCrear,
  onRenombrar,
  onBorrar,
}: {
  ingredientes: Ingredient[];
  elegidos: number[];
  usos: Record<number, number>;
  onAlternar: (id: number) => void;
  onCrear: (nombre: string) => Promise<Ingredient | null>;
  onRenombrar: (id: number, nombre: string) => void;
  onBorrar: (id: number) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  /** El banner de error del panel vive arriba de todo: a 375px el alta
   *  fallaba en silencio justo donde ella está mirando. Este aviso va
   *  pegado al campo, y en castellano (los mensajes del back siguen en
   *  inglés, D15). */
  const [aviso, setAviso] = useState("");
  const [administrando, setAdministrando] = useState(false);

  const agregar = async () => {
    const limpio = nombre.trim();
    if (!limpio || creando) {
      return;
    }
    setAviso("");

    // Si ya existe escrito de otra forma ("azucar" por "Azúcar"), se marca el
    // que hay en vez de crear el duplicado: la lista es de ella y nadie la
    // limpia después.
    const existente = buscarIngrediente(ingredientes, limpio);
    if (existente) {
      if (!elegidos.includes(existente.id)) {
        onAlternar(existente.id);
      }
      setNombre("");
      return;
    }

    setCreando(true);
    const creado = await onCrear(limpio);
    setCreando(false);
    if (creado) {
      // Puede volver uno que ya existía (lo rescata `altaDeIngrediente`): en
      // ese caso marcarlo de nuevo lo desmarcaría.
      if (!elegidos.includes(creado.id)) {
        onAlternar(creado.id);
      }
      setNombre("");
      return;
    }
    setAviso(`No se pudo agregar «${limpio}». Fijate el aviso de arriba y probá de nuevo.`);
  };

  /** Enter adentro de un `<input>` manda el formulario que lo contiene, y el
   *  que lo contiene es el del producto: sin esto, escribir "Manteca" y
   *  apretar Enter guardaba el producto a medio cargar. */
  const alTeclear = (evento: KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      void agregar();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-tinta-suave">Ingredientes</p>
        {ingredientes.length > 0 ? (
          <button
            className="btn-secondary px-2 py-1 text-xs"
            type="button"
            aria-pressed={administrando}
            onClick={() => setAdministrando((actual) => !actual)}
          >
            <Settings2 className="h-4 w-4" />
            {administrando ? "Listo" : "Corregir o borrar"}
          </button>
        ) : null}
      </div>

      {administrando ? (
        <AdministrarIngredientes
          ingredientes={ingredientes}
          usos={usos}
          onRenombrar={onRenombrar}
          onBorrar={onBorrar}
        />
      ) : ingredientes.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {ingredientes.map((ingrediente) => (
            <button
              key={ingrediente.id}
              type="button"
              aria-pressed={elegidos.includes(ingrediente.id)}
              onClick={() => onAlternar(ingrediente.id)}
              className={`max-w-full break-words border-[3px] border-borde px-3 py-1.5 text-left text-xs font-bold ${
                elegidos.includes(ingrediente.id)
                  ? "bg-acento text-crema"
                  : "bg-superficie-alt text-tinta"
              }`}
            >
              {ingrediente.name}
              {ingrediente.unit ? (
                <span className="ml-1 font-normal opacity-80">({ingrediente.unit})</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 border-[3px] border-dashed border-borde p-3 text-xs leading-5 text-tinta-suave">
          Todavía no hay ingredientes cargados. Escribí el primero acá abajo.
        </p>
      )}

      {aviso ? (
        <p className="mt-2 border-[3px] border-borde bg-superficie px-3 py-2 text-xs leading-5 text-tinta">
          {aviso}
        </p>
      ) : null}

      <div className="mt-2 flex gap-2">
        <input
          className="field"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          onKeyDown={alTeclear}
          placeholder="Agregar uno nuevo: manteca, nuez..."
          aria-label="Nombre del ingrediente nuevo"
        />
        <button
          className="btn-secondary shrink-0 px-3"
          type="button"
          onClick={() => void agregar()}
          disabled={!nombre.trim() || creando}
        >
          {creando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-tinta-tenue">
        Los ingredientes se comparten entre todos los productos: si ya cargaste "Manteca" en otro, es
        la misma de acá. Se ven en el dorso de la tarjeta y en la ficha.
      </p>
    </div>
  );
}
