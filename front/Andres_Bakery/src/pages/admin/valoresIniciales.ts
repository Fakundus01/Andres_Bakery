/** Con qué arranca cada formulario del panel.
 *
 *  Vive afuera de `usePanelDeAdmin` porque son datos y no estado, y porque
 *  ese hook ya estaba al borde de las 300 líneas (R05). Se siguen importando
 *  desde `usePanelDeAdmin`, que los re-exporta: ningún import cambió.
 */
import { filasDelProducto } from "../../lib/variantes";
import type { PerfilAndrea, Product } from "../../lib/types";
import type { ProductForm, TagForm } from "../../lib/ui-types";

export const formularioDeProductoVacio: ProductForm = {
  name: "",
  description: "",
  steps: "",
  prep_note: "",
  price: "",
  unit_label: "unidad",
  min_qty: "1",
  qty_step: "1",
  category: "general",
  image_url: "",
  available: true,
  allows_pickup: true,
  allows_delivery: true,
  tag_ids: [],
  ingredient_ids: [],
  option_group_ids: [],
  variants: [],
};

export const formularioDeEtiquetaVacio: TagForm = { name: "", color_token: "acento", sort_order: "0" };

export const perfilVacio: PerfilAndrea = {
  role: "",
  tagline: "",
  photo_url: "",
  location: "",
  socials: [],
  cv: {
    published: false,
    headline: "",
    summary: "",
    contact_email: "",
    file_url: "",
    skills: [],
    experience: [],
    education: [],
  },
};

/** El formulario cargado con un producto que ya existe.
 *
 *  Lo que importa acá son los **ids de los tamaños**: viajan de vuelta al
 *  guardar para que el back actualice las filas en vez de reemplazarlas. Sin
 *  eso, cada guardado les cambia el id y el carrito que alguien tenía abierto
 *  se come un 400 en el checkout (ADR-029 parte 3).
 */
export function formularioDesdeProducto(product: Product): ProductForm {
  return {
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
    ingredient_ids: (product.ingredients ?? []).map((ingrediente) => ingrediente.id),
    option_group_ids: (product.option_groups ?? []).map((grupo) => grupo.id),
    variants: filasDelProducto(product),
  };
}
