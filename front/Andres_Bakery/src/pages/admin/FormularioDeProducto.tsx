import type { Dispatch, FormEvent, SetStateAction } from "react";

import { FotoDelProducto } from "./FotoDelProducto";
import { SelectorDeGruposDeOpciones } from "./SelectorDeGruposDeOpciones";
import { SelectorDeIngredientes } from "./SelectorDeIngredientes";
import { VariantesDelProducto } from "./VariantesDelProducto";
import { Field } from "../../components/ui";
import { estadoDeLaEtiqueta } from "../../lib/carrito";
import { formatCurrency } from "../../lib/format";
import type { BorradorReceta, Ingredient, OptionGroup, Product, Tag } from "../../lib/types";
import type { ProductForm } from "../../lib/ui-types";

/** El id del `<form>`, para que el botón de guardar pueda vivir **afuera**.
 *
 *  Lo necesita el pop-up: los botones van en el pie fijo, fuera del área que
 *  scrollea, y un `<button form="...">` manda el formulario desde ahí. Es
 *  HTML de siempre, no un truco de React. */
export const ID_DEL_FORMULARIO = "formulario-de-producto";

/** Cargar o editar un producto. Vive en su propio archivo porque se muestra
 *  en dos lugares: en la página (celular) y adentro de un pop-up
 *  (computadora, ADR-034). */
export function FormularioDeProducto({
  products,
  tags,
  gruposDeOpciones,
  ingredientes,
  usosDeIngredientes,
  onCrearIngrediente,
  onRenombrarIngrediente,
  onBorrarIngrediente,
  productForm,
  setProductForm,
  editingProductId,
  onSubmit,
  token,
  iaPrendida,
}: {
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const cambiar = <Clave extends keyof ProductForm>(clave: Clave, valor: ProductForm[Clave]) =>
    setProductForm((current) => ({ ...current, [clave]: valor }));

  /** El borrador **completa**, no sobrescribe: si ella ya escribió algo, eso
   *  gana. Perder dos párrafos suyos por apretar un botón sería peor que no
   *  tener el botón (ADR-020). */
  const aplicarBorrador = (borrador: BorradorReceta) =>
    setProductForm((current) => ({
      ...current,
      name: current.name || borrador.name,
      category: current.category && current.category !== "general" ? current.category : borrador.category || "general",
      description: current.description || borrador.description,
      unit_label: current.unit_label || borrador.unit_label,
      steps: current.steps || borrador.steps.join("\n"),
      prep_note: current.prep_note,
    }));

  const alternarEtiqueta = (tagId: number) =>
    setProductForm((current) => ({
      ...current,
      tag_ids: current.tag_ids.includes(tagId)
        ? current.tag_ids.filter((id) => id !== tagId)
        : [...current.tag_ids, tagId],
    }));

  const alternarGrupo = (grupoId: number) =>
    setProductForm((current) => ({
      ...current,
      option_group_ids: current.option_group_ids.includes(grupoId)
        ? current.option_group_ids.filter((id) => id !== grupoId)
        : [...current.option_group_ids, grupoId],
    }));

  const alternarIngrediente = (ingredienteId: number) =>
    setProductForm((current) => ({
      ...current,
      ingredient_ids: current.ingredient_ids.includes(ingredienteId)
        ? current.ingredient_ids.filter((id) => id !== ingredienteId)
        : [...current.ingredient_ids, ingredienteId],
    }));

  return (
    <form id={ID_DEL_FORMULARIO} className="space-y-4" onSubmit={onSubmit}>
        <Field label="Nombre">
          <input className="field" value={productForm.name} onChange={(event) => cambiar("name", event.target.value)} required />
        </Field>
        <Field label="Descripción">
          <textarea className="field min-h-24" value={productForm.description} onChange={(event) => cambiar("description", event.target.value)} />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Precio de una unidad">
            <input className="field" type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => cambiar("price", event.target.value)} required />
          </Field>
          <Field label="Unidad">
            <input className="field" value={productForm.unit_label} onChange={(event) => cambiar("unit_label", event.target.value)} placeholder="unidad, docena, kg..." />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Mínimo de pedido">
            <input className="field" type="number" min="1" step="1" value={productForm.min_qty} onChange={(event) => cambiar("min_qty", event.target.value)} />
          </Field>
          <Field label="Se vende de a">
            <input className="field" type="number" min="1" step="1" value={productForm.qty_step} onChange={(event) => cambiar("qty_step", event.target.value)} />
          </Field>
        </div>
        <p className="border-[3px] border-borde bg-superficie-alt p-3 text-xs leading-5 text-tinta-suave">
          Si pusieras mínimo 6 y "de a" 6, el cliente puede pedir 6, 12 o 18; nunca 7. Dejalos en 1 si
          se vende de uno en uno.
        </p>

        <Field label="Categoría">
          <input className="field" value={productForm.category} onChange={(event) => cambiar("category", event.target.value)} />
        </Field>

        <FotoDelProducto
          imagenUrl={productForm.image_url}
          nombre={productForm.name}
          token={token}
          iaPrendida={iaPrendida}
          onImagen={(url) => cambiar("image_url", url)}
          onBorrador={aplicarBorrador}
          ingredientes={ingredientes}
          elegidos={productForm.ingredient_ids}
          onAlternarIngrediente={alternarIngrediente}
          onCrearIngrediente={onCrearIngrediente}
        />

        <Field label="Aviso de preparación">
          <input className="field" value={productForm.prep_note} onChange={(event) => cambiar("prep_note", event.target.value)} placeholder="Se encarga con 48 h de anticipación" />
        </Field>

        <Field label="Receta paso a paso (opcional)">
          <textarea
            className="field min-h-32"
            value={productForm.steps}
            onChange={(event) => cambiar("steps", event.target.value)}
            placeholder={"Un paso por línea.\nDerretir el chocolate...\nBatir los huevos..."}
          />
        </Field>
        <p className="text-xs leading-5 text-tinta-tenue">
          Si lo dejás vacío, la ficha del producto no muestra la sección de receta. Un paso por línea.
        </p>

        <SelectorDeIngredientes
          ingredientes={ingredientes}
          elegidos={productForm.ingredient_ids}
          usos={usosDeIngredientes}
          onAlternar={alternarIngrediente}
          onCrear={onCrearIngrediente}
          onRenombrar={onRenombrarIngrediente}
          onBorrar={onBorrarIngrediente}
        />

        <VariantesDelProducto
          filas={productForm.variants}
          variantesGuardadas={
            products.find((producto) => producto.id === editingProductId)?.variants
          }
          onCambiar={(filas) => cambiar("variants", filas)}
        />

        <SelectorDeGruposDeOpciones
          grupos={gruposDeOpciones}
          elegidos={productForm.option_group_ids}
          onAlternar={alternarGrupo}
          productoEtiquetado={estadoDeLaEtiqueta(tags, productForm.tag_ids).etiquetada}
          etiquetaParecida={estadoDeLaEtiqueta(tags, productForm.tag_ids).parecida}
        />

        {tags.length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-tinta-suave">Etiquetas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={productForm.tag_ids.includes(tag.id)}
                  onClick={() => alternarEtiqueta(tag.id)}
                  className={`border-[3px] border-borde px-3 py-1.5 text-xs font-bold uppercase ${
                    productForm.tag_ids.includes(tag.id) ? "bg-acento text-crema" : "bg-superficie-alt text-tinta"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="border-[3px] border-dashed border-borde p-3 text-xs leading-5 text-tinta-suave">
            Todavía no creaste ninguna etiqueta. Se crean en la pestaña Etiquetas.
          </p>
        )}

        <div className="space-y-2">
          {(
            [
              ["available", "Disponible en la carta"],
              ["allows_delivery", "Se puede enviar"],
              ["allows_pickup", "Se puede retirar"],
            ] as const
          ).map(([clave, etiqueta]) => (
            <label key={clave} className="flex items-center gap-3 border-[3px] border-borde bg-superficie px-4 py-3 text-sm font-medium text-tinta-suave">
              <input type="checkbox" checked={productForm[clave]} onChange={(event) => cambiar(clave, event.target.checked)} />
              {etiqueta}
            </label>
          ))}
        </div>
    </form>
  );
}
