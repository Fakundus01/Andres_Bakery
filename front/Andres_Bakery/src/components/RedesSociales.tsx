import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Music2,
  Pin,
  Youtube,
} from "lucide-react";
import type { ComponentType } from "react";

import type { EnlaceSocial, RedSocial } from "../lib/types";

/** TikTok y Pinterest no tienen ícono en `lucide-react`, y dibujar un logo de
 *  marca a mano es meter un assetde otro (ADR-003). Van genéricos y el nombre
 *  lo dice la etiqueta de al lado. */
const ICONOS: Record<RedSocial, ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  tiktok: Music2,
  facebook: Facebook,
  youtube: Youtube,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
  pinterest: Pin,
  web: Globe,
  mail: Mail,
};

const NOMBRES: Record<RedSocial, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  web: "Su sitio",
  mail: "Mail",
};

export function RedesSociales({ redes, compacto = false }: { redes: EnlaceSocial[]; compacto?: boolean }) {
  if (redes.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {redes.map((red) => {
        const Icono = ICONOS[red.network];
        const nombre = NOMBRES[red.network];
        return (
          <li key={`${red.network}-${red.url}`}>
            <a
              href={red.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-3 py-2 text-sm"
              title={`${nombre}${red.label ? ` · ${red.label}` : ""}`}
            >
              <Icono className="h-4 w-4" />
              {compacto ? <span className="sr-only">{nombre}</span> : <span>{red.label || nombre}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
