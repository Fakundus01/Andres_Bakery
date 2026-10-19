import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Plus } from "lucide-react";

import { ConfirmarBorrado } from "../../components/ConfirmarBorrado";
import { Modal } from "../../components/Modal";
import { contarEtiquetas, textoDeBorrado } from "../../lib/borrados";
import { usePantallaGrande } from "../../lib/usePantallaGrande";
import type { Product, Tag } from "../../lib/types";
import type { TagForm } from "../../lib/ui-types";
import { FormularioDeEtiqueta, ID_DEL_FORMULARIO_DE_ETIQUETA } from "./FormularioDeEtiqueta";
import { ListaDeEtiquetas } from "./ListaDeEtiquetas";

/** Las etiquetas en el panel: la lista, el pop-up que las edita y el que
 *  pregunta antes de borrar (ADR-035).
 *
 *  Es la misma forma que `ProductsTab`, y eso es el punto: el humano pidió
 *  que no quedara *"en este lugar sí, en este lugar no"*. En computadora se
 *  edita en pop-up y la lista usa todo el ancho; en celular los dos van en la
 *  página, por el teclado virtual (ADR-034).
 */
export function TagsTab({
  tags,
  products,
  tagForm,
  setTagForm,
  editingTagId,
  setEditingTagId,
  onSubmit,
  onReset,
  onDelete,
}: {
  tags: Tag[];
  products: Product[];
  tagForm: TagForm;
  setTagForm: Dispatch<SetStateAction<TagForm>>;
  editingTagId: number | null;
  setEditingTagId: Dispatch<SetStateAction<number | null>>;
  /** Devuelve si se guardó: el pop-up se cierra solo cuando el back dijo sí. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onReset: () => void;
  onDelete: (tagId: number) => void;
}) {
  const enPopUp = usePantallaGrande();
  const [abierto, setAbierto] = useState(false);
  const [aBorrar, setABorrar] = useState<Tag | null>(null);
  const usos = useMemo(() => contarEtiquetas(products), [products]);

  const titulo = editingTagId ? "Editar etiqueta" : "Nueva etiqueta";

  const guardar = (evento: FormEvent<HTMLFormElement>) => {
    // Cerrar solo si se guardó: un nombre repetido vuelve con 400 y lo tipeado
    // tiene que seguir ahí (reviewer de T19).
    void onSubmit(evento).then((guardado) => {
      if (guardado) {
        setAbierto(false);
      }
    });
  };

  const formulario = (
    <FormularioDeEtiqueta tagForm={tagForm} setTagForm={setTagForm} onSubmit={guardar} />
  );

  const botones = (
    <div className="flex flex-wrap gap-3">
      <button className="btn-primary" type="submit" form={ID_DEL_FORMULARIO_DE_ETIQUETA}>
        {editingTagId ? "Guardar cambios" : "Crear etiqueta"}
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

  const abrirParaEditar = (tag: Tag) => {
    setEditingTagId(tag.id);
    setTagForm({ name: tag.name, color_token: tag.color_token, sort_order: String(tag.sort_order) });
    setAbierto(true);
  };

  const confirmacion = (
    <ConfirmarBorrado
      abierto={aBorrar !== null}
      titulo={aBorrar ? `¿Borrar «${aBorrar.name}»?` : ""}
      texto={textoDeBorrado("etiqueta", aBorrar ? usos[aBorrar.id] ?? 0 : 0)}
      onCerrar={() => setABorrar(null)}
      onConfirmar={() => {
        if (aBorrar) {
          onDelete(aBorrar.id);
        }
        setABorrar(null);
      }}
    />
  );

  if (!enPopUp) {
    return (
      <section className="grid gap-6">
        <div className="pixel-panel space-y-4 p-6">
          <h3 className="font-display text-3xl font-semibold text-tinta">{titulo}</h3>
          {formulario}
          {botones}
        </div>
        <ListaDeEtiquetas
          tags={tags}
          usos={usos}
          conTitulo
          onEditar={(tag) => {
            setEditingTagId(tag.id);
            setTagForm({
              name: tag.name,
              color_token: tag.color_token,
              sort_order: String(tag.sort_order),
            });
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
          {tags.length === 1 ? "1 etiqueta" : `${tags.length} etiquetas`} · las que importan en tu
          carta las sabés vos
        </p>
        <button
          className="btn-primary"
          type="button"
          onClick={() => {
            onReset();
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva etiqueta
        </button>
      </div>

      <ListaDeEtiquetas
        tags={tags}
        usos={usos}
        onEditar={abrirParaEditar}
        onPedirBorrado={setABorrar}
      />

      <Modal
        abierto={abierto}
        titulo={titulo}
        descripcion="Las etiquetas son los filtros de la carta: el cliente las ve como botones arriba de los productos."
        onCerrar={() => setAbierto(false)}
        pie={botones}
      >
        {formulario}
      </Modal>
      {confirmacion}
    </section>
  );
}
