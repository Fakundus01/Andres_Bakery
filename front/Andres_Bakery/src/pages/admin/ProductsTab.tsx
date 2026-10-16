import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Field } from "../../components/ui";
import { heroFallback } from "../../lib/constants";
import { formatCurrency } from "../../lib/format";
import type { Product } from "../../lib/types";
import type { ProductForm } from "../../lib/ui-types";

export function ProductsTab({
  products,
  productForm,
  setProductForm,
  editingProductId,
  setEditingProductId,
  onSubmit,
  onReset,
  onDelete,
}: {
  products: Product[];
  productForm: ProductForm;
  setProductForm: Dispatch<SetStateAction<ProductForm>>;
  editingProductId: number | null;
  setEditingProductId: Dispatch<SetStateAction<number | null>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onDelete: (productId: number) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <form className="glass-panel space-y-4 p-6" onSubmit={onSubmit}>
        <h3 className="font-display text-3xl font-semibold text-stone-950">{editingProductId ? "Editar producto" : "Nuevo producto"}</h3>
        <Field label="Nombre"><input className="field" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} required /></Field>
        <Field label="Descripción"><textarea className="field min-h-28" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Precio"><input className="field" type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} required /></Field>
          <Field label="Categoría"><input className="field" value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} /></Field>
        </div>
        <Field label="Imagen"><input className="field" value={productForm.image_url} onChange={(event) => setProductForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="https://..." /></Field>
        <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700">
          <input type="checkbox" checked={productForm.available} onChange={(event) => setProductForm((current) => ({ ...current, available: event.target.checked }))} />
          Disponible en la tienda
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" type="submit">{editingProductId ? "Guardar cambios" : "Crear producto"}</button>
          <button className="btn-secondary" type="button" onClick={onReset}>Limpiar</button>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="glass-panel overflow-hidden p-0">
            <img src={product.image_url || heroFallback[0].image} alt={product.name} className="h-44 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{product.category}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-stone-950">{product.name}</h3>
                </div>
                <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">{product.available ? "Activo" : "Oculto"}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">{product.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-stone-950">{formatCurrency(product.price)}</p>
                <div className="flex gap-2">
                  <button className="btn-secondary" type="button" onClick={() => { setEditingProductId(product.id); setProductForm({ name: product.name, description: product.description ?? "", price: String(product.price), category: product.category, image_url: product.image_url ?? "", available: product.available }); }}>Editar</button>
                  <button className="btn-secondary" type="button" onClick={() => onDelete(product.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
