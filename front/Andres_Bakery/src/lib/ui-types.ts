// Tipos de presentacion. Los DTO de la API viven en types.ts.

export type DashboardTab = "overview" | "products" | "tags" | "orders" | "perfil" | "story";

export type Slide = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  accent: string;
  ctaLabel: string;
  ctaTo: string;
};

export type ProductForm = {
  name: string;
  description: string;
  /** La receta paso a paso: vive en el producto desde T3 (ADR-001). */
  steps: string;
  prep_note: string;
  price: string;
  unit_label: string;
  min_qty: string;
  qty_step: string;
  category: string;
  image_url: string;
  available: boolean;
  allows_pickup: boolean;
  allows_delivery: boolean;
  tag_ids: number[];
};

export type TagForm = {
  name: string;
  color_token: string;
  sort_order: string;
};
