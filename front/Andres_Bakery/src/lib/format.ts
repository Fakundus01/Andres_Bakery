export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
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
