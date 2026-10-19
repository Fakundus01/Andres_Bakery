import { Plus, Trash2 } from "lucide-react";

import type { EnlaceSocial, PerfilAndrea, RedSocial } from "../../lib/types";

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

/** Las redes del perfil: hasta ocho, con su link y cómo se muestran (F49).
 *
 *  Salió de `PerfilTab` junto con las otras dos secciones (R05, ADR-035).
 */
export function PerfilRedes({
  perfil,
  cambiar,
}: {
  perfil: PerfilAndrea;
  cambiar: <Clave extends keyof PerfilAndrea>(clave: Clave, valor: PerfilAndrea[Clave]) => void;
}) {
  const cambiarRed = (indice: number, cambios: Partial<EnlaceSocial>) =>
    cambiar(
      "socials",
      perfil.socials.map((red, i) => (i === indice ? { ...red, ...cambios } : red)),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-tinta-suave">
          Aparecen en tu perfil como botones. El link tiene que empezar con <code>https://</code>:
          si pegás otra cosa, no se guarda.
        </p>
        <button
          className="btn-secondary px-3 py-2 text-sm"
          type="button"
          onClick={() => cambiar("socials", [...perfil.socials, { network: "instagram", url: "", label: "" }])}
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
    </div>
  );
}
