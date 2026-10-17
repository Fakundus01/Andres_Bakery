import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Cake, FileText, Heart, MapPin } from "lucide-react";

import { RedesSociales } from "../components/RedesSociales";
import { ErrorBanner, LoadingPanel, SectionHeading } from "../components/ui";
import { siteApi } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import { urlDeImagen } from "../lib/imagenes";
import type { PerfilAndrea } from "../lib/types";

const FOTO_POR_DEFECTO = import.meta.env.VITE_PROFILE_DEFAULT || "/profile_pictures/default_profile.svg";

export function AboutPage() {
  const [historia, setHistoria] = useState("");
  const [perfil, setPerfil] = useState<PerfilAndrea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([siteApi.getAbout(), siteApi.getProfile()])
      .then(([about, perfilCargado]) => {
        setHistoria(about.content?.trim() ?? "");
        setPerfil(perfilCargado);
      })
      .catch((reason: unknown) => setError(getErrorMessage(reason)))
      .finally(() => setLoading(false));
  }, []);

  const redes = perfil?.socials ?? [];
  const cvALaVista = Boolean(perfil?.cv.published);

  return (
    <div className="space-y-10 pb-10">
      <SectionHeading
        eyebrow="Quién hace tus dulces"
        title="Andrea"
        description="Detrás de cada pedido hay una sola persona amasando, horneando y empaquetando."
      />

      {loading ? <LoadingPanel label="Cargando la historia" /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Ficha de personaje: foto enmarcada + los datos duros */}
        <aside className="pixel-panel h-fit p-5">
          <div className="marco-foto overflow-hidden bg-superficie-alt">
            <img
              src={urlDeImagen(perfil?.photo_url) || FOTO_POR_DEFECTO}
              alt="Foto de Andrea"
              className="h-72 w-full object-cover"
              style={perfil?.photo_url ? undefined : { imageRendering: "pixelated" }}
            />
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold text-tinta">Andrea</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            {[perfil?.role || "Repostera", perfil?.tagline || "hace todo ella"].filter(Boolean).join(" · ")}
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-acento" />
              <div>
                <dt className="sr-only">Zona</dt>
                <dd className="text-tinta-suave">{perfil?.location || "Villa Maipú, General San Martín"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Cake className="h-4 w-4 shrink-0 text-acento" />
              <div>
                <dt className="sr-only">Qué hace</dt>
                <dd className="text-tinta-suave">Tortas, cookies, brownies y boxes</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4 shrink-0 text-acento" />
              <div>
                <dt className="sr-only">Cómo se pide</dt>
                <dd className="text-tinta-suave">Por encargo, con tiempo de preparación</dd>
              </div>
            </div>
          </dl>

          {redes.length > 0 ? (
            <div className="mt-5 border-t-[3px] border-borde pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">Dónde encontrarla</p>
              <div className="mt-3">
                <RedesSociales redes={redes} />
              </div>
            </div>
          ) : null}

          {cvALaVista ? (
            <Link to="/cv" className="btn-secondary mt-5 w-full justify-center px-3 py-2 text-sm">
              <FileText className="h-4 w-4" />
              Ver su CV
            </Link>
          ) : null}
        </aside>

        <div className="space-y-6">
          <article className="pixel-panel p-7">
            <p className="text-xs uppercase tracking-[0.3em] text-tinta-tenue">Su historia</p>
            {historia ? (
              <div className="mt-4 space-y-4 text-base leading-7 text-tinta-suave">
                {historia.split("\n").filter(Boolean).map((parrafo, indice) => (
                  <p key={indice}>{parrafo}</p>
                ))}
              </div>
            ) : (
              <HuecoPendiente />
            )}
          </article>

          {cvALaVista ? <TarjetaCv /> : null}

          <div className="pixel-panel-plano bg-acento-suave p-6">
            <h3 className="font-display text-2xl font-bold text-tinta">¿Querés encargar algo?</h3>
            <p className="mt-2 text-sm leading-6 text-tinta-suave">
              Mirá la carta, elegí lo que quieras y coordinamos la entrega o el retiro.
            </p>
            <Link to="/tienda" className="btn-primary mt-5">
              Ver la carta
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** El pedido textual fue: que un reclutador que entre a ver el emprendimiento
 *  encuentre acá su CV (F44). Por eso el link vive en su perfil, no escondido. */
function TarjetaCv() {
  return (
    <div className="pixel-panel p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-tinta-tenue">Su trayectoria</p>
      <h3 className="mt-2 font-display text-2xl font-bold text-tinta">Andrea también trabaja de esto</h3>
      <p className="mt-2 text-sm leading-6 text-tinta-suave">
        Esta tienda la hace ella sola: la carta, los precios, la producción y la entrega. Si querés ver su
        experiencia y su formación, está todo acá.
      </p>
      <Link to="/cv" className="btn-primary mt-5">
        <FileText className="h-4 w-4" />
        Ver su CV
      </Link>
    </div>
  );
}

/** Se borra solo: en cuanto Andrea escriba su historia desde el panel, deja de aparecer.
 *  No inventamos una biografía de una persona real ni como relleno (ver sdd/features.md F24). */
function HuecoPendiente() {
  return (
    <div className="mt-4 border-[3px] border-dashed border-borde bg-superficie-alt p-6">
      <p className="font-display text-xl font-bold text-tinta">Acá va la historia de Andrea</p>
      <p className="mt-3 text-sm leading-6 text-tinta-suave">
        Cómo empezó, qué la llevó a la repostería y por qué cocina lo que cocina. Lo escribe ella
        desde <strong className="text-tinta">Panel → Contenido</strong>, y este recuadro desaparece solo.
      </p>
      <p className="mt-3 text-sm leading-6 text-tinta-suave">
        Falta también su foto: hoy se ve una silueta por defecto.
      </p>
    </div>
  );
}
