export function PaymentBanner({ paymentState }: { paymentState: string }) {
  const messageMap: Record<string, string> = {
    approved: "Pago aprobado. El pedido ya quedó registrado en tu historial.",
    pending: "El pago quedó pendiente. En cuanto Mercado Pago responda, el estado va a actualizarse.",
    failure: "El pago no se pudo completar. Podés volver a intentar desde un nuevo pedido.",
  };
  return <div className="rounded-3xl border border-stone-200 bg-white/90 px-5 py-4 text-sm text-stone-700 shadow-sm">{messageMap[paymentState] ?? "Estado de pago actualizado."}</div>;
}
