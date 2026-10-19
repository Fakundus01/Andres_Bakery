import { AlertTriangle } from "lucide-react";

import { Modal } from "./Modal";

/** El pop-up que pregunta antes de borrar algo que no se deshace (ADR-035).
 *
 *  Nació de un agujero real: en la carta y en las etiquetas, el botón
 *  "Eliminar" borraba **de una**, sin preguntar nada. Un clic al lado del
 *  botón de editar le sacaba un producto de la carta y no había vuelta atrás.
 *  Los grupos y los ingredientes sí preguntaban, pero cada uno a su manera y
 *  en la propia tarjeta.
 *
 *  **Este sí se usa también en celular**, al revés que el pop-up de los
 *  formularios (ADR-034): la razón para dejar los formularios en la página es
 *  el teclado virtual, y acá no se escribe nada. Lo que se gana es grande —el
 *  navegador atrapa el foco, así que el siguiente Enter cae en un botón de
 *  este pop-up y no en lo que había atrás—.
 */
export function ConfirmarBorrado({
  abierto,
  titulo,
  texto,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean;
  /** Qué se borra, con nombre y todo: "¿Borrar «Torta de chocolate»?". */
  titulo: string;
  /** Lo que se pierde, en una línea. Sale de `lib/borrados.ts`. */
  texto: string;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  return (
    <Modal
      abierto={abierto}
      titulo={titulo}
      onCerrar={onCerrar}
      pie={
        <div className="flex flex-wrap gap-3">
          {/* "No" primero y con el estilo principal: lo que está a tiro del
              dedo tiene que ser lo que no rompe nada. */}
          <button className="btn-primary" type="button" onClick={onCerrar}>
            No, dejarlo como está
          </button>
          <button className="btn-secondary" type="button" onClick={onConfirmar}>
            Sí, borrar
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" aria-hidden />
        <p className="text-sm leading-6 text-tinta">{texto}</p>
      </div>
    </Modal>
  );
}
