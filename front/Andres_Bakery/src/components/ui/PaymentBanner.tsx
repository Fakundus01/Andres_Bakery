export function PaymentBanner({ paymentState }: { paymentState: string }) {
  const messageMap: Record<string, string> = {
    approved: "Pago aprobado. El pedido ya quedó registrado en tu historial.",
    pending: "El pago quedó pendiente. En cuanto Mercado Pago responda, el estado va a actualizarse.",
    failure: "El pago no se pudo completar. Podés volver a intentar desde un nuevo pedido.",
  };
  return <div className="border-[3px] border-borde bg-superficie/90 px-5 py-4 text-sm text-tinta-suave">{messageMap[paymentState] ?? "Estado de pago actualizado."}</div>;
}
