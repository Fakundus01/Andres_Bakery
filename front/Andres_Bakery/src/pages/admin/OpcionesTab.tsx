import { useState } from "react";
import { Plus } from "lucide-react";

import { Field } from "../../components/ui";
import { NOMBRE_TAG_PERSONALIZABLE } from "../../lib/carrito";
import { GrupoDeOpciones } from "./GrupoDeOpciones";
import type { OptionGroup } from "../../lib/types";

/** Los gustos que ofrece la casa (F57, ADR-031).
 *
 *  Acá es donde ella decide **qué se puede elegir**: "Bizcocho" con sus
 *  sabores, "Relleno" con los suyos. Después, en cada torta, marca qué grupos
 *  aplican; el cliente elige de esa lista y nada más. Si pudiera escribir el
 *  sabor, el pedido sería una carta de deseos.
 *
 *  Los grupos son globales como las etiquetas y los ingredientes: "Relleno"
 *  se escribe una vez y lo reusan todas las tortas que lo lleven.
 */
export function OpcionesTab({
  grupos,
  usos,
  buscarGrupo,
  etiquetaLista,
  onCrearEtiqueta,
  onCrearGrupo,
  onRenombrarGrupo,
  onObligatoriedad,
  onBorrarGrupo,
  onCrearOpcion,
  onRenombrarOpcion,
  onBorrarOpcion,
}: {
  grupos: OptionGroup[];
  usos: Record<number, number>;
  buscarGrupo: (nombre: string) => OptionGroup | null;
  /** ¿Existe ya la etiqueta que habilita la personalización? */
  etiquetaLista: boolean;
  onCrearEtiqueta: () => void;
  onCrearGrupo: (nombre: string, obligatorio: boolean) => void;
  onRenombrarGrupo: (id: number, nombre: string) => void;
  onObligatoriedad: (id: number, obligatorio: boolean) => void;
  onBorrarGrupo: (id: number) => void;
  onCrearOpcion: (grupoId: number, nombre: string) => void;
  onRenombrarOpcion: (grupoId: number, opcionId: number, nombre: string) => void;
  onBorrarOpcion: (grupoId: number, opcionId: number) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [obligatorio, setObligatorio] = useState(true);
  const [aviso, setAviso] = useState("");

  const crear = () => {
    const limpio = nombre.trim();
    if (!limpio) {
      return;
    }
    // Si ya existe escrito de otra forma, se dice en vez de mandar un alta
    // que el back va a resolver devolviendo el que estaba: así ella entiende
    // por qué no aparece uno nuevo.
    const existente = buscarGrupo(limpio);
    if (existente) {
      setAviso(`Ya tenés un grupo que se llama «${existente.name}». Agregale los sabores ahí abajo.`);
      setNombre("");
      return;
    }
    setAviso("");
    onCrearGrupo(limpio, obligatorio);
    setNombre("");
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <div className="pixel-panel space-y-4 p-6">
        <h3 className="font-display text-3xl font-semibold text-tinta">Gustos y rellenos</h3>
        <p className="text-sm leading-6 text-tinta-suave">
          Armá un grupo por cada cosa que el cliente elige: Bizcocho, Relleno, Cobertura. Después, en
          cada producto de la carta, marcás qué grupos aplican.
        </p>

        {/* La puerta de la feature, dicha donde se trabaja: sin la etiqueta
            puesta en el producto, la ficha no ofrece nada de esto. */}
        <div className="border-[3px] border-borde bg-superficie-alt p-3 text-xs leading-5 text-tinta-suave">
          <p>
            Esto solo aplica a los productos con la etiqueta{" "}
            <strong>«{NOMBRE_TAG_PERSONALIZABLE}»</strong>. Una docena de cookies no se
            personaliza: se pide y listo.
          </p>
          {etiquetaLista ? (
            <p className="mt-2">La etiqueta ya existe: ponela en tus tortas a pedido.</p>
          ) : (
            <button className="btn-secondary mt-2 px-3 py-1 text-xs" type="button" onClick={onCrearEtiqueta}>
              Crear la etiqueta «{NOMBRE_TAG_PERSONALIZABLE}»
            </button>
          )}
        </div>

        <Field label="Nombre del grupo">
          <input
            className="field"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                evento.preventDefault();
                crear();
              }
            }}
            placeholder="Relleno, Bizcocho, Cobertura…"
          />
        </Field>

        <label className="flex items-center gap-3 border-[3px] border-borde bg-superficie px-4 py-3 text-sm font-medium text-tinta-suave">
          <input
            type="checkbox"
            checked={obligatorio}
            onChange={(evento) => setObligatorio(evento.target.checked)}
          />
          Hay que elegir uno para poder pedir
        </label>
        <p className="border-[3px] border-borde bg-superficie-alt p-3 text-xs leading-5 text-tinta-suave">
          Dejalo marcado para el relleno: una torta sin relleno elegido no es un pedido que puedas
          cumplir. Destildalo para algo que se puede dejar vacío, como una cobertura extra.
        </p>

        <button className="btn-primary" type="button" onClick={crear} disabled={!nombre.trim()}>
          <Plus className="h-4 w-4" />
          Crear grupo
        </button>

        {aviso ? (
          <p className="border-[3px] border-borde bg-superficie px-3 py-2 text-xs leading-5 text-tinta">
            {aviso}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {grupos.length === 0 ? (
          <p className="pixel-panel border-dashed p-6 text-sm leading-6 text-tinta-suave">
            Todavía no creaste ningún grupo. Empezá por “Relleno” y cargale los sabores que hacés.
          </p>
        ) : (
          grupos.map((grupo) => (
            <GrupoDeOpciones
              key={grupo.id}
              grupo={grupo}
              usos={usos[grupo.id] ?? 0}
              onRenombrar={onRenombrarGrupo}
              onObligatoriedad={onObligatoriedad}
              onBorrar={onBorrarGrupo}
              onCrearOpcion={onCrearOpcion}
              onRenombrarOpcion={onRenombrarOpcion}
              onBorrarOpcion={onBorrarOpcion}
            />
          ))
        )}
      </div>
    </section>
  );
}
