import { describe, expect, it } from "vitest";

import { altaDeIngrediente, type ApiDeIngredientes } from "./altaDeIngrediente";
import type { Ingredient } from "../../lib/types";

const AZUCAR: Ingredient = { id: 2, name: "Azúcar", unit: "g" };

function apiFalsa(parcial: Partial<ApiDeIngredientes>): ApiDeIngredientes {
  return {
    create: async () => ({ id: 99 }),
    list: async () => [],
    ...parcial,
  };
}

describe("altaDeIngrediente", () => {
  it("crea el que no existe y lo devuelve con el nombre prolijo", async () => {
    const pedidos: string[] = [];
    const api = apiFalsa({
      create: async ({ name }) => {
        pedidos.push(name);
        return { id: 7 };
      },
    });

    const resultado = await altaDeIngrediente("  Harina   0000 ", "tok", api);

    // Se guarda sin el espacio de más, pero con sus mayúsculas intactas.
    expect(pedidos).toEqual(["Harina 0000"]);
    expect(resultado).toEqual({ estado: "creado", ingrediente: { id: 7, name: "Harina 0000", unit: null } });
  });

  it("se queda con el nombre que devuelve el servidor, no con el que se tipeó", async () => {
    // El back contesta 200 con la fila que ya existia (ADR-030). Si el panel
    // se quedara con lo tipeado, el chip diria "coco rallado" mientras en la
    // base dice "Coco rallado": le muestra a Andrea un nombre que no es el
    // que se guardo, hasta que recargue. Visto en el navegador.
    const api = apiFalsa({ create: async () => ({ id: 3, name: "Coco rallado" }) });

    const resultado = await altaDeIngrediente("coco rallado", "tok", api);

    expect(resultado).toEqual({
      estado: "creado",
      ingrediente: { id: 3, name: "Coco rallado", unit: null },
    });
  });

  it("si el servidor no manda nombre, usa el que se escribió", async () => {
    const api = apiFalsa({ create: async () => ({ id: 9 }) });

    const resultado = await altaDeIngrediente("  Manteca  ", "tok", api);

    expect(resultado).toEqual({ estado: "creado", ingrediente: { id: 9, name: "Manteca", unit: null } });
  });

  it("si el alta falla relee la lista y rescata el que ya existía", async () => {
    // El caso real: la unicidad del back es por nombre exacto, así que un
    // ingrediente creado en otra pestaña (o en la ventana entre dos clics)
    // devuelve 400 y nuestra copia local no se entera. Sin la relectura, el
    // reintento fallaba igual para siempre y había que recargar el panel.
    const api = apiFalsa({
      create: async () => {
        throw new Error("ingredient already exists");
      },
      list: async () => [AZUCAR],
    });

    const resultado = await altaDeIngrediente("azucar", "tok", api);

    expect(resultado).toEqual({ estado: "ya-existia", ingrediente: AZUCAR, lista: [AZUCAR] });
  });

  it("si falla y el ingrediente tampoco está en la lista fresca, es un error de verdad", async () => {
    const motivo = new Error("sesión vencida");
    const api = apiFalsa({
      create: async () => {
        throw motivo;
      },
      list: async () => [AZUCAR],
    });

    expect(await altaDeIngrediente("Manteca", "tok", api)).toEqual({ estado: "error", motivo });
  });

  it("si la relectura también falla, el error que se cuenta es el del alta", async () => {
    const motivo = new Error("el que importa");
    const api = apiFalsa({
      create: async () => {
        throw motivo;
      },
      list: async () => {
        throw new Error("la red sigue caída");
      },
    });

    expect(await altaDeIngrediente("Manteca", "tok", api)).toEqual({ estado: "error", motivo });
  });

  it("un nombre que no es un nombre no llega a la red", async () => {
    let llamadas = 0;
    const api = apiFalsa({
      create: async () => {
        llamadas += 1;
        return { id: 1 };
      },
    });

    expect(await altaDeIngrediente("   ", "tok", api)).toEqual({ estado: "vacio" });
    expect(await altaDeIngrediente("​", "tok", api)).toEqual({ estado: "vacio" });
    expect(llamadas).toBe(0);
  });
});
