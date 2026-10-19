import { useState } from "react";
import { LoaderCircle, WandSparkles } from "lucide-react";

import { SubirFoto } from "../../components/SubirFoto";
import { Field } from "../../components/ui";
import { aiApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/format";
import { estadoDelSugerido, normalizar } from "../../lib/ingredientes";
import type { BorradorReceta, Ingredient } from "../../lib/types";

/** La foto del producto y, si está prendida, la ayuda de la IA (F45, F46, F49).
 *
 *  Van juntas porque el asistente necesita una foto ya subida: pedirle un
 *  borrador sobre una URL externa haría que el back descargue lo que le
 *  manden, y eso no se habilita (ADR-020).
 */
export function FotoDelProducto({
  imagenUrl,
  nombre,
  token,
  iaPrendida,
  onImagen,
  onBorrador,
  ingredientes,
  elegidos,
  onAlternarIngrediente,
  onCrearIngrediente,
}: {
  imagenUrl: string;
  nombre: string;
  token: string;
  iaPrendida: boolean;
  onImagen: (url: string) => void;
  onBorrador: (borrador: BorradorReceta) => void;
  ingredientes: Ingredient[];
  elegidos: number[];
  onAlternarIngrediente: (id: number) => void;
  onCrearIngrediente: (nombre: string) => Promise<Ingredient | null>;
}) {
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState("");
  const [ingredientesSugeridos, setIngredientesSugeridos] = useState<string[]>([]);

  const [agregando, setAgregando] = useState("");

  const esSubida = imagenUrl.startsWith("/uploads/");

  /** Un sugerido que ya existe se marca; uno nuevo se crea y se marca. El que
   *  ya estaba elegido no hace nada: el botón está deshabilitado.
   *
   *  El guard de "en vuelo" compara el nombre **normalizado**, no el string
   *  crudo: la IA puede proponer "manteca" y "Manteca" en la misma lista, y
   *  como la unicidad del back es por nombre exacto, clickearlos a los dos en
   *  la ventana de la carrera creaba las dos filas — justo el duplicado que
   *  esta feature existe para evitar (lo marcó el reviewer). */
  const agregarSugerido = async (sugerido: string) => {
    const { estado, ingrediente } = estadoDelSugerido(ingredientes, elegidos, sugerido);
    if (estado === "elegido") {
      return;
    }
    if (ingrediente) {
      onAlternarIngrediente(ingrediente.id);
      return;
    }

    setAgregando(normalizar(sugerido));
    const creado = await onCrearIngrediente(sugerido);
    setAgregando("");
    if (creado && !elegidos.includes(creado.id)) {
      onAlternarIngrediente(creado.id);
    }
  };

  const pedirBorrador = async () => {
    setError("");
    setPidiendo(true);
    try {
      const borrador = await aiApi.borradorDeReceta(imagenUrl, nombre, token);
      // Siguen sin guardarse solos: cada uno entra con un clic de ella. Lo
      // que escribe una IA se revisa antes de que quede en la carta (ADR-020).
      setIngredientesSugeridos(borrador.ingredients);
      onBorrador(borrador);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason));
    } finally {
      setPidiendo(false);
    }
  };

  return (
    <div className="space-y-3">
      <SubirFoto
        valor={imagenUrl}
        token={token}
        etiqueta="Foto del producto"
        onSubida={onImagen}
        onBorrar={() => onImagen("")}
      />

      <Field label="…o pegá el link de una foto que ya tengas">
        <input
          className="field"
          value={imagenUrl}
          onChange={(event) => onImagen(event.target.value)}
          placeholder="https://..."
        />
      </Field>

      {iaPrendida ? (
        <div className="border-[3px] border-borde bg-superficie-alt p-3">
          <button
            className="btn-secondary w-full justify-center px-3 py-2 text-sm"
            type="button"
            onClick={() => void pedirBorrador()}
            disabled={pidiendo || !esSubida}
          >
            {pidiendo ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {pidiendo ? "Mirando la foto…" : "Que la IA complete la receta"}
          </button>
          <p className="mt-2 text-xs leading-5 text-tinta-suave">
            {esSubida
              ? "Mira la foto y deja un borrador de descripción, ingredientes y pasos. Lo escribe una IA: leelo y corregilo antes de guardar. Nunca propone etiquetas como “sin TACC”: esas las ponés vos."
              : "Primero subí la foto acá arriba y después pedile el borrador."}
          </p>
          {error ? <p className="mt-2 text-xs leading-5 text-tinta">{error}</p> : null}

          {ingredientesSugeridos.length > 0 ? (
            <div className="mt-3 border-t-[3px] border-borde pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">
                Ingredientes que propuso
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {ingredientesSugeridos.map((sugerido) => {
                  const { estado, ingrediente } = estadoDelSugerido(ingredientes, elegidos, sugerido);
                  return (
                    <li key={sugerido}>
                      <button
                        type="button"
                        disabled={estado === "elegido" || agregando === normalizar(sugerido)}
                        onClick={() => void agregarSugerido(sugerido)}
                        className={`max-w-full break-words border-[3px] border-borde px-2 py-1 text-left text-xs font-bold ${
                          estado === "elegido" ? "bg-acento text-crema" : "bg-superficie text-tinta"
                        }`}
                      >
                        {estado === "elegido" ? "✓ " : "+ "}
                        {ingrediente ? ingrediente.name : sugerido}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs leading-5 text-tinta-suave">
                Tocá los que quieras y se agregan al producto. El que ya existe en tu lista se reusa
                aunque la IA lo haya escrito distinto; el que no, se crea.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
