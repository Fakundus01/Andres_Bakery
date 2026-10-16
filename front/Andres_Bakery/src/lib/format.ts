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
      return "bg-emerald-100 text-emerald-800";
    case "payment_pending":
    case "pending":
    case "in_progress":
      return "bg-amber-100 text-amber-800";
    case "payment_failed":
    case "draft":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-stone-200 text-stone-700";
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
