import { NOMBRE_TAG_PERSONALIZABLE, TAG_PERSONALIZABLE } from "../../lib/carrito";
import type { OptionGroup } from "../../lib/types";

/** Qué grupos de sabores aplican a ESTE producto (F57, ADR-031).
 *
 *  La otra mitad de la frontera: los grupos los define ella en la pestaña
 *  "Gustos", y acá decide cuáles van en cada torta. El cliente solo puede
 *  elegir de los que estén marcados, y el servidor valida lo mismo: un
 *  `option_id` de un grupo que no está acá es un 400.
 */
export function SelectorDeGruposDeOpciones({
  grupos,
  elegidos,
  onAlternar,
  productoEtiquetado,
  etiquetaParecida,
}: {
  grupos: OptionGroup[];
  elegidos: number[];
  onAlternar: (id: number) => void;
  /** ¿Este producto lleva la etiqueta que habilita la personalización? */
  productoEtiquetado: boolean;
  /** El nombre de una etiqueta marcada que **se llama** como la buena pero no
   *  tiene su slug, si hay alguna. Lo que manda es el slug (ADR-033). */
  etiquetaParecida?: string;
}) {
  if (grupos.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold text-tinta-suave">Gustos a elegir</p>
        <p className="mt-2 border-[3px] border-dashed border-borde p-3 text-xs leading-5 text-tinta-suave">
          Todavía no creaste grupos de gustos. Se crean en la pestaña <strong>Gustos</strong>: ahí
          cargás “Relleno” con sus sabores y después lo marcás acá.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-tinta-suave">Gustos a elegir</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {grupos.map((grupo) => (
          <button
            key={grupo.id}
            type="button"
            aria-pressed={elegidos.includes(grupo.id)}
            onClick={() => onAlternar(grupo.id)}
            className={`max-w-full break-words border-[3px] border-borde px-3 py-1.5 text-left text-xs font-bold ${
              elegidos.includes(grupo.id) ? "bg-acento text-crema" : "bg-superficie-alt text-tinta"
            }`}
          >
            {grupo.name}
            <span className="ml-1 font-normal opacity-80">
              ({grupo.options.length}
              {grupo.required ? ", obligatorio" : ""})
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-tinta-tenue">
        Marcá los que se eligen en este producto. Si marcás uno obligatorio, quien compre no puede
        pedirlo sin elegir: la ficha le pide el sabor antes de agregar al carrito.
      </p>

      {/* Sin la etiqueta esto no se ve en la ficha, y marcar grupos acá no
          haría nada. Mejor decirlo que dejarla probando por qué no aparece. */}
      {!productoEtiquetado ? (
        <p className="mt-2 border-[3px] border-borde bg-superficie-alt p-3 text-xs leading-5 text-tinta">
          Ojo: este producto no tiene la etiqueta <strong>«{NOMBRE_TAG_PERSONALIZABLE}»</strong>, así
          que la ficha no va a ofrecer sabores ni foto. Marcala más abajo, en Etiquetas.
          {/* El caso que encontró el review de T18: puede haber dos etiquetas
              que se llaman igual y solo una habilita, porque lo que manda es
              el slug. Decir "no la tiene" sobre una que sí marcó sería
              volverla loca; esto nombra cuál es la que sirve. */}
          {etiquetaParecida ? (
            <>
              {" "}
              Tenés marcada <strong>«{etiquetaParecida}»</strong>, que se llama parecido pero{" "}
              <strong>no es</strong> la que habilita: la que sirve es la que en Etiquetas aparece
              como <code>/{TAG_PERSONALIZABLE}</code>.
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
