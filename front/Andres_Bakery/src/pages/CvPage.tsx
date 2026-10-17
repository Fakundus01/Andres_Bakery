import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase, Download, GraduationCap, Mail, Printer } from "lucide-react";

import { RedesSociales } from "../components/RedesSociales";
import { ErrorBanner, LoadingPanel } from "../components/ui";
import { siteApi } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import type { EntradaCv, PerfilAndrea } from "../lib/types";

/** El CV de Andrea (F44, ADR-017).
 *
 *  Se imprime desde el navegador en vez de subir un PDF: lo que se ve es texto
 *  de verdad —lo lee un buscador y lo lee un lector de pantalla— y no hay un
 *  archivo que quede viejo al lado del sitio. `@media print` en `index.css` le
 *  saca el header, el footer y los botones.
 */
export function CvPage() {
  const [perfil, setPerfil] = useState<PerfilAndrea | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    siteApi
      .getProfile()
      .then(setPerfil)
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return <LoadingPanel label="Cargando el CV" />;
  }
  if (error) {
    return <ErrorBanner message={error} />;
  }
  if (!perfil) {
    return null;
  }

  const { cv } = perfil;
  const tieneAlgo =
    Boolean(cv.headline || cv.summary) ||
    cv.skills.length > 0 ||
    cv.experience.length > 0 ||
    cv.education.length > 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="no-imprimir flex flex-wrap items-center justify-between gap-3">
        <Link to="/historia" className="btn-secondary px-3 py-2 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Volver al perfil
        </Link>
        <div className="flex flex-wrap gap-2">
          {cv.file_url ? (
            <a href={cv.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-2 text-sm">
              <Download className="h-4 w-4" />
              Descargar su archivo
            </a>
          ) : null}
          <button className="btn-primary px-3 py-2 text-sm" type="button" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir o guardar en PDF
          </button>
        </div>
      </div>

      <article className="hoja-cv pixel-panel p-7">
        <header className="border-b-[3px] border-borde pb-5">
          <h1 className="font-display text-4xl font-bold text-tinta">Andrea</h1>
          <p className="mt-1 text-base text-tinta-suave">
            {cv.headline || perfil.role || "Repostera"}
            {perfil.location ? ` · ${perfil.location}` : ""}
          </p>
          {cv.contact_email ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-tinta-suave">
              <Mail className="h-4 w-4 text-acento" />
              <a href={`mailto:${cv.contact_email}`} className="hover:text-acento">
                {cv.contact_email}
              </a>
            </p>
          ) : null}
          {perfil.socials.length > 0 ? (
            <div className="mt-4">
              <RedesSociales redes={perfil.socials} />
            </div>
          ) : null}
        </header>

        {!tieneAlgo ? <HuecoCv /> : null}

        {cv.summary ? (
          <Seccion titulo="Sobre ella">
            {cv.summary
              .split("\n")
              .filter(Boolean)
              .map((parrafo, indice) => (
                <p key={indice} className="text-sm leading-6 text-tinta-suave">
                  {parrafo}
                </p>
              ))}
          </Seccion>
        ) : null}

        {cv.skills.length > 0 ? (
          <Seccion titulo="Qué sabe hacer">
            <ul className="flex flex-wrap gap-2">
              {cv.skills.map((habilidad) => (
                <li
                  key={habilidad}
                  className="border-[3px] border-borde bg-superficie-alt px-2 py-1 text-xs font-bold text-tinta"
                >
                  {habilidad}
                </li>
              ))}
            </ul>
          </Seccion>
        ) : null}

        {cv.experience.length > 0 ? (
          <Seccion titulo="Experiencia" icono={<Briefcase className="h-4 w-4 text-acento" />}>
            <ListaEntradas entradas={cv.experience} />
          </Seccion>
        ) : null}

        {cv.education.length > 0 ? (
          <Seccion titulo="Formación" icono={<GraduationCap className="h-4 w-4 text-acento" />}>
            <ListaEntradas entradas={cv.education} />
          </Seccion>
        ) : null}
      </article>
    </div>
  );
}

function Seccion({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-tinta-tenue">
        {icono}
        {titulo}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ListaEntradas({ entradas }: { entradas: EntradaCv[] }) {
  return (
    <ul className="space-y-4">
      {entradas.map((entrada, indice) => (
        <li key={`${entrada.title}-${indice}`} className="border-l-[3px] border-borde pl-4">
          <p className="font-display text-xl font-bold text-tinta">{entrada.title}</p>
          <p className="text-sm text-tinta-tenue">
            {[entrada.place, entrada.period].filter(Boolean).join(" · ")}
          </p>
          {entrada.detail ? <p className="mt-2 text-sm leading-6 text-tinta-suave">{entrada.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/** Mismo criterio que F24: no se inventa la trayectoria de una persona real. */
function HuecoCv() {
  return (
    <div className="mt-6 border-[3px] border-dashed border-borde bg-superficie-alt p-6">
      <p className="font-display text-xl font-bold text-tinta">Acá va el CV de Andrea</p>
      <p className="mt-3 text-sm leading-6 text-tinta-suave">
        Su experiencia, su formación y qué sabe hacer. Lo carga ella desde{" "}
        <strong className="text-tinta">Panel → Tu perfil</strong>, y este recuadro desaparece solo.
      </p>
    </div>
  );
}
