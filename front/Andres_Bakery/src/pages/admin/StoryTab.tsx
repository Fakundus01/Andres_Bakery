import { useState, type Dispatch, type SetStateAction } from "react";
import { Pencil } from "lucide-react";

import { Modal } from "../../components/Modal";
import { usePantallaGrande } from "../../lib/usePantallaGrande";

/** Lo que se ve mientras se escribe: el texto como va a salir en el home. */
function VistaPrevia({ texto }: { texto: string }) {
  return (
    <div className="bg-tinta p-6 text-crema">
      <p className="text-xs uppercase tracking-[0.32em] text-tinta-tenue">Manifiesto</p>
      <p className="mt-4 font-display text-3xl font-semibold leading-tight">
        {texto || "Tu historia de marca va a aparecer acá."}
      </p>
    </div>
  );
}

/** El texto institucional del home (F49), editado en pop-up (ADR-035).
 *
 *  La vista previa va **adentro** del pop-up además de en la página: lo que
 *  se escribe acá es una sola frase que se lee grande en el home, y escribirla
 *  sin verla es escribir a ciegas.
 */
export function StoryTab({
  aboutContent,
  setAboutContent,
  onSave,
}: {
  aboutContent: string;
  setAboutContent: Dispatch<SetStateAction<string>>;
  onSave: () => void;
}) {
  const enPopUp = usePantallaGrande();
  const [abierto, setAbierto] = useState(false);
  // Cerrar sin guardar devuelve el texto que había al abrir: si no, lo tipeado
  // quedaba en el estado y la vista previa de la página lo mostraba como si
  // estuviera publicado (reviewer de T19).
  const [respaldo, setRespaldo] = useState("");

  const cerrarSinGuardar = () => {
    setAboutContent(respaldo);
    setAbierto(false);
  };

  const editor = (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-tinta-suave">
        Editá la narrativa de la marca para que el home acompañe mejor el posicionamiento del
        ecommerce.
      </p>
      <textarea
        className="field min-h-48"
        value={aboutContent}
        onChange={(event) => setAboutContent(event.target.value)}
      />
      <VistaPrevia texto={aboutContent} />
    </div>
  );

  if (!enPopUp) {
    return (
      <section className="grid gap-6">
        <div className="pixel-panel space-y-4 p-6">
          <h3 className="font-display text-3xl font-semibold text-tinta">Texto institucional</h3>
          {editor}
          <button className="btn-primary" type="button" onClick={onSave}>
            Guardar contenido
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tinta-suave">
          Así se lee tu historia en el home. Es una frase, no un párrafo largo.
        </p>
        <button
          className="btn-primary"
          type="button"
          onClick={() => {
            setRespaldo(aboutContent);
            setAbierto(true);
          }}
        >
          <Pencil className="h-4 w-4" />
          Editar el texto
        </button>
      </div>

      <div className="pixel-panel p-6">
        <VistaPrevia texto={aboutContent} />
      </div>

      <Modal
        abierto={abierto}
        titulo="Texto institucional"
        descripcion="Se guarda cuando apretás Guardar contenido. Cerrar sin guardar deja el texto como estaba."
        onCerrar={cerrarSinGuardar}
        pie={
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-primary"
              type="button"
              onClick={() => {
                onSave();
                setAbierto(false);
              }}
            >
              Guardar contenido
            </button>
            <button className="btn-secondary" type="button" onClick={cerrarSinGuardar}>
              Cerrar sin guardar
            </button>
          </div>
        }
      >
        {editor}
      </Modal>
    </section>
  );
}
