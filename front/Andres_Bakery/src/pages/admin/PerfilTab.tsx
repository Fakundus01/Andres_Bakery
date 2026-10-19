import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ExternalLink, Pencil } from "lucide-react";

import { Modal } from "../../components/Modal";
import { usePantallaGrande } from "../../lib/usePantallaGrande";
import type { EntradaCv, PerfilAndrea } from "../../lib/types";
import { PerfilCvForm } from "./PerfilCvForm";
import { PerfilFicha } from "./PerfilFicha";
import { PerfilRedes } from "./PerfilRedes";

type Seccion = "ficha" | "redes" | "cv";

/** El perfil en el panel: tres secciones, cada una con su pop-up (ADR-035).
 *
 *  Antes eran tres paneles abiertos, uno abajo del otro, en una sola página
 *  larguísima: para tocar una línea del CV había que scrollear por la foto y
 *  las redes. Ahora la pestaña muestra **qué hay cargado** y la edición se
 *  abre aparte, igual que la carta y las etiquetas.
 *
 *  **El guardado sigue siendo uno solo**, y eso no cambió: el perfil viaja
 *  entero en un PUT. Por eso el pie de cada pop-up dice "Guardar mi perfil" y
 *  no "Guardar esta sección": guardar una guarda las tres, y prometer otra
 *  cosa sería mentir.
 *
 *  Y **"Cerrar" cancela de verdad**: al abrir una sección se guarda una copia
 *  del perfil y cerrar sin guardar la devuelve. Sin eso, lo editado quedaba en
 *  el estado, el resumen de la tarjeta lo mostraba como si estuviera guardado y
 *  el próximo "Guardar mi perfil" persistía una sección que se había
 *  abandonado (lo marcó el reviewer de T19). Lo único que no se deshace es una
 *  **foto ya subida**: el archivo queda en el servidor aunque el perfil vuelva
 *  a la foto anterior (es la deuda D17, la misma que con las fotos de producto).
 */
export function PerfilTab({
  perfil,
  setPerfil,
  onGuardar,
  token,
}: {
  perfil: PerfilAndrea;
  setPerfil: Dispatch<SetStateAction<PerfilAndrea>>;
  onGuardar: () => void;
  token: string;
}) {
  const enPopUp = usePantallaGrande();
  const [abierta, setAbierta] = useState<Seccion | null>(null);
  const [respaldo, setRespaldo] = useState<PerfilAndrea | null>(null);

  const abrir = (clave: Seccion) => {
    setRespaldo(perfil);
    setAbierta(clave);
  };

  const cerrarSinGuardar = () => {
    if (respaldo) {
      setPerfil(respaldo);
    }
    setRespaldo(null);
    setAbierta(null);
  };

  const guardarYCerrar = () => {
    onGuardar();
    setRespaldo(null);
    setAbierta(null);
  };

  const cambiar = <Clave extends keyof PerfilAndrea>(clave: Clave, valor: PerfilAndrea[Clave]) =>
    setPerfil((actual) => ({ ...actual, [clave]: valor }));

  const cambiarCv = <Clave extends keyof PerfilAndrea["cv"]>(clave: Clave, valor: PerfilAndrea["cv"][Clave]) =>
    setPerfil((actual) => ({ ...actual, cv: { ...actual.cv, [clave]: valor } }));

  const listas = (clave: "experience" | "education") => ({
    entradas: perfil.cv[clave],
    agregar: () =>
      setPerfil((actual) => ({
        ...actual,
        cv: { ...actual.cv, [clave]: [...actual.cv[clave], { title: "", place: "", period: "", detail: "" }] },
      })),
    cambiar: (indice: number, cambios: Partial<EntradaCv>) =>
      setPerfil((actual) => ({
        ...actual,
        cv: {
          ...actual.cv,
          [clave]: actual.cv[clave].map((entrada, i) => (i === indice ? { ...entrada, ...cambios } : entrada)),
        },
      })),
    borrar: (indice: number) =>
      setPerfil((actual) => ({
        ...actual,
        cv: { ...actual.cv, [clave]: actual.cv[clave].filter((_, i) => i !== indice) },
      })),
  });

  const secciones: Array<{
    clave: Seccion;
    titulo: string;
    resumen: string;
    descripcion: string;
    contenido: ReactNode;
  }> = [
    {
      clave: "ficha",
      titulo: "Tu ficha",
      resumen: [
        perfil.photo_url ? "con foto" : "sin foto",
        perfil.role || "sin oficio escrito",
        perfil.location || "sin zona",
      ].join(" · "),
      descripcion: "Es lo primero que ve alguien que entra a tu perfil.",
      contenido: <PerfilFicha perfil={perfil} token={token} cambiar={cambiar} />,
    },
    {
      clave: "redes",
      titulo: "Tus redes",
      resumen:
        perfil.socials.length === 0
          ? "ninguna cargada"
          : perfil.socials.length === 1
            ? "1 red cargada"
            : `${perfil.socials.length} redes cargadas`,
      descripcion: "Hasta ocho. Aparecen como botones en tu perfil.",
      contenido: <PerfilRedes perfil={perfil} cambiar={cambiar} />,
    },
    {
      clave: "cv",
      titulo: "Tu CV",
      resumen: [
        perfil.cv.published ? "visible en tu perfil" : "oculto",
        `${perfil.cv.experience.length} de experiencia`,
        `${perfil.cv.education.length} de formación`,
      ].join(" · "),
      descripcion: "Arma la página /cv, que cualquiera puede imprimir o guardar en PDF.",
      contenido: <PerfilCvForm perfil={perfil} cambiarCv={cambiarCv} listas={listas} />,
    },
  ];

  const guardado = (
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn-primary" type="button" onClick={onGuardar}>
        Guardar mi perfil
      </button>
      <a href="#/historia" className="btn-secondary px-3 py-2 text-sm">
        <ExternalLink className="h-4 w-4" />
        Ver cómo queda
      </a>
    </div>
  );

  if (!enPopUp) {
    return (
      <section className="space-y-6">
        {secciones.map((seccion) => (
          <div key={seccion.clave} className="pixel-panel space-y-4 p-6">
            <h3 className="font-display text-3xl font-semibold text-tinta">{seccion.titulo}</h3>
            {seccion.contenido}
          </div>
        ))}
        {guardado}
      </section>
    );
  }

  const enEdicion = secciones.find((seccion) => seccion.clave === abierta) ?? null;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3">
        {secciones.map((seccion) => (
          <div key={seccion.clave} className="pixel-panel flex flex-col gap-3 p-5">
            <div>
              <h3 className="font-display text-2xl font-semibold text-tinta">{seccion.titulo}</h3>
              <p className="mt-1 text-xs leading-5 text-tinta-tenue">{seccion.resumen}</p>
            </div>
            <p className="text-sm leading-6 text-tinta-suave">{seccion.descripcion}</p>
            <button
              className="btn-secondary mt-auto self-start px-3 py-2 text-sm"
              type="button"
              onClick={() => abrir(seccion.clave)}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          </div>
        ))}
      </div>

      {guardado}

      <Modal
        abierto={enEdicion !== null}
        titulo={enEdicion?.titulo ?? ""}
        descripcion="Lo que cambies se guarda cuando apretás Guardar mi perfil, que guarda las tres secciones. Cerrar deja todo como estaba."
        onCerrar={cerrarSinGuardar}
        pie={
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" type="button" onClick={guardarYCerrar}>
              Guardar mi perfil
            </button>
            <button className="btn-secondary" type="button" onClick={cerrarSinGuardar}>
              Cerrar sin guardar
            </button>
          </div>
        }
      >
        {enEdicion?.contenido}
      </Modal>
    </section>
  );
}
