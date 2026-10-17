# costs.md · Andres Bakery

**Versión:** 0.2.0 · **Última actualización:** 2026-10-17

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
| Imágenes | **subidas al panel**, guardadas en el disco del back (F45, ADR-018) | USD 0 | el disco de Render free son 0 GB persistentes: al deployar, las fotos van a **Cloudflare R2** o **Supabase Storage** (free), o se pierden en cada reinicio. Es trabajo del ciclo de deploy (F41), no de ahora |
| Dominio | — | ~USD 10–15/año si quiere `.com`; `.com.ar` por NIC | el único gasto seguro |

**El riesgo real del free tier no es la plata, es el sueño de Render.** Para una repostería que recibe pedidos durante el día, 30 segundos en el primer pedido es aceptable; si molesta, es el primer gasto que vale la pena.

## 2b · El único renglón que puede costar plata hoy: el asistente de recetas (F46, ADR-020)

Está **apagado**. Prenderlo cuesta, y estos son los números, no una sensación.

`claude-opus-5-5` por la API de Anthropic: **USD 4 por millón de tokens de entrada** y **USD 20 por millón de salida** (tarifa de la documentación del proveedor al 2026-10-17; `claude-api/shared/live-sources.md` es la fuente viva si hay que reconfirmar).

**Un borrador = una foto + un pedido + la receta que vuelve.**

| Parte | Tokens aprox. | Costo |
|---|---|---|
| La foto (≈1024×1024, la fórmula es alto×ancho/750) | ~1.400 | USD 0,0056 |
| El pedido (instrucciones + esquema de salida) | ~400 | USD 0,0016 |
| El borrador que vuelve (descripción + ingredientes + pasos) | ~700 | USD 0,0140 |
| **Total por borrador** | | **≈ USD 0,021** |

| Escenario | Cuánto sale |
|---|---|
| Andrea carga 10 productos nuevos en un mes | **USD 0,21/mes** |
| Carga 50 (mes de temporada alta) | USD 1,05/mes |
| Alguien abusa del botón todo el día contra el techo de `AI_DAILY_LIMIT=25` | USD 0,53/día ⇒ **USD 16/mes en el peor caso** |

**Por qué hay techo:** el peor caso de arriba es la razón. Sin `AI_DAILY_LIMIT` el peor caso no tiene número.

**C1 (`spec.md`) dice USD 0/mes**, así que esto **no se prende sin que el humano lo decida** (R14: si algo pasa a ser pago, se avisa antes). Dos cosas lo hacen gratis o casi: dejarlo apagado, o prenderlo y usarlo solo al cargar productos nuevos, que es exactamente para lo que está. La palanca de ahorro, si alguna vez molesta, es bajar el modelo a `claude-haiku-5-5` (USD 0,10 / USD 0,50 por millón: el borrador pasa a costar ~USD 0,0005, cuarenta veces menos) — con la contra de que un modelo más chico reconoce peor una foto de comida, y el borrador malo lo paga ella corrigiéndolo a mano.

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
| Perfil y CV, subida de archivos, métricas, asistente de IA (T10–T14) | **ALTO** para las ADR y lo que toca seguridad (archivos subidos, IA, datos de visitas); **MEDIO** para los gráficos y los formularios del panel |

El gasto por ciclo se anota en el `HANDBACK` (R30). Hoy: n/d.
