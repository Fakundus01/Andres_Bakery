import { useState } from "react";
import { LoaderCircle, WandSparkles } from "lucide-react";

import { SubirFoto } from "../../components/SubirFoto";
import { Field } from "../../components/ui";
import { aiApi } from "../../lib/api";
import { getErrorMessage } from "../../lib/format";
import type { BorradorReceta } from "../../lib/types";

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
}: {
  imagenUrl: string;
  nombre: string;
  token: string;
  iaPrendida: boolean;
  onImagen: (url: string) => void;
  onBorrador: (borrador: BorradorReceta) => void;
}) {
  const [pidiendo, setPidiendo] = useState(false);
  const [error, setError] = useState("");
  const [ingredientesSugeridos, setIngredientesSugeridos] = useState<string[]>([]);

  const esSubida = imagenUrl.startsWith("/uploads/");

  const pedirBorrador = async () => {
    setError("");
    setPidiendo(true);
    try {
      const borrador = await aiApi.borradorDeReceta(imagenUrl, nombre, token);
      // Los ingredientes se muestran acá y no se guardan solos: elegirlos desde
      // el panel es F20, que todavía está a mitad de camino. Mejor a la vista
      // que descartados en silencio.
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
                {ingredientesSugeridos.map((ingrediente) => (
                  <li
                    key={ingrediente}
                    className="border-[3px] border-borde bg-superficie px-2 py-1 text-xs font-bold text-tinta"
                  >
                    {ingrediente}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs leading-5 text-tinta-suave">
                Quedan a la vista para que los copies: cargar ingredientes desde el panel todavía no está
                terminado, así que estos no se guardan solos.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
