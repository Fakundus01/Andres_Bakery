import { Field } from "../../components/ui";
import type { EntradaCv, PerfilAndrea } from "../../lib/types";
import { ListaDeEntradas } from "./PerfilCv";

export type ListaDelCv = {
  entradas: EntradaCv[];
  agregar: () => void;
  cambiar: (indice: number, cambios: Partial<EntradaCv>) => void;
  borrar: (indice: number) => void;
};

/** El CV que arma la página `/cv` (F49).
 *
 *  Salió de `PerfilTab` con las otras dos secciones (R05, ADR-035). Es la
 *  parte más larga del perfil, y es justo la que conviene abrir en un pop-up:
 *  mientras se carga, no tapa el resto del panel.
 */
export function PerfilCvForm({
  perfil,
  cambiarCv,
  listas,
}: {
  perfil: PerfilAndrea;
  cambiarCv: <Clave extends keyof PerfilAndrea["cv"]>(
    clave: Clave,
    valor: PerfilAndrea["cv"][Clave],
  ) => void;
  listas: (clave: "experience" | "education") => ListaDelCv;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-tinta-suave">
        Esto arma una página aparte (<code>/cv</code>) que cualquiera puede imprimir o guardar en
        PDF. Sirve para que alguien que entró a comprar vea también que trabajás de esto.
      </p>

      <label className="flex items-start gap-3 border-[3px] border-borde bg-superficie-alt p-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={perfil.cv.published}
          onChange={(evento) => cambiarCv("published", evento.target.checked)}
        />
        <span className="text-sm leading-6 text-tinta">
          <strong>Mostrar el link a mi CV en mi perfil.</strong> Mientras esté destildado, la página
          existe pero nadie la ve: dejalo así hasta que termines de cargar todo.
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
  );
}
