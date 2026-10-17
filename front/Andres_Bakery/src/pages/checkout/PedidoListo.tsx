import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import { formatCurrency } from "../../lib/format";
import type { PedidoHecho } from "./useCheckout";

/** Lo que ve alguien que acaba de pedir. Al invitado no se le ofrece "mis
 *  pedidos": esa pantalla pide cuenta y sería mandarlo a un login. */
export function PedidoListo({ pedido }: { pedido: PedidoHecho }) {
  return (
    <div className="pixel-panel mx-auto max-w-xl space-y-5 p-7 text-center">
      <h1 className="font-display text-3xl font-bold text-tinta">
        Pedido #{pedido.numero} anotado
      </h1>
      <p className="text-sm leading-7 text-tinta-suave">
        Son {formatCurrency(pedido.total)}. Falta un paso: mandale el mensaje a Andrea para que
        lo vea y te confirme el pago y la entrega.
      </p>

      {pedido.whatsapp ? (
        <>
          <a
            href={pedido.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full justify-center"
          >
            <MessageCircle className="h-4 w-4" />
            Mandarle el pedido por WhatsApp
          </a>
          <p className="text-xs leading-6 text-tinta-tenue">
            El mensaje ya viene escrito con tu pedido y el total. Se abre WhatsApp y vos lo mandás.
          </p>
        </>
      ) : (
        <p className="border-[3px] border-dashed border-borde bg-superficie-alt p-4 text-sm leading-6 text-tinta-suave">
          El pedido quedó guardado con el número de arriba, pero la web todavía no tiene cargado el
          WhatsApp del negocio. Escribinos por donde puedas con ese número y lo buscamos.
        </p>
      )}

      {pedido.conCuenta ? (
        <Link to="/pedidos" className="btn-secondary w-full justify-center">
          Ver mis pedidos
        </Link>
      ) : null}
      <Link to="/tienda" className="btn-secondary w-full justify-center">
        Seguir mirando la carta
      </Link>
    </div>
  );
}
