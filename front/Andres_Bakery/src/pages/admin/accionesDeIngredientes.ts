/** Renombrar y borrar un ingrediente, con su aviso (F20).
 *
 *  Gemela de `accionesDeOpciones` y por el mismo motivo: el hook de
 *  ingredientes no puede recibir `conAviso` sin armar un ciclo, y
 *  `usePanelDeAdmin` no puede quedarse con los avisos de las dos familias sin
 *  pasar las 300 líneas (R05).
 */
export function accionesDeIngredientes(
  operaciones: {
    renombrar: (id: number, nombre: string) => Promise<void>;
    borrar: (id: number) => Promise<void>;
  },
  conAviso: (trabajo: () => Promise<void>, mensaje: string) => Promise<boolean>,
  olvidarIngredienteDelFormulario: (id: number) => void,
) {
  return {
    renombrarIngrediente: (id: number, nombre: string) =>
      void conAviso(
        () => operaciones.renombrar(id, nombre),
        "Ingrediente renombrado. Los productos que lo llevan se actualizan solos.",
      ),

    borrarIngrediente: (id: number) => {
      // El formulario no se recarga con los datos, así que su copia del id
      // sobrevive al borrado: al guardar el producto salía "one or more
      // ingredients do not exist", en inglés y sin explicar nada. Lo marcó
      // el reviewer de T6-F20b.
      olvidarIngredienteDelFormulario(id);
      void conAviso(
        () => operaciones.borrar(id),
        "Ingrediente eliminado. Salió de todos los productos que lo tenían.",
      );
    },
  };
}
