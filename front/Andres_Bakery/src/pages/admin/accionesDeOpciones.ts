/** Las seis operaciones sobre grupos de sabores, con su aviso (F57).
 *
 *  Es una función y no un hook a propósito: `useOpcionesDelPanel` no puede
 *  recibir `conAviso` porque eso armaría un ciclo —`conAviso` recarga, y la
 *  recarga depende del hook—, y `usePanelDeAdmin` no puede quedarse con estas
 *  seis porque ya pasaba las 300 líneas (R05). Así cada una queda donde tiene
 *  sentido: el hook sabe pedir, esto sabe qué decirle a Andrea después.
 */
import { formatCurrency } from "../../lib/format";

export interface OperacionesDeOpciones {
  crearEtiquetaDeTortas: () => Promise<void>;
  crearGrupo: (nombre: string, obligatorio: boolean) => Promise<void>;
  renombrarGrupo: (id: number, nombre: string) => Promise<void>;
  cambiarObligatoriedad: (id: number, obligatorio: boolean) => Promise<void>;
  borrarGrupo: (id: number) => Promise<void>;
  crearOpcion: (grupoId: number, nombre: string, recargo: number) => Promise<void>;
  editarOpcion: (
    grupoId: number,
    opcionId: number,
    nombre: string,
    recargo: number,
  ) => Promise<void>;
  borrarOpcion: (grupoId: number, opcionId: number) => Promise<void>;
}

/** Lo que el aviso agrega cuando el sabor cuesta más (F61).
 *
 *  Decir el recargo en el aviso es lo que le confirma que el número entró:
 *  el campo se limpia al guardar, así que sin esto el "guardado" no distingue
 *  entre "+$500" y "me comí el campo". */
function avisoDelRecargo(recargo: number): string {
  return recargo > 0 ? ` con +${formatCurrency(recargo)}` : "";
}

export function accionesDeOpciones(
  operaciones: OperacionesDeOpciones,
  conAviso: (trabajo: () => Promise<void>, mensaje: string) => Promise<boolean>,
  olvidarGrupoDelFormulario: (id: number) => void,
) {
  return {
    crearEtiquetaDeTortas: () =>
      void conAviso(
        () => operaciones.crearEtiquetaDeTortas(),
        "Etiqueta creada. Ponela en tus tortas a pedido para que se puedan personalizar.",
      ),

    crearGrupoDeOpciones: (nombre: string, obligatorio: boolean) =>
      void conAviso(
        () => operaciones.crearGrupo(nombre, obligatorio),
        `Grupo «${nombre}» creado. Cargale los sabores y marcalo en las tortas que lo lleven.`,
      ),

    renombrarGrupoDeOpciones: (id: number, nombre: string) =>
      void conAviso(() => operaciones.renombrarGrupo(id, nombre), "Grupo renombrado."),

    cambiarObligatoriedadDelGrupo: (id: number, obligatorio: boolean) =>
      void conAviso(
        () => operaciones.cambiarObligatoriedad(id, obligatorio),
        obligatorio
          ? "Ahora hay que elegir uno de este grupo para poder pedir."
          : "Ahora este grupo se puede dejar sin elegir.",
      ),

    borrarGrupoDeOpciones: (id: number) => {
      // Igual que con los ingredientes: la copia del id que tiene el
      // formulario sobrevive al borrado, y al guardar el producto salía
      // "one or more option_groups do not exist", en inglés y sin explicar
      // nada. Lo marcó el reviewer de T6-F20b para el caso de al lado.
      olvidarGrupoDelFormulario(id);
      void conAviso(
        () => operaciones.borrarGrupo(id),
        "Grupo eliminado. Salió de todos los productos que lo tenían.",
      );
    },

    crearOpcionDelGrupo: (grupoId: number, nombre: string, recargo: number) =>
      void conAviso(
        () => operaciones.crearOpcion(grupoId, nombre, recargo),
        `«${nombre}» agregado${avisoDelRecargo(recargo)}.`,
      ),

    editarOpcionDelGrupo: (
      grupoId: number,
      opcionId: number,
      nombre: string,
      recargo: number,
    ) =>
      void conAviso(
        () => operaciones.editarOpcion(grupoId, opcionId, nombre, recargo),
        `«${nombre}» guardado${avisoDelRecargo(recargo)}.`,
      ),

    borrarOpcionDelGrupo: (grupoId: number, opcionId: number) =>
      void conAviso(
        () => operaciones.borrarOpcion(grupoId, opcionId),
        "Sabor eliminado. Los pedidos viejos siguen diciendo lo que se vendió.",
      ),
  };
}
