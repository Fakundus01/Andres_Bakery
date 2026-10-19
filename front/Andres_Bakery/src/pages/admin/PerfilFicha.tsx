import { SubirFoto } from "../../components/SubirFoto";
import { Field } from "../../components/ui";
import type { PerfilAndrea } from "../../lib/types";

/** Los datos de arriba del perfil: la foto, qué hace y dónde (F49).
 *
 *  Salió de `PerfilTab`, que tenía las tres secciones y el guardado en un
 *  archivo de 259 líneas. El corte sirve dos veces: respeta R05 y deja que
 *  cada sección se abra en su propio pop-up (ADR-035).
 */
export function PerfilFicha({
  perfil,
  token,
  cambiar,
}: {
  perfil: PerfilAndrea;
  token: string;
  cambiar: <Clave extends keyof PerfilAndrea>(clave: Clave, valor: PerfilAndrea[Clave]) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-tinta-suave">
        Esto es lo que ve cualquiera que entre a <strong className="text-tinta">Andrea</strong>. Lo
        que dejes vacío no se muestra: no aparece un hueco raro.
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
  );
}
