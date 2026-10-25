/** La cola de avisos de pantalla, sin pantalla (F64).
 *
 *  Antes de esto el sitio tenía tres mecanismos distintos y ninguno servía
 *  para el caso más común: el panel tenía **un solo** string compartido por
 *  todas las pestañas —así que dos avisos seguidos se pisaban— pintado de
 *  verde salga bien o mal, la ficha tenía el suyo, y agregar al carrito no
 *  decía nada. Acá vive la decisión de qué se ve y qué se va; el contexto solo
 *  la dibuja.
 */

export type TonoDeAviso = "exito" | "error" | "aviso";

export type LinkDelAviso = { texto: string; href: string };

export type Aviso = {
  id: string;
  tono: TonoDeAviso;
  texto: string;
  link?: LinkDelAviso;
};

/** Cuántos se ven juntos. Más que esto tapa la pantalla en celular, que es
 *  donde se compra. */
export const TOPE_VISIBLES = 3;

const MS_PARA_IRSE_SOLO = 4000;

let ultimoId = 0;

/** Arma el aviso, o `null` si no tiene nada que decir.
 *
 *  Devuelve `null` en vez de tirar: lo que llama es casi siempre un `catch`
 *  con un mensaje que puede venir vacío de la API, y un aviso en blanco es
 *  peor que ninguno. `agregarAviso` sabe ignorar el `null`. */
export function nuevoAviso(datos: {
  tono: TonoDeAviso;
  texto: string;
  link?: LinkDelAviso;
}): Aviso | null {
  const texto = datos.texto.trim();
  if (!texto) {
    return null;
  }
  ultimoId += 1;
  return {
    id: `aviso-${ultimoId}`,
    tono: datos.tono,
    texto,
    ...(datos.link ? { link: datos.link } : {}),
  };
}

/** El error **no** se va solo: un error que desaparece es un error perdido.
 *  Se cierra con su X o lo reemplaza el que viene. */
export function seVaSolo(tono: TonoDeAviso): boolean {
  return tono !== "error";
}

/** Los milisegundos hasta que se vaya, o `null` si se queda. */
export function msParaIrse(tono: TonoDeAviso): number | null {
  return seVaSolo(tono) ? MS_PARA_IRSE_SOLO : null;
}

/** Por qué está pausado el plazo. Son **dos motivos independientes** y
 *  alcanza con uno: sin esto, sacar el mouse de la X mientras el teclado la
 *  tiene enfocada reanudaba el plazo, que es el mismo robo de foco por una
 *  puerta más chica. */
export type MotivoDeRetencion = "foco" | "mouse";

export function agregarRetencion(
  motivos: readonly MotivoDeRetencion[],
  motivo: MotivoDeRetencion,
): MotivoDeRetencion[] {
  return motivos.includes(motivo) ? [...motivos] : [...motivos, motivo];
}

export function quitarRetencion(
  motivos: readonly MotivoDeRetencion[],
  motivo: MotivoDeRetencion,
): MotivoDeRetencion[] {
  return motivos.filter((candidato) => candidato !== motivo);
}

/** ¿Tiene que estar corriendo el plazo de este aviso ahora mismo? (D30)
 *
 *  Antes el plazo no se pausaba nunca: quien enfocaba la X y esperaba los
 *  cuatro segundos **perdía su lugar en la página**, porque React desmontaba
 *  el nodo que tenía el foco y el foco caía a `body` (review de T23,
 *  hallazgo 7). WCAG 2.2.1 pide poder pausar lo que se va solo y 2.4.3 pide
 *  no perder el orden del foco; pausar es lo que hace cualquier toast. */
export function elPlazoCorre(aviso: Aviso, motivos: readonly MotivoDeRetencion[]): boolean {
  return motivos.length === 0 && seVaSolo(aviso.tono);
}

/** Qué queda en pantalla cuando alguien aprieta Escape (D30).
 *
 *  Con el foco adentro de un aviso cierra **ése**, sea error o no: es un
 *  pedido explícito de quien lo está leyendo.
 *
 *  Con el foco afuera —el Escape global, el mismo que cierra los modales, el
 *  menú de cuenta y el panel de ayuda— se van los que se iban a ir solos y
 *  **el error se queda**: si se lo llevara, cerrar un modal borraría un error
 *  que nadie leyó, que es justo lo que `seVaSolo` evita (C3). */
export function cerrarConEscape(cola: Aviso[], idEnfocado: string | null): Aviso[] {
  if (idEnfocado) {
    return descartarAviso(cola, idEnfocado);
  }
  return cola.filter((aviso) => !seVaSolo(aviso.tono));
}

/** Lo mínimo que hace falta saber de un elemento para decidir el foco.
 *  `HTMLElement` lo cumple; en los tests entra un objeto a mano, que es la
 *  gracia de sacar la decisión del componente (ADR-023). */
export interface Enfocable {
  isConnected: boolean;
}

/** A dónde vuelve el foco cuando se cierra el aviso que lo tenía, o `null` si
 *  no hay ningún destino que sirva (D30, WCAG 2.4.3).
 *
 *  Tres cosas descartan un destino: que no haya (el foco entró al aviso sin
 *  venir de ningún lado), que ya no esté en la página (la ficha del producto
 *  puede desmontarse mientras su aviso sigue en pantalla) y que sea el
 *  `body`, que no es un lugar: dejar el foco en el body es **el síntoma** que
 *  esto viene a arreglar, porque el próximo Tab arranca desde el principio de
 *  la página. */
export function aDondeVuelveElFoco<T extends Enfocable>(
  previo: T | null | undefined,
  body: Enfocable | null | undefined,
): T | null {
  if (!previo || !previo.isConnected || previo === body) {
    return null;
  }
  return previo;
}

/** Apila el aviso nuevo al final, sin borrar los que ya estaban. */
export function agregarAviso(cola: Aviso[], aviso: Aviso | null): Aviso[] {
  if (!aviso) {
    return cola;
  }
  // El repetido se reemplaza en vez de apilarse: dos veces "se guardó" no es
  // información nueva, pero el id nuevo hace que su plazo vuelva a empezar, y
  // eso sí importa cuando alguien agrega el mismo producto dos veces.
  const sinElRepetido = cola.filter(
    (previo) => !(previo.tono === aviso.tono && previo.texto === aviso.texto),
  );
  return acotar([...sinElRepetido, aviso]);
}

export function descartarAviso(cola: Aviso[], id: string): Aviso[] {
  return cola.filter((aviso) => aviso.id !== id);
}

/** Deja la cola en el tope, sacando primero lo que se iba a ir solo.
 *
 *  Descartar por antigüedad a secas perdería un error que nadie cerró, que es
 *  justo lo que esta feature viene a arreglar: el error se queda hasta que
 *  alguien lo lea. Si son todos errores igual se saca el más viejo, porque una
 *  cola que crece sin límite tapa la pantalla. */
function acotar(cola: Aviso[]): Aviso[] {
  const recortada = [...cola];
  while (recortada.length > TOPE_VISIBLES) {
    const elMasViejoQueSeIba = recortada.findIndex((aviso) => seVaSolo(aviso.tono));
    recortada.splice(elMasViejoQueSeIba === -1 ? 0 : elMasViejoQueSeIba, 1);
  }
  return recortada;
}
