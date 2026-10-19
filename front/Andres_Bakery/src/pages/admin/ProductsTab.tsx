import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Plus } from "lucide-react";

import { Modal } from "../../components/Modal";
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onDelete: (productId: number) => void;
}) {
  const { products, editingProductId, setEditingProductId, setProductForm, onReset, onDelete } =
    props;
  const enPopUp = usePantallaGrande();
  const [abierto, setAbierto] = useState(false);

  const titulo = editingProductId ? "Editar producto" : "Nuevo producto";
  const guardar = (evento: FormEvent<HTMLFormElement>) => {
    props.onSubmit(evento);
    // El pop-up se cierra al guardar: si el guardado falla, el aviso de error
    // del panel queda a la vista, que es donde ella está mirando.
    setAbierto(false);
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
          onDelete={onDelete}
        />
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

      <ListaDeProductos products={products} onEditar={abrirParaEditar} onDelete={onDelete} />

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
    </section>
  );
}
