import type { PaymentMethod } from "./types";
import type { Slide } from "./ui-types";

// TODO(T9/C4 del SDD): el costo de envio tiene que venir del back (DELIVERY_FEE),
// no estar duplicado aca. Se mueve cuando se haga retiro/envio de verdad.
export const DELIVERY_FEE = 2500;
export const DEFAULT_NEIGHBORHOOD = "Villa Maipú";
export const DEFAULT_CITY = "General San Martín";

export const heroFallback: Slide[] = [
  {
    eyebrow: "Edición especial",
    title: "Dulces de autor con entrega local en Villa Maipú",
    description:
      "Una vidriera pastel con compras simples, checkout por Mercado Pago y una identidad mucho mas editorial.",
    image:
      "https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=1400&q=80",
    accent: "Recetas, cajas y tortas hechas por la admin",
    ctaLabel: "Explorar la tienda",
    ctaTo: "/tienda",
  },
  {
    eyebrow: "Pedidos guiados",
    title: "Comprá online y terminá el pago con Mercado Pago, Visa o Mastercard",
    description:
      "El flujo de compra queda orientado a carrito, checkout y seguimiento, sin una UI improvisada ni pasos sueltos.",
    image:
      "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=1400&q=80",
    accent: "Checkout claro, historial y mails automáticos",
    ctaLabel: "Ir al checkout",
    ctaTo: "/checkout",
  },
  {
    eyebrow: "Panel admin",
    title: "Gestioná recetas, productos y pedidos desde un dashboard visual",
    description:
      "Alta, edición y baja de dulces, control de ventas y contenido del sitio desde una sola vista con foco comercial.",
    image:
      "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1400&q=80",
    accent: "Dashboard bonito y pensado para operar el negocio",
    ctaLabel: "Ver panel",
    ctaTo: "/admin",
  },
];

export const paymentOptions: Array<{ id: PaymentMethod; title: string; description: string }> = [
  {
    id: "mercado_pago",
    title: "Mercado Pago",
    description: "Wallet o checkout general con todas las opciones disponibles.",
  },
  {
    id: "visa",
    title: "Visa",
    description: "Pagás con Visa dentro del checkout seguro de Mercado Pago.",
  },
  {
    id: "mastercard",
    title: "Mastercard",
    description: "Pagás con Mastercard dentro del checkout seguro de Mercado Pago.",
  },
];

export const orderStatusOptions = [
  "pending",
  "payment_pending",
  "paid",
  "in_progress",
  "ready",
  "delivered",
  "payment_failed",
];

export const supportReplies = [
  {
    label: "Envios en Villa Maipú",
    answer:
      "Hacemos entregas dentro de Villa Maipú. En el checkout podés elegir envío local o retiro por el punto de entrega.",
  },
  {
    label: "Medios de pago",
    answer:
      "Trabajamos con Mercado Pago. Desde ahí podés completar con saldo, Visa o Mastercard, según la opción que elijas al comprar.",
  },
  {
    label: "Pedidos personalizados",
    answer:
      "Si querés una caja regalo o una torta especial, dejá el detalle en el chat y lo derivamos al mail de soporte para seguimiento.",
  },
];
