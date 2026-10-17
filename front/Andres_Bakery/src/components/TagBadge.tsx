import type { Tag } from "../lib/types";

// El color viaja como nombre de token, no como hex: el back valida que exista
// y acá se traduce a clases. Una etiqueta nueva no puede romper la paleta.
const CLASES_POR_TOKEN: Record<string, string> = {
  acento: "bg-acento text-crema",
  "acento-2": "bg-acento-2 text-crema",
  exito: "bg-exito text-crema",
  alerta: "bg-alerta text-crema",
  error: "bg-error text-crema",
  tinta: "bg-tinta text-crema",
};

/** Sello tipo etiqueta de panadería: borde grueso y un par de grados torcido.
 *
 *  Lo que dice la etiqueta ("sin TACC") es la declaración de Andrea bajo su
 *  responsabilidad. La app la muestra; no la certifica. */
export function TagBadge({ tag, torcido = true }: { tag: Tag; torcido?: boolean }) {
  const clases = CLASES_POR_TOKEN[tag.color_token] ?? CLASES_POR_TOKEN.acento;

  return (
    <span
      className={`inline-block border-[3px] border-borde px-2 py-1 text-xs font-bold uppercase tracking-wide ${clases}`}
      style={torcido ? { transform: "rotate(-2deg)" } : undefined}
    >
      {tag.name}
    </span>
  );
}
