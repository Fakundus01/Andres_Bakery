import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useSiteConfig } from "../../contexts/SiteConfigContext";
import { ordersApi, paymentsApi } from "../../lib/api";
import { DEFAULT_CITY } from "../../lib/constants";
import { linkWhatsApp } from "../../lib/contacto";
import { getErrorMessage } from "../../lib/format";
import type { DeliveryMethod, PaymentMethod } from "../../lib/types";
import { armarPayload, queFalta } from "./pedidoDelFormulario";

export interface PedidoHecho {
  numero: number;
  total: number;
  /** `null` cuando el back no tiene `WHATSAPP_PHONE` cargado. */
  whatsapp: string | null;
  conCuenta: boolean;
}

export function useCheckout() {
  const { items, subtotal, clearCart } = useCart();
  const { isLoggedIn, token, user } = useAuth();
  const { config } = useSiteConfig();

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercado_pago");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    neighborhood: "",
    city: DEFAULT_CITY,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState<PedidoHecho | null>(null);

  useEffect(() => {
    setForm((actual) => ({
      ...actual,
      name: user?.name ?? actual.name,
      email: user?.email ?? actual.email,
    }));
  }, [user?.email, user?.name]);

  // La zona la dice el back: es la misma que valida el pedido del otro lado.
  useEffect(() => {
    if (config?.zone_name) {
      setForm((actual) => ({ ...actual, neighborhood: actual.neighborhood || config.zone_name }));
    }
  }, [config?.zone_name]);

  // Mercado Pago está apagado hasta tener credenciales (ADR-002). Mientras
  // tanto el pedido se cierra por WhatsApp, y eso NO pide cuenta (ADR-025).
  const pagoOnline = config?.payments_enabled === true;
  const envio = deliveryMethod === "delivery" ? config?.fee ?? 0 : 0;
  const total = subtotal + envio;

  const cambiar = (campo: keyof typeof form, valor: string) =>
    setForm((actual) => ({ ...actual, [campo]: valor }));

  const payload = () =>
    armarPayload({ items, form, deliveryMethod, paymentMethod, zona: config?.zone_name });

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError("");

    const falta = queFalta({
      items,
      form,
      pagoOnline,
      isLoggedIn,
      zona: deliveryMethod === "delivery" ? config?.zone_name : undefined,
    });
    if (falta) {
      setError(falta);
      return;
    }

    setSubmitting(true);
    try {
      if (!pagoOnline) {
        const pedido = await ordersApi.crearPorWhatsApp(payload(), token);
        clearCart();
        setHecho({
          numero: pedido.order_id,
          total: pedido.total,
          // El texto lo escribió el servidor con los precios de la base: acá
          // solo se arma el link.
          whatsapp: linkWhatsApp(pedido.phone, pedido.message),
          conCuenta: isLoggedIn,
        });
        return;
      }

      const pedido = await ordersApi.create(
        { ...payload(), channel: "mercado_pago" },
        token as string,
      );
      const checkout = await paymentsApi.checkout(pedido.order_id, paymentMethod, token as string);
      clearCart();

      if (checkout.checkout_url) {
        window.location.href = checkout.checkout_url;
        return;
      }
      setError(
        "El pedido quedó creado, pero Mercado Pago no devolvió una URL de pago. Escribinos por WhatsApp y lo cerramos ahí.",
      );
    } catch (motivo: unknown) {
      setError(getErrorMessage(motivo));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    config,
    cambiar,
    deliveryMethod,
    enviar,
    envio,
    error,
    form,
    hecho,
    isLoggedIn,
    items,
    pagoOnline,
    paymentMethod,
    setDeliveryMethod,
    setPaymentMethod,
    subtotal,
    submitting,
    total,
  };
}
