import type { Dispatch, FormEvent, SetStateAction } from "react";

import { TagBadge } from "../../components/TagBadge";
import { FotoDelProducto } from "./FotoDelProducto";
import { Field } from "../../components/ui";
import { textoRegla } from "../../lib/cantidades";
import { heroFallback } from "../../lib/constants";
import { urlDeImagen } from "../../lib/imagenes";
import { formatCurrency } from "../../lib/format";
import type { BorradorReceta, Product, Tag } from "../../lib/types";
import type { ProductForm } from "../../lib/ui-types";

export function ProductsTab({
  products,
  tags,
  productForm,
  setProductForm,
  editingProductId,
  setEditingProductId,
  onSubmit,
  onReset,
  onDelete,
  token,
  iaPrendida,
}: {
  products: Product[];
  tags: Tag[];
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

  return (
    <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <form className="pixel-panel space-y-4 p-6" onSubmit={onSubmit}>
        <h3 className="font-display text-3xl font-semibold text-tinta">
          {editingProductId ? "Editar producto" : "Nuevo producto"}
        </h3>

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

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" type="submit">{editingProductId ? "Guardar cambios" : "Crear producto"}</button>
          <button className="btn-secondary" type="button" onClick={onReset}>Limpiar</button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="pixel-panel overflow-hidden p-0">
            <img src={urlDeImagen(product.image_url) || heroFallback[0].image} alt={product.name} className="h-44 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-tinta-tenue">{product.category}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-tinta">{product.name}</h3>
                </div>
                <span className="bg-tinta px-3 py-1 text-xs font-semibold text-crema">{product.available ? "Activo" : "Oculto"}</span>
              </div>

              {product.tags && product.tags.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <li key={tag.id}>
                      <TagBadge tag={tag} torcido={false} />
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="mt-3 text-sm leading-6 text-tinta-suave">{product.description}</p>

              <p className="mt-3 text-xs font-bold text-tinta-tenue">
                {formatCurrency(product.price)} por {product.unit_label}
                {textoRegla(product) ? ` · ${textoRegla(product)}` : ""}
                {product.steps ? " · con receta" : ""}
              </p>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => {
                    setEditingProductId(product.id);
                    setProductForm({
                      name: product.name,
                      description: product.description ?? "",
                      steps: product.steps ?? "",
                      prep_note: product.prep_note ?? "",
                      price: String(product.price),
                      unit_label: product.unit_label,
                      min_qty: String(product.min_qty),
                      qty_step: String(product.qty_step),
                      category: product.category,
                      image_url: product.image_url ?? "",
                      available: product.available,
                      allows_pickup: product.allows_pickup,
                      allows_delivery: product.allows_delivery,
                      tag_ids: (product.tags ?? []).map((tag) => tag.id),
                    });
                  }}
                >
                  Editar
                </button>
                <button className="btn-secondary" type="button" onClick={() => onDelete(product.id)}>Eliminar</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
