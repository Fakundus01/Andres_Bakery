import { orderStatusOptions } from "../../lib/constants";
import { formatCurrency, formatDate, labelForPaymentMethod } from "../../lib/format";
import type { Order } from "../../lib/types";

export function OrdersTab({
  orders,
  onUpdateStatus,
}: {
  orders: Order[];
  onUpdateStatus: (orderId: number, status: string) => void;
}) {
  return (
    <section className="grid gap-4">
      {orders.map((order) => (
        <article key={order.id} className="pixel-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-tinta-tenue">Pedido #{order.id}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-tinta">{order.user?.name} · {formatCurrency(order.total_amount)}</h3>
              <p className="mt-2 text-sm text-tinta-tenue">{formatDate(order.created_at)}</p>
            </div>
            <select className="field min-w-48" value={order.status} onChange={(event) => onUpdateStatus(order.id, event.target.value)}>
              {orderStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="bg-superficie-alt/90 p-4 text-sm text-tinta-suave">
              <p className="font-semibold text-tinta">Items</p>
              <ul className="mt-3 space-y-2">{order.items.map((item) => <li key={`${order.id}-${item.product_id}`}>{item.quantity} x {item.product_name}</li>)}</ul>
            </div>
            <div className="bg-superficie-alt/90 p-4 text-sm text-tinta-suave">
              <p className="font-semibold text-tinta">Entrega y pago</p>
              <p className="mt-3">{order.delivery?.delivery_method === "delivery" ? "Envío local" : "Retiro"}</p>
              <p>{order.delivery?.address || "Retiro coordinado"}</p>
              <p className="mt-2">{labelForPaymentMethod(order.delivery?.payment_method)}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
