/** Pesos como se muestran en toda la web: sin centavos.
 *
 *  `conCentavos` existe para un caso puntual (el recargo de un sabor, F61):
 *  la columna guarda dos decimales y el mensaje de WhatsApp los dice, asi que
 *  redondear "500,50" a "501" en la pantalla donde se elige seria la unica
 *  parte del flujo que miente sobre lo que se cobra. */
export function formatCurrency(value: number, { conCentavos = false } = {}) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: conCentavos ? 2 : 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function getErrorMessage(reason: unknown) {
  if (reason instanceof Error) {
    return reason.message;
  }
  return "Ocurrió un error inesperado.";
}

export function getStatusTone(status: string) {
  switch (status) {
    case "paid":
    case "published":
    case "delivered":
      return "bg-exito-suave text-tinta";
    case "payment_pending":
    case "pending":
    case "in_progress":
      return "bg-alerta-suave text-tinta";
    case "payment_failed":
    case "draft":
      return "bg-error-suave text-tinta";
    default:
      return "bg-superficie-alt text-tinta-suave";
  }
}

export function labelForPaymentMethod(paymentMethod?: string | null) {
  switch (paymentMethod) {
    case "visa":
      return "Visa vía Mercado Pago";
    case "mastercard":
      return "Mastercard vía Mercado Pago";
    case "mercado_pago":
      return "Mercado Pago";
    default:
      return "Mercado Pago";
  }
}
