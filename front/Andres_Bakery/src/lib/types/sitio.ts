/** Lo que no es carta ni pedido: config, perfil, subidas, metricas e IA. */
export interface DeliveryConfig {
  zone_name: string;
  fee: number;
  pickup_address: string;
  whatsapp_phone: string;
  payments_enabled: boolean;
  /** Con la IA apagada el panel no ofrece el botón del asistente (F46). */
  ai_enabled: boolean;
}


export interface SiteContent {
  content: string;
}

/** Las redes que el back sabe dibujar. Cualquier otra la descarta al guardar
 *  (ADR-017), así que el front no tiene que defenderse de un valor raro. */
export type RedSocial =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "whatsapp"
  | "linkedin"
  | "pinterest"
  | "web"
  | "mail";

export interface EnlaceSocial {
  network: RedSocial;
  url: string;
  label?: string;
}

export interface EntradaCv {
  title: string;
  place?: string;
  period?: string;
  detail?: string;
}

export interface CvAndrea {
  /** En false, `/cv` existe pero no se linkea: está a medio cargar. */
  published: boolean;
  headline: string;
  summary: string;
  contact_email: string;
  file_url: string;
  skills: string[];
  experience: EntradaCv[];
  education: EntradaCv[];
}

/** Todo puede venir vacío: cada sección sin datos no se renderiza (F24). */
export interface PerfilAndrea {
  role: string;
  tagline: string;
  photo_url: string;
  location: string;
  socials: EnlaceSocial[];
  cv: CvAndrea;
}

/** Lo que devuelve POST /api/uploads (F45). `url` es una ruta del back
 *  (`/uploads/<nombre>`): se muestra con `urlDeImagen`. */
export interface SubidaDeImagen {
  url: string;
  filename: string;
  content_type: string;
  bytes: number;
  width: number;
  height: number;
}

export interface PuntoDeSerie {
  day: string;
  value: number;
}

export interface BarraDeRanking {
  label: string;
  value: number;
  revenue?: number;
}

/** Ya agregado por el servidor: el panel no suma nada (ADR-019). */
export interface ResumenMetricas {
  days: number;
  from: string;
  to: string;
  revenue_total: number;
  orders_total: number;
  orders_paid: number;
  customers: number;
  visits_total: number;
  revenue_by_day: PuntoDeSerie[];
  orders_by_day: PuntoDeSerie[];
  visits_by_day: PuntoDeSerie[];
  orders_by_status: BarraDeRanking[];
  top_products: BarraDeRanking[];
  top_paths: BarraDeRanking[];
  devices: BarraDeRanking[];
}

/** El borrador que escribe la IA (F46). Nunca trae etiquetas: los alérgenos
 *  los declara Andrea (ADR-020). */
export interface BorradorReceta {
  name: string;
  category: string;
  description: string;
  unit_label: string;
  ingredients: string[];
  steps: string[];
  notice: string;
}

/** Un renglón tal como lo manda el checkout. Del precio no se habla: lo pone
 *  el servidor a partir de `variant_id` (ADR-029). */

export interface AuthPayload {
  access_token: string;
  user_id: number;
}
