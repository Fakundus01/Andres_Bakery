import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Plus } from "lucide-react";

import { ConfirmarBorrado } from "../../components/ConfirmarBorrado";
import { Modal } from "../../components/Modal";
import { textoDeBorrado } from "../../lib/borrados";
import { FormularioDeProducto, ID_DEL_FORMULARIO } from "./FormularioDeProducto";
import { ListaDeProductos } from "./ListaDeProductos";
import { usePantallaGrande } from "../../lib/usePantallaGrande";
import type { Ingredient, OptionGroup, Product, Tag } from "../../lib/types";
import type { ProductForm } from "../../lib/ui-types";

/** La carta en el panel: el formulario y la lista.
 *
 *  **En computadora el formulario vive en un pop-up** (ADR-034) y la lista usa
 *  todo el ancho; en celular los dos van en la página, uno abajo del otro,
 *  porque un formulario largo adentro de un pop-up con el teclado virtual
 *  abierto es peor que sin pop-up.
 */
export function ProductsTab(props: {
  products: Product[];
  tags: Tag[];
  gruposDeOpciones: OptionGroup[];
  ingredientes: Ingredient[];
  usosDeIngredientes: Record<number, number>;
  onCrearIngrediente: (nombre: string) => Promise<Ingredient | null>;
  onRenombrarIngrediente: (id: number, nombre: string) => void;
  onBorrarIngrediente: (id: number) => void;
  token: string;
  iaPrendida: boolean;
  productForm: ProductForm;
  setProductForm: Dispatch<SetStateAction<ProductForm>>;
  editingProductId: number | null;
  setEditingProductId: Dispatch<SetStateAction<number | null>>;
  /** Devuelve si se guardó: el pop-up se cierra solo cuando el back dijo sí. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onReset: () => void;
  onDelete: (productId: number) => void;
}) {
  const { products, editingProductId, setEditingProductId, setProductForm, onReset, onDelete } =
    props;
  const enPopUp = usePantallaGrande();
  const [abierto, setAbierto] = useState(false);
  const [aBorrar, setABorrar] = useState<Product | null>(null);

  const titulo = editingProductId ? "Editar producto" : "Nuevo producto";
  const guardar = (evento: FormEvent<HTMLFormElement>) => {
    // Se cierra **solo si se guardó**. Cerrarlo siempre dejaba el error a la
    // vista pero se llevaba lo tipeado: el próximo "Nuevo producto" limpia el
    // formulario, así que un 400 del back costaba volver a escribir todo.
    void props.onSubmit(evento).then((guardado) => {
      if (guardado) {
        setAbierto(false);
      }
    });
  };

  const formulario = <FormularioDeProducto {...props} onSubmit={guardar} />;

  const botones = (
    <div className="flex flex-wrap gap-3">
      <button className="btn-primary" type="submit" form={ID_DEL_FORMULARIO}>
        {editingProductId ? "Guardar cambios" : "Crear producto"}
      </button>
      <button
        className="btn-secondary"
        type="button"
        onClick={() => {
          onReset();
          setAbierto(false);
        }}
      >
        {enPopUp ? "Cancelar" : "Limpiar"}
      </button>
    </div>
  );

  /** Antes no preguntaba nada: "Eliminar" borraba el producto de una, y el
   *  botón está al lado del de editar (ADR-035). */
  const confirmacion = (
    <ConfirmarBorrado
      abierto={aBorrar !== null}
      titulo={aBorrar ? `¿Borrar «${aBorrar.name}»?` : ""}
      texto={textoDeBorrado("producto")}
      onCerrar={() => setABorrar(null)}
      onConfirmar={() => {
        if (aBorrar) {
          onDelete(aBorrar.id);
        }
        setABorrar(null);
      }}
    />
  );

  const abrirNuevo = () => {
    onReset();
    setAbierto(true);
  };

  const abrirParaEditar = (form: ProductForm, id: number) => {
    setEditingProductId(id);
    setProductForm(form);
    setAbierto(true);
  };

  if (!enPopUp) {
    return (
      <section className="grid gap-6">
        <div className="pixel-panel space-y-4 p-6">
          <h3 className="font-display text-3xl font-semibold text-tinta">{titulo}</h3>
          {formulario}
          {botones}
        </div>
        <ListaDeProductos
          products={products}
          onEditar={(form, id) => {
            setEditingProductId(id);
            setProductForm(form);
          }}
          onPedirBorrado={setABorrar}
        />
        {confirmacion}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tinta-suave">
          {products.length === 1 ? "1 producto en la carta" : `${products.length} productos en la carta`}
        </p>
        <button className="btn-primary" type="button" onClick={abrirNuevo}>
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      <ListaDeProductos products={products} onEditar={abrirParaEditar} onPedirBorrado={setABorrar} />

      <Modal
        abierto={abierto}
        titulo={titulo}
        descripcion={
          editingProductId
            ? "Lo que cambies se guarda cuando apretás Guardar cambios."
            : "Nombre y precio son lo único obligatorio; el resto se puede completar después."
        }
        onCerrar={() => setAbierto(false)}
        pie={botones}
      >
        {formulario}
      </Modal>
      {confirmacion}
    </section>
  );
}
