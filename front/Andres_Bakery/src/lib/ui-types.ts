// Tipos de presentacion. Los DTO de la API viven en types.ts.

export type DashboardTab = "overview" | "products" | "recipes" | "orders" | "story";

export type Slide = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  accent: string;
  ctaLabel: string;
  ctaTo: string;
};

export type ChatMessage = {
  role: "bot" | "user";
  text: string;
};

export type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  image_url: string;
  available: boolean;
};

export type RecipeForm = {
  title: string;
  summary: string;
  ingredients: string;
  steps: string;
  image_url: string;
  category: string;
  status: string;
};
