import { tamanosParaElPayload } from "../../lib/variantes";
import type { ProductWritePayload } from "../../lib/types";
import type { ProductForm, TagForm } from "../../lib/ui-types";

/** El formulario del panel, convertido en lo que espera la API.
 *
 *  Vive afuera del hook porque es **la traducción que define precios**: los
 *  campos del formulario son texto —vienen de `<input>`— y acá se vuelven
 *  números. Un `Number("")` que pasa como `0` es un producto gratis, así que
 *  esto tiene tests.
 */
export function payloadDelProducto(form: ProductForm): ProductWritePayload {
  return {
    name: form.name,
    description: form.description,
    steps: form.steps,
    prep_note: form.prep_note,
    price: Number(form.price),
    unit_label: form.unit_label,
    // El mínimo y el salto nunca pueden ser 0: "se vende de a 0" no existe, y
    // el back lo rechaza. Un campo vacío vale 1, que es el default real.
    min_qty: Number(form.min_qty || 1),
    qty_step: Number(form.qty_step || 1),
    category: form.category,
    image_url: form.image_url,
    available: form.available,
    allows_pickup: form.allows_pickup,
    allows_delivery: form.allows_delivery,
    tag_ids: form.tag_ids,
    ingredient_ids: form.ingredient_ids,
    option_group_ids: form.option_group_ids,
    variants: tamanosParaElPayload(form.variants),
  };
}

/** Lo mismo para la etiqueta, que es la otra traducción de texto a números del
 *  panel. Un `sort_order` vacío es 0, no `NaN`. */
export function payloadDeLaEtiqueta(form: TagForm): {
  name: string;
  color_token: string;
  sort_order: number;
} {
  return {
    name: form.name,
    color_token: form.color_token,
    sort_order: Number(form.sort_order || 0),
  };
}
