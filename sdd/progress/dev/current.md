# T7 · Pedido por WhatsApp — implementado

**Rama:** `dev` · **Features:** F23, F31, F55 · **Versión:** 0.10.0 · **ADRs:** 025, 026
**Estado:** código y MDs listos el 2026-10-17, con OK del humano sobre las tres decisiones abiertas.

---

## Lo que se hizo

| Pieza | Dónde |
|---|---|
| Ruta pública de pedido | `backend/routes/orders.py` · `order_service.create_whatsapp_order` |
| El mensaje que le llega a Andrea | `backend/services/mensaje_whatsapp.py` |
| Tope por IP (D2) | `backend/services/rate_limit.py` + `limitar(...)` en `routes/utils.py` |
| Mail opcional | migración `0004`, `models.py`, `notifications.py` |
| Checkout sin pared de login | `pages/CheckoutPage.tsx` + `pages/checkout/{useCheckout,ResumenDelPedido,PedidoListo}` |

Las tres decisiones se resolvieron como estaban recomendadas: ruta pública en vez de la planeada con id (era un IDOR), mail opcional con migración, y D2 cerrada en la misma vuelta.

## Lo que apareció mientras tanto

1. **El envío lo decidía el cliente.** `_resolve_shipping_amount` respetaba `shipping_amount` del request: en una ruta pública, envío gratis —o negativo— a pedido. Arreglado, con test de `0`, `-5000` y basura.
2. **El cajón del carrito tapaba la pantalla** al cambiar de ruta por un link. Visto en el navegador probando el pedido de invitado.
3. **Dos tests míos estaban mal** (reloj congelado, tope de recorte demasiado chico). Anotados en `testing.md` §6.

## Evidencia

- Back: `192 tests OK` (eran 151). Front: `55 OK` (eran 49). Lint y typecheck limpios.
- Rojo medido (R29): sin el decorador del tope, `AssertionError: 429 != 201`.
- Migración `0004` probada para abajo y para arriba sobre la base real; `customer_email notnull = 0`.
- Navegador, sin sesión (`localStorage` sin token): carta → carrito → checkout → **pedido #6**, link `wa.me` con `rel="noopener noreferrer"`, carrito vaciado, y el pedido visible en el panel de Andrea con nombre y teléfono. Revisado también a 390px.

## Revisión independiente (R30) — hecha

Dos revisores re-ejecutaron sobre `5446f6b`: uno funcional y uno de seguridad. **Doce hallazgos reales**, todos corregidos con su test en 0.10.1 (detalle en el changelog). Los tres que más importaban:

1. 500 con HTML en la ruta pública ante cualquier tipo inesperado — el front mostraba el HTML crudo dentro del checkout.
2. El tope por IP quemaba cupo con los 400: tres errores de formulario y la vecina no podía comprar por un minuto.
3. `"Delivery"` con mayúscula salteaba la validación de zona y cobraba **$0 de envío** diciendo "envío" en el panel.

Y uno que salió mirando el panel con una sesión de admin descartable: **el pedido de invitado le aparecía a Andrea como "undefined", sin nombre ni teléfono**. La feature estaba entregada e inservible del lado de ella.

## PRÓXIMO PASO

Lo que diga `status.md` §5. T7 está cerrado: código, tests, revisión, correcciones y MDs.
