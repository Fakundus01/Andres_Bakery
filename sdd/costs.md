# costs.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16

Constraint de `spec.md` C1: **USD 0/mes**. Si algo pasa a ser pago, se avisa antes (R14).

## 1 · Hoy

Cero. No hay deploy: todo corre local (Vite en 5173/5174, Flask en 5000, SQLite en archivo).

## 2 · Para publicarlo (free tier, R14)

| Pieza | Elección | Costo hoy | A escala |
|---|---|---|---|
| Front | **Vercel** o **Cloudflare Pages** hobby | USD 0 | sigue 0 para este tráfico; el límite es ancho de banda, no visitas |
| Back | **Render** free, o **Fly.io** | USD 0 | Render free **duerme** tras inactividad: el primer pedido del día espera ~30 s. Pasar a instancia paga son ~USD 7/mes |
| DB | **SQLite en disco** mientras siga en un solo proceso | USD 0 | si el back escala a más de una instancia, SQLite deja de servir ⇒ **Neon** o **Supabase** free (ADR nuevo) |
| Mail | SMTP de Gmail con contraseña de aplicación | USD 0 | límites de envío diario; si crece, Resend free (3.000/mes) |
| Imágenes | URLs externas (hoy es `image_url`) | USD 0 | si pasa a subida, Cloudflare R2 o Supabase Storage free ⇒ activa N5 de seguridad |
| Dominio | — | ~USD 10–15/año si quiere `.com`; `.com.ar` por NIC | el único gasto seguro |

**El riesgo real del free tier no es la plata, es el sueño de Render.** Para una repostería que recibe pedidos durante el día, 30 segundos en el primer pedido es aceptable; si molesta, es el primer gasto que vale la pena.

## 3 · Lo que se evitó gastar

| Opción | Costo | Por qué no |
|---|---|---|
| WhatsApp Business API oficial | por conversación + verificación de negocio | `wa.me` con mensaje prellenado es gratis y no requiere alta (ADR-002) |
| Mercado Pago | sin costo fijo; comisión por venta | implementado y apagado hasta que ella decida cobrar online (ADR-002) |
| Deliverect (para integrar PedidosYa) | licencia mensual | solo para clientes suyos y no resuelve el pedido de origen (ADR-008) |
| Tipografía pixel con licencia | pago | Google Fonts tiene opciones libres (ADR-003) |

## 4 · Costo de agentes

R12: este proyecto no necesita tier alto para todo.

| Trabajo | Tier |
|---|---|
| Partir `App.tsx`, mover componentes, higiene (T0, T1) | **ECONÓMICO** — mecánico y verificable con lint/build |
| Temas, modelo de datos, contrato, WhatsApp (T2–T7) | **MEDIO** |
| Decisiones de arquitectura, revisión de seguridad, este `sdd/` | **ALTO** |

El gasto por ciclo se anota en el `HANDBACK` (R30). Hoy: n/d.
