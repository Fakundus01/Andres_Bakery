/** Con qué arranca cada formulario del panel.
 *
 *  Vive afuera de `usePanelDeAdmin` porque son datos y no estado, y porque
 *  ese hook ya estaba al borde de las 300 líneas (R05). Se siguen importando
 *  desde `usePanelDeAdmin`, que los re-exporta: ningún import cambió.
 */
import type { PerfilAndrea } from "../../lib/types";
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
