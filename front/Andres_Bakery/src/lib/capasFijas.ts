/** La regla de la casa sobre las capas `fixed`, hecha función para que un test
 *  la pueda romper.
 *
 *  Un contenedor `position: fixed` que sostiene UI flotante ocupa el ancho y el
 *  alto que le pide su contenido, y en la parte donde no dibuja nada igual
 *  recibe los punteros. Eso se come los clics de lo que haya debajo sin ningún
 *  aviso en pantalla: es lo que mató a «Ver carrito» de 320 a 430 px (D35,
 *  medido: 675 de 675 puntos robados por el contenedor de `AyudaPanel`), y es
 *  el mismo defecto que `RegionDeAvisos.tsx` ya había tenido que arreglar.
 *
 *  La regla: **un contenedor `fixed` no recibe punteros; los reciben sus piezas
 *  tocables.** Las dos excepciones legítimas son el elemento interactivo que es
 *  él mismo la capa (un botón flotante) y el velo de un modal (`inset-0`, que
 *  existe justamente para comerse el clic y cerrar).
 *
 *  Lo que esto prueba y lo que no: prueba que la **declaración** está escrita.
 *  La geometría —quién recibe el clic en qué píxel— sólo se prueba en el
 *  navegador (R07), y así se midió D35. */

/** Una clase `fixed` encontrada en el código, con quién la lleva puesta. */
export type CapaFija = {
  archivo: string;
  linea: number;
  etiqueta: string;
  clases: string;
};

/** Etiquetas que son contenedores: no se tocan, sostienen lo que se toca. */
const CONTENEDORES = ["div", "aside", "section", "nav", "ul", "ol", "header", "footer", "form", "main"];

export class ReglaDeCapasFijas {
  /** ¿Es el velo de un modal? `inset-0` tapa la pantalla entera a propósito. */
  esVelo(capa: CapaFija): boolean {
    return /(^|\s)inset-0(\s|$)/.test(capa.clases);
  }

  /** ¿Es la pieza tocable misma, y no un contenedor? */
  esPiezaTocable(capa: CapaFija): boolean {
    return !CONTENEDORES.includes(capa.etiqueta.toLowerCase());
  }

  /** ¿Declara que no recibe punteros? */
  dejaPasarPunteros(capa: CapaFija): boolean {
    return /(^|\s)pointer-events-none(\s|$)/.test(capa.clases);
  }

  /** Una fuga: contenedor `fixed`, no es velo, y se queda con los punteros. */
  esFuga(capa: CapaFija): boolean {
    if (this.esPiezaTocable(capa) || this.esVelo(capa)) {
      return false;
    }
    return !this.dejaPasarPunteros(capa);
  }

  fugas(capas: readonly CapaFija[]): CapaFija[] {
    return capas.filter((capa) => this.esFuga(capa));
  }

  /** El renglón que se le muestra a quien rompa la regla. */
  explicar(capa: CapaFija): string {
    return `${capa.archivo}:${capa.linea} <${capa.etiqueta}> "${capa.clases}" — contenedor fixed sin pointer-events-none`;
  }
}

/** Saca de un archivo `.tsx` las clases `fixed` con la etiqueta que las lleva.
 *
 *  Es un parser de texto, no un AST: busca cada `className` con `fixed` adentro
 *  y camina hacia atrás hasta la etiqueta JSX más cercana. Alcanza para este
 *  proyecto (las clases son literales, como Tailwind necesita para encontrarlas),
 *  y lo que NO ve está declarado: clases armadas en variables o fuera del
 *  `className`, y `fixed` puesto desde CSS en vez de desde una clase de utilidad. */
export function capasFijasDe(archivo: string, fuente: string): CapaFija[] {
  const encontradas: CapaFija[] = [];
  const className = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
  let coincidencia: RegExpExecArray | null;

  while ((coincidencia = className.exec(fuente)) !== null) {
    const clases = (coincidencia[1] ?? coincidencia[2] ?? "").replace(/\s+/g, " ").trim();
    if (!/(^|\s)fixed(\s|$)/.test(clases)) {
      continue;
    }
    const antes = fuente.slice(0, coincidencia.index);
    const etiquetas = antes.match(/<([A-Za-z][A-Za-z0-9.]*)/g) ?? [];
    const etiqueta = etiquetas.length > 0 ? etiquetas[etiquetas.length - 1].slice(1) : "?";
    encontradas.push({
      archivo,
      linea: antes.split("\n").length,
      etiqueta,
      clases,
    });
  }

  return encontradas;
}
