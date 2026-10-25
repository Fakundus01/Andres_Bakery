import { describe, expect, it } from "vitest";

import {
  TOPE_VISIBLES,
  aDondeVuelveElFoco,
  agregarAviso,
  agregarRetencion,
  cerrarConEscape,
  descartarAviso,
  elPlazoCorre,
  msParaIrse,
  nuevoAviso,
  quitarRetencion,
  seVaSolo,
  type MotivoDeRetencion,
} from "./avisos";

const exito = (texto: string) => nuevoAviso({ tono: "exito", texto });
const error = (texto: string) => nuevoAviso({ tono: "error", texto });

describe("nuevoAviso", () => {
  it("le pone un id propio a cada uno, para que dos iguales no se confundan", () => {
    const uno = exito("se agregó al carrito");
    const otro = exito("se agregó al carrito");
    expect(uno!.id).not.toBe(otro!.id);
  });

  it("recorta el texto vacío: un aviso sin texto no es un aviso", () => {
    expect(nuevoAviso({ tono: "exito", texto: "   " })).toBeNull();
  });

  // El título decía "que es lo que el carrito necesita (C7)" y quedó viejo:
  // el aviso del carrito NO lleva link (ADR-037). La capacidad sigue
  // probada porque sigue existiendo, pero hoy no la usa ningún productor.
  it("guarda el link cuando se lo dan: la capacidad existe, hoy nadie la usa", () => {
    const aviso = nuevoAviso({
      tono: "exito",
      texto: "«Cheesecake» se agregó al carrito",
      link: { texto: "Ir al carrito", href: "/carrito" },
    });
    expect(aviso?.link).toEqual({ texto: "Ir al carrito", href: "/carrito" });
  });
});

describe("seVaSolo", () => {
  it("el éxito se va solo", () => {
    expect(seVaSolo("exito")).toBe(true);
  });

  it("el aviso se va solo", () => {
    expect(seVaSolo("aviso")).toBe(true);
  });

  it("el error NO se va solo: un error que desaparece es un error perdido (C3)", () => {
    expect(seVaSolo("error")).toBe(false);
  });
});

describe("msParaIrse", () => {
  it("el error no tiene plazo", () => {
    expect(msParaIrse("error")).toBeNull();
  });

  // El plazo va clavado y no `>= 3000`: con el margen, el mutante
  // `4000 -> 3000` quedaba verde y nadie iba a notar que mañana el aviso se
  // queda 40 segundos (review de T23, hallazgo 15 · D32).
  it("el éxito se va a los 4 segundos exactos: suficiente para leerlo, no más", () => {
    expect(msParaIrse("exito")).toBe(4000);
  });

  it("el aviso tiene el mismo plazo que el éxito", () => {
    expect(msParaIrse("aviso")).toBe(4000);
  });
});

describe("agregarAviso", () => {
  it("el segundo no borra el primero: se apilan (C4)", () => {
    const cola = agregarAviso(agregarAviso([], exito("uno")), exito("dos"));
    expect(cola.map((a) => a.texto)).toEqual(["uno", "dos"]);
  });

  it("no pasa del tope de visibles", () => {
    let cola: ReturnType<typeof agregarAviso> = [];
    for (let i = 0; i < TOPE_VISIBLES + 2; i += 1) {
      cola = agregarAviso(cola, exito(`aviso ${i}`));
    }
    expect(cola).toHaveLength(TOPE_VISIBLES);
  });

  it("cuando se pasa del tope, el que se va es el más viejo", () => {
    let cola: ReturnType<typeof agregarAviso> = [];
    for (let i = 0; i < TOPE_VISIBLES + 1; i += 1) {
      cola = agregarAviso(cola, exito(`aviso ${i}`));
    }
    expect(cola.map((a) => a.texto)).not.toContain("aviso 0");
    expect(cola.map((a) => a.texto)).toContain(`aviso ${TOPE_VISIBLES}`);
  });

  it("el tope se lleva primero un éxito viejo antes que un error viejo", () => {
    // Lo mismo que C3 pero por la otra puerta: si el tope descartara por
    // antigüedad a secas, un error se perdería sin que nadie lo cierre, que es
    // justo lo que esta feature viene a arreglar.
    let cola = agregarAviso([], error("no se pudo guardar"));
    for (let i = 0; i < TOPE_VISIBLES; i += 1) {
      cola = agregarAviso(cola, exito(`ok ${i}`));
    }
    expect(cola.map((a) => a.texto)).toContain("no se pudo guardar");
    expect(cola).toHaveLength(TOPE_VISIBLES);
  });

  it("si son todos errores, el tope se lleva el más viejo igual: no crece sin límite", () => {
    let cola: ReturnType<typeof agregarAviso> = [];
    for (let i = 0; i < TOPE_VISIBLES + 1; i += 1) {
      cola = agregarAviso(cola, error(`error ${i}`));
    }
    expect(cola).toHaveLength(TOPE_VISIBLES);
    expect(cola.map((a) => a.texto)).not.toContain("error 0");
  });

  it("un aviso nulo no entra ni rompe la cola", () => {
    const cola = agregarAviso(agregarAviso([], exito("uno")), null);
    expect(cola.map((a) => a.texto)).toEqual(["uno"]);
  });

  it("el mismo texto repetido no se apila dos veces: no es información nueva", () => {
    const cola = agregarAviso(agregarAviso([], exito("se guardó")), exito("se guardó"));
    expect(cola).toHaveLength(1);
  });
});

describe("descartarAviso", () => {
  it("saca el que se cierra y deja los demás", () => {
    const primero = exito("uno");
    const segundo = error("dos");
    const cola = descartarAviso(agregarAviso(agregarAviso([], primero), segundo), primero!.id);
    expect(cola.map((a) => a.texto)).toEqual(["dos"]);
  });

  it("un id que no está no cambia nada", () => {
    const cola = agregarAviso([], exito("uno"));
    expect(descartarAviso(cola, "no-existe")).toHaveLength(1);
  });
});

describe("elPlazoCorre · pausar lo que se va solo (D30, WCAG 2.2.1)", () => {
  const sinRetenciones: MotivoDeRetencion[] = [];

  it("sin nadie leyendo, el plazo del éxito corre", () => {
    expect(elPlazoCorre(exito("se agregó")!, sinRetenciones)).toBe(true);
  });

  it("con el foco del teclado adentro, el plazo NO corre", () => {
    // Es el hallazgo 7 del review de T23: enfocar la X y esperar cuatro
    // segundos desmontaba el nodo que tenía el foco y el foco caía a `body`.
    expect(elPlazoCorre(exito("se agregó")!, ["foco"])).toBe(false);
  });

  it("con el mouse encima, el plazo NO corre", () => {
    expect(elPlazoCorre(exito("se agregó")!, ["mouse"])).toBe(false);
  });

  it("el error no tiene plazo que correr, retenido o no", () => {
    expect(elPlazoCorre(error("no se pudo guardar")!, sinRetenciones)).toBe(false);
  });
});

describe("agregarRetencion / quitarRetencion", () => {
  it("el mismo motivo dos veces no se apila: entrar con el mouse no cuenta doble", () => {
    expect(agregarRetencion(agregarRetencion([], "mouse"), "mouse")).toEqual(["mouse"]);
  });

  it("sacar el mouse NO reanuda el plazo si el teclado sigue adentro", () => {
    // Los dos motivos son independientes y alcanza con uno. Sin esto, mover
    // el mouse afuera de la X mientras el teclado la tiene enfocada reanudaba
    // el plazo: el mismo robo de foco por una puerta más chica.
    const retenciones = agregarRetencion(agregarRetencion([], "foco"), "mouse");
    const soloElFoco = quitarRetencion(retenciones, "mouse");
    expect(soloElFoco).toEqual(["foco"]);
    expect(elPlazoCorre(exito("se agregó")!, soloElFoco)).toBe(false);
  });

  it("cuando se van los dos motivos, el plazo vuelve a correr", () => {
    const retenciones = quitarRetencion(
      quitarRetencion(agregarRetencion(agregarRetencion([], "foco"), "mouse"), "mouse"),
      "foco",
    );
    expect(elPlazoCorre(exito("se agregó")!, retenciones)).toBe(true);
  });

  it("quitar un motivo que no está no cambia nada", () => {
    expect(quitarRetencion(["foco"], "mouse")).toEqual(["foco"]);
  });
});

describe("cerrarConEscape (D30)", () => {
  it("con el foco adentro de un aviso, Escape cierra ESE y deja los demás", () => {
    const primero = exito("uno");
    const segundo = exito("dos");
    const cola = agregarAviso(agregarAviso([], primero), segundo);
    expect(cerrarConEscape(cola, segundo!.id).map((aviso) => aviso.texto)).toEqual(["uno"]);
  });

  it("con el foco adentro, Escape cierra el error también: es un pedido explícito", () => {
    const elError = error("no se pudo guardar");
    expect(cerrarConEscape(agregarAviso([], elError), elError!.id)).toEqual([]);
  });

  it("con el foco afuera, Escape se lleva los que se iban a ir solos", () => {
    const cola = agregarAviso(agregarAviso([], exito("se guardó")), error("no se pudo guardar"));
    expect(cerrarConEscape(cola, null).map((aviso) => aviso.texto)).toEqual([
      "no se pudo guardar",
    ]);
  });

  it("con el foco afuera, el error se QUEDA: un error que desaparece es un error perdido (C3)", () => {
    // El Escape global es el mismo que cierra modales y paneles del sitio. Si
    // se llevara el error, cerrar un modal borraría un error que nadie leyó.
    const elError = error("no se pudo guardar");
    expect(cerrarConEscape(agregarAviso([], elError), null).map((a) => a.texto)).toEqual([
      "no se pudo guardar",
    ]);
  });
});

describe("aDondeVuelveElFoco (D30, WCAG 2.4.3)", () => {
  it("devuelve el elemento que tenía el foco antes del aviso", () => {
    const boton = { isConnected: true };
    expect(aDondeVuelveElFoco(boton, { isConnected: true })).toBe(boton);
  });

  it("sin elemento previo no hay a dónde volver", () => {
    expect(aDondeVuelveElFoco(null, { isConnected: true })).toBeNull();
  });

  it("un elemento que ya no está en la página no sirve", () => {
    // Pasa de verdad: la ficha del producto puede desmontarse mientras su
    // aviso todavía está en pantalla.
    expect(aDondeVuelveElFoco({ isConnected: false }, { isConnected: true })).toBeNull();
  });

  it("el `body` no es un destino: devolverle el foco al body ES el síntoma", () => {
    const body = { isConnected: true };
    expect(aDondeVuelveElFoco(body, body)).toBeNull();
  });
});
