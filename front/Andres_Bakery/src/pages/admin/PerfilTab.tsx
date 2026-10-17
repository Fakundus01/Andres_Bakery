import { ExternalLink, Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { SubirFoto } from "../../components/SubirFoto";
import { Field } from "../../components/ui";
import type { EnlaceSocial, EntradaCv, PerfilAndrea, RedSocial } from "../../lib/types";
import { ListaDeEntradas } from "./PerfilCv";

const REDES: Array<{ valor: RedSocial; nombre: string }> = [
  { valor: "instagram", nombre: "Instagram" },
  { valor: "tiktok", nombre: "TikTok" },
  { valor: "facebook", nombre: "Facebook" },
  { valor: "youtube", nombre: "YouTube" },
  { valor: "whatsapp", nombre: "WhatsApp" },
  { valor: "linkedin", nombre: "LinkedIn" },
  { valor: "pinterest", nombre: "Pinterest" },
  { valor: "web", nombre: "Su sitio" },
  { valor: "mail", nombre: "Mail" },
];

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
  const cambiar = <Clave extends keyof PerfilAndrea>(clave: Clave, valor: PerfilAndrea[Clave]) =>
    setPerfil((actual) => ({ ...actual, [clave]: valor }));

  const cambiarCv = <Clave extends keyof PerfilAndrea["cv"]>(clave: Clave, valor: PerfilAndrea["cv"][Clave]) =>
    setPerfil((actual) => ({ ...actual, cv: { ...actual.cv, [clave]: valor } }));

  const cambiarRed = (indice: number, cambios: Partial<EnlaceSocial>) =>
    setPerfil((actual) => ({
      ...actual,
      socials: actual.socials.map((red, i) => (i === indice ? { ...red, ...cambios } : red)),
    }));

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

  return (
    <section className="space-y-6">
      <div className="pixel-panel space-y-4 p-6">
        <h3 className="font-display text-3xl font-semibold text-tinta">Tu ficha</h3>
        <p className="text-sm leading-6 text-tinta-suave">
          Esto es lo que ve cualquiera que entre a <strong className="text-tinta">Andrea</strong>. Lo que dejes
          vacío no se muestra: no aparece un hueco raro.
        </p>

        <SubirFoto
          valor={perfil.photo_url}
          token={token}
          etiqueta="Tu foto"
          onSubida={(url) => cambiar("photo_url", url)}
          onBorrar={() => cambiar("photo_url", "")}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Qué sos">
            <input
              className="field"
              value={perfil.role}
              onChange={(evento) => cambiar("role", evento.target.value)}
              placeholder="Repostera"
            />
          </Field>
          <Field label="Zona">
            <input
              className="field"
              value={perfil.location}
              onChange={(evento) => cambiar("location", evento.target.value)}
              placeholder="Villa Maipú, General San Martín"
            />
          </Field>
        </div>
        <Field label="Una línea sobre vos">
          <input
            className="field"
            value={perfil.tagline}
            onChange={(evento) => cambiar("tagline", evento.target.value)}
            placeholder="Hago todo yo, por encargo"
          />
        </Field>
      </div>

      <div className="pixel-panel space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-3xl font-semibold text-tinta">Tus redes</h3>
          <button
            className="btn-secondary px-3 py-2 text-sm"
            type="button"
            onClick={() =>
              cambiar("socials", [...perfil.socials, { network: "instagram", url: "", label: "" }])
            }
            disabled={perfil.socials.length >= 8}
          >
            <Plus className="h-4 w-4" />
            Agregar red
          </button>
        </div>

        {perfil.socials.length === 0 ? (
          <p className="border-[3px] border-dashed border-borde p-4 text-sm leading-6 text-tinta-suave">
            Todavía no cargaste ninguna. Agregá tu Instagram o tu TikTok y van a aparecer en tu perfil.
          </p>
        ) : null}

        {perfil.socials.map((red, indice) => (
          <div key={indice} className="grid gap-3 border-[3px] border-borde p-3 md:grid-cols-[150px_1fr_150px_auto]">
            <select
              className="field"
              value={red.network}
              onChange={(evento) => cambiarRed(indice, { network: evento.target.value as RedSocial })}
            >
              {REDES.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.nombre}
                </option>
              ))}
            </select>
            <input
              className="field"
              value={red.url}
              onChange={(evento) => cambiarRed(indice, { url: evento.target.value })}
              placeholder="https://instagram.com/tu-usuario"
            />
            <input
              className="field"
              value={red.label ?? ""}
              onChange={(evento) => cambiarRed(indice, { label: evento.target.value })}
              placeholder="@tu-usuario"
            />
            <button
              className="btn-secondary px-3"
              type="button"
              aria-label="Quitar esta red"
              onClick={() => cambiar("socials", perfil.socials.filter((_, i) => i !== indice))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <p className="text-xs leading-5 text-tinta-suave">
          El link tiene que empezar con <code>https://</code>. Si pegás otra cosa, no se guarda.
        </p>
      </div>

      <div className="pixel-panel space-y-4 p-6">
        <h3 className="font-display text-3xl font-semibold text-tinta">Tu CV</h3>
        <p className="text-sm leading-6 text-tinta-suave">
          Esto arma una página aparte (<code>/cv</code>) que cualquiera puede imprimir o guardar en PDF. Sirve
          para que alguien que entró a comprar vea también que trabajás de esto.
        </p>

        <label className="flex items-start gap-3 border-[3px] border-borde bg-superficie-alt p-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={perfil.cv.published}
            onChange={(evento) => cambiarCv("published", evento.target.checked)}
          />
          <span className="text-sm leading-6 text-tinta">
            <strong>Mostrar el link a mi CV en mi perfil.</strong> Mientras esté destildado, la página existe
            pero nadie la ve: dejalo así hasta que termines de cargar todo.
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Título">
            <input
              className="field"
              value={perfil.cv.headline}
              onChange={(evento) => cambiarCv("headline", evento.target.value)}
              placeholder="Repostera · pastelería artesanal"
            />
          </Field>
          <Field label="Mail de contacto">
            <input
              className="field"
              value={perfil.cv.contact_email}
              onChange={(evento) => cambiarCv("contact_email", evento.target.value)}
              placeholder="andrea@…"
            />
          </Field>
        </div>

        <Field label="Resumen">
          <textarea
            className="field min-h-28"
            value={perfil.cv.summary}
            onChange={(evento) => cambiarCv("summary", evento.target.value)}
            placeholder="Dos o tres líneas sobre tu trabajo."
          />
        </Field>

        <Field label="Qué sabés hacer (una cosa por línea)">
          <textarea
            className="field min-h-24"
            value={perfil.cv.skills.join("\n")}
            onChange={(evento) =>
              cambiarCv(
                "skills",
                evento.target.value.split("\n").map((linea) => linea.trim()).filter(Boolean),
              )
            }
            placeholder={"Tortas decoradas\nPastelería sin TACC\nProducción por encargo"}
          />
        </Field>

        <ListaDeEntradas titulo="Experiencia" {...listas("experience")} />
        <ListaDeEntradas titulo="Formación" {...listas("education")} />

        <Field label="Si tenés tu CV en un archivo, pegá el link (opcional)">
          <input
            className="field"
            value={perfil.cv.file_url}
            onChange={(evento) => cambiarCv("file_url", evento.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" type="button" onClick={onGuardar}>
          Guardar mi perfil
        </button>
        <a href="#/historia" className="btn-secondary px-3 py-2 text-sm">
          <ExternalLink className="h-4 w-4" />
          Ver cómo queda
        </a>
      </div>
    </section>
  );
}
