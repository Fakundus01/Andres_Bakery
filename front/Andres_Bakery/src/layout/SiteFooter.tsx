import { Link } from "react-router-dom";
import { MapPin, MessageCircle, Truck } from "lucide-react";

import { useSiteConfig } from "../contexts/SiteConfigContext";
import { linkWhatsApp, PEDIDOS_YA_URL } from "../lib/contacto";

export function SiteFooter() {
  const { config } = useSiteConfig();
  const whatsapp = linkWhatsApp(config?.whatsapp_phone);

  return (
    <footer className="border-t-[4px] border-borde bg-superficie">
      <div className="mx-auto grid max-w-7xl xl:max-w-[88rem] 2xl:max-w-[104rem] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-2xl font-bold text-tinta">Andres Bakery</p>
          <p className="mt-2 text-sm leading-6 text-tinta-suave">
            Dulces artesanales hechos por Andrea, con entrega en Villa Maipú y retiro coordinado.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">Dónde encontrarnos</p>
          <ul className="mt-3 space-y-2 text-sm text-tinta-suave">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-acento" />
              Villa Maipú, General San Martín
            </li>
            <li className="flex items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-acento" />
              {PEDIDOS_YA_URL ? (
                <a className="font-bold underline" href={PEDIDOS_YA_URL} target="_blank" rel="noopener noreferrer">
                  También en PedidosYa
                </a>
              ) : (
                // ADR-008: todavía no tiene tienda. No se inventa un link.
                <span>
                  PedidosYa: <span className="text-tinta-tenue">próximamente</span>
                </span>
              )}
            </li>
            {whatsapp ? (
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-acento" />
                <a className="font-bold underline" href={whatsapp} target="_blank" rel="noopener noreferrer">
                  Escribir por WhatsApp
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-tinta-tenue">La página</p>
          <ul className="mt-3 space-y-2 text-sm text-tinta-suave">
            <li><Link className="hover:text-tinta" to="/tienda">Ver la carta</Link></li>
            <li><Link className="hover:text-tinta" to="/historia">Quién es Andrea</Link></li>
            <li><Link className="hover:text-tinta" to="/configuracion">Configuración</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
