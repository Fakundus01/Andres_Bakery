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
