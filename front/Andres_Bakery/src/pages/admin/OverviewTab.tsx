import { StatusPill } from "../../components/ui";
import { formatDate } from "../../lib/format";
import type { Order, User } from "../../lib/types";

export function OverviewTab({ orders, users }: { orders: Order[]; users: User[] }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="pixel-panel p-6">
        <h3 className="font-display text-3xl font-semibold text-tinta">Pedidos recientes</h3>
        <div className="mt-5 space-y-4">
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="border-[3px] border-borde bg-superficie/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-tinta">Pedido #{order.id}</p>
                  <p className="text-sm text-tinta-tenue">{order.user?.name} · {formatDate(order.created_at)}</p>
                </div>
                <StatusPill status={order.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pixel-panel p-6">
        <h3 className="font-display text-3xl font-semibold text-tinta">Usuarios</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {users.slice(0, 6).map((currentUser) => (
            <div key={currentUser.id} className="border-[3px] border-borde bg-superficie/90 p-4">
              <p className="font-semibold text-tinta">{currentUser.name}</p>
              <p className="mt-1 text-sm text-tinta-tenue">{currentUser.email}</p>
              <span className="mt-3 inline-flex bg-tinta px-3 py-1 text-xs font-semibold text-crema">{currentUser.is_admin ? "Admin" : "Cliente"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
