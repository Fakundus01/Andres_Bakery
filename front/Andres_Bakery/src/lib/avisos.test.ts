import { describe, expect, it } from "vitest";

import {
  TOPE_VISIBLES,
  agregarAviso,
  descartarAviso,
  msParaIrse,
  nuevoAviso,
  seVaSolo,
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

  it("el éxito tiene un plazo de varios segundos, suficiente para leerlo", () => {
    const ms = msParaIrse("exito");
    expect(ms).not.toBeNull();
    expect(ms).toBeGreaterThanOrEqual(3000);
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
