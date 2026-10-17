import type { CartItem } from "../../contexts/CartContext";
import { formatCurrency } from "../../lib/format";
import type { DeliveryConfig, DeliveryMethod } from "../../lib/types";

interface Props {
  items: CartItem[];
  subtotal: number;
  envio: number;
  total: number;
  deliveryMethod: DeliveryMethod;
  config: DeliveryConfig | null;
  pagoOnline: boolean;
}

export function ResumenDelPedido({
  items,
  subtotal,
  envio,
  total,
  deliveryMethod,
  config,
  pagoOnline,
}: Props) {
  return (
    <aside className="pixel-panel h-fit p-7">
      <p className="text-xs uppercase tracking-[0.3em] text-tinta-tenue">Resumen</p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-tinta">Tu pedido</h2>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-4 border-b border-borde pb-4">
            <div>
              <p className="font-semibold text-tinta">{item.name}</p>
              <p className="text-sm text-tinta-tenue">
                {item.quantity} {item.unit_label}
              </p>
            </div>
            <p className="font-semibold text-tinta">{formatCurrency(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      <dl className="mt-6 space-y-3 text-sm text-tinta-suave">
        <div className="flex items-center justify-between">
          <dt>Subtotal</dt>
          <dd className="font-semibold text-tinta">{formatCurrency(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Envío</dt>
          <dd className="font-semibold text-tinta">
            {deliveryMethod === "pickup" ? formatCurrency(0) : config ? formatCurrency(envio) : "a confirmar"}
          </dd>
        </div>
        <div className="flex items-center justify-between border-t-[3px] border-borde pt-3 text-base">
          <dt className="font-semibold text-tinta">Total</dt>
          <dd className="font-semibold text-tinta">{formatCurrency(total)}</dd>
        </div>
      </dl>

      <div className="mt-6 bg-tinta px-5 py-4 text-sm text-crema">
        {pagoOnline
          ? "Vas a ser redirigido a Mercado Pago para completar el pago con la opción que elijas."
          : "El total lo vuelve a calcular el servidor cuando confirmás: lo que ves acá es una cuenta, no el precio final."}
      </div>
    </aside>
  );
}
