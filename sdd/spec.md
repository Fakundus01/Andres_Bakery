# spec.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16 · **Estado:** propuesta, esperando OK

> Generada por el flujo **brownfield (R15)** sobre un repo que ya tenía 4 meses de código y ningún SDD.
> Refleja **lo que existe** + las 4 decisiones tomadas en el cuestionario del 2026-10-16.
> Los `[PENDIENTE]` son datos del negocio que no invento (R04): los contesta el humano o la clienta.

## 0 · Identidad del proyecto (§3 del master)

- **Proyecto:** Andres Bakery — **Problema que resuelve:** una repostera vende por mensajes privados y no tiene dónde mostrar su carta con precios reales.
- **Tipo:** full-stack · **Stack:** Python/Flask + SQLAlchemy (back) · React 19 + TypeScript + Vite + Tailwind 4 (front) · SQLite
- **Equipo:** 1 persona (Facundo, desarrollador) + 1 clienta no técnica (**Andrea**, la repostera) — **Branches:** `dev` → `main`
- **IA en el producto:** no. El "Soporte guiado" del front es un árbol de respuestas fijas, no un modelo.
- **Modo de autonomía:** ESTRICTO (de `custom.md`)
- **Modo por tamaño (R18):** FULL · **Variante de dominio:** WEB
- **Nivel del humano (R23):** PRO — autor del SDD Universal. R03 normal, sin pensar-por-tres.
- **Reglas apagadas u overrides:** ninguna. `sdd/custom.md` fija PERFIL=ESTRICTO, MODO=FULL, VARIANTE=WEB.

## 1 · Problema

Una repostera de Villa Maipú (General San Martín, Buenos Aires) vende tortas, brownies y budines. Hoy:

- Toda la venta pasa por mensajes privados: cada cliente pregunta precio y disponibilidad de cero.
- No hay ningún lugar público donde ver la carta con precios, así que el precio se repite en cada conversación.
- Quien pregunta no sabe quién le está cocinando ni con qué ingredientes: no hay carta, no hay etiquetas de celiaquía, no hay historia.
- El repo tiene un storefront funcionando pero **el checkout no se puede completar**: el único camino de pago es Mercado Pago y no hay credenciales cargadas.

**[PENDIENTE]** Las cantidades reales (pedidos por semana, minutos por día contestando mensajes) no están medidas. Sin ese dato, las metas de O1 y O2 son provisorias.

## 2 · Outcomes (medibles)

| # | Outcome | Cómo se mide | Meta |
|---|---|---|---|
| O1 | El precio se autoatiende | Pedidos que llegan con producto y cantidad ya elegidos / total | > 70% a los 2 meses |
| O2 | La carta la mantiene ella sola | Altas y ediciones de producto hechas desde el panel sin el dev, por mes | 100% (hoy 0: carga el dev o nadie) |
| O3 | Se puede pedir de punta a punta | Pedidos completados en la web (hoy: imposible, el checkout corta) | > 0, y sin pasos muertos |
| O4 | La clienta tiene cara y nombre | Existe la cartilla de Andrea, e ingredientes y receta visibles por producto | Existe / no existe |
| O5 | Identidad visual propia | No se parece a un template genérico: tema Stardew pastel + 4 estaciones | Existe / no existe |

## 3 · Qué NO entra (límites de alcance)

Explícito, para no re-discutirlo cada ciclo:

- **Traer los pedidos de PedidosYa al panel.** No hay API pública autogestionada para un comercio chico en Argentina (ADR-008, con fuentes). Lo que sí entra: un link de salida a su tienda, si la tiene.
- **WhatsApp Business API oficial.** Tiene costo y verificación de negocio. Se usa `wa.me` con mensaje prellenado: gratis y sin alta.
- **App móvil nativa.** La web responsive alcanza; se asume tráfico casi todo de celular.
- **Stock y contabilidad.** No es un ERP. Un producto está disponible o no está.
- **Sprites y arte pixel de Stardew.** El look se hace con CSS y tipografía pixel libre (ADR-003). Arte real = material que aporta ella.
- **Multi-local y envíos nacionales.** Una zona de entrega + retiro en el domicilio de ella.
- **Login obligatorio para ver la carta.** La carta es pública; la cuenta solo sirve para asociar el pedido a alguien.

## 4 · Constraints y supuestos

- **C1** · Infraestructura **USD 0/mes**. Si algo pasa a ser pago se avisa antes (R14, ver `costs.md`).
- **C2** · La clienta no es técnica: el panel se opera desde el celular y sin vocabulario de programador.
- **C3** · **R05 es regla FIJA:** archivo ≤300 líneas (máx 400). `front/Andres_Bakery/src/App.tsx` tiene **1604**. No se construye encima: se parte primero (ADR-004).
- **C4** · Zona y costo de entrega vienen de env (`DELIVERY_ZONE_NAME`, `DELIVERY_FEE`, `PICKUP_ADDRESS`), con default "Villa Maipú" y $2500. El front tiene el 2500 **hardcodeado** en `App.tsx:62`: fuente de verdad duplicada, se corrige.
- **C5** · SQLite en archivo (`instance/bakery.db`). Alcanza para el volumen esperado; migrar es un ADR nuevo.
- **S1** · *Supuesto:* la gente llega desde el link del perfil de Instagram o del estado de WhatsApp. Si no pasa, O1 no se cumple aunque el software ande: es riesgo de adopción, no técnico.
- **S2** · *Supuesto:* el grueso de la venta es "N unidades del mismo producto" (5 brownies) y las tortas enteras son el caso minoritario. ADR-007 cubre los dos, pero optimiza el primero.
- **S3** · ~~*Supuesto:* solo los ingredientes, porque los pasos son su know-how.~~ **Confirmado el 2026-10-16: las dos cosas.** Andrea publica los **ingredientes** y la **receta paso a paso**. `Product` se queda con los dos campos (ADR-001, enmendada); `Recipe` como tabla igual se jubila.

## 5 · Decisiones ya tomadas

No se vuelven a discutir sin un ADR nuevo en `decisions.md`:

- **Una sola entidad vendible:** `Product` absorbe la receta (precio, unidades, ingredientes relacionales, etiquetas, descripción). `Recipe` se jubila — ADR-001
- **WhatsApp es el canal de pedido principal de v1.** Mercado Pago queda detrás de un flag, apagado hasta que haya credenciales — ADR-002
- **Estética pixel solo con CSS** + tipografía pixel de Google Fonts. Cero assets nuevos — ADR-003
- **`App.tsx` se parte** en páginas y componentes antes de cualquier feature nueva (R05) — ADR-004
- **4 temas estacionales** por CSS custom properties, default primavera, elección persistida en el navegador — ADR-005
- **Etiquetas genéricas editables por ella**, no una lista cerrada en el código — ADR-006
- **Precio por unidad con mínimo y paso opcionales** + variantes de tamaño para lo que se vende entero — ADR-007
- **PedidosYa: solo link de salida** — ADR-008
- Se mantiene Flask + SQLite + React/Vite: el repo ya está y funciona. Reescribir el stack no resuelve ningún outcome — ADR-009

## 6 · Sub-tareas (paralelizables)

| ID | Sub-tarea | Depende de |
|---|---|---|
| T0 | Higiene: borrar `front/api/*.js` muerto, sacar `stripe` de requirements, crear `.env` del back | — |
| T1 | Partir `App.tsx` (1604 → módulos ≤300) sin cambiar comportamiento | — |
| T2 | Tokens de diseño + 4 temas + selector persistido | T1 |
| T3 | Modelo de datos: `Product` absorbe receta, ingredientes relacionales, etiquetas, unidades | — |
| T4 | API de catálogo sobre el modelo nuevo (+ contrato en `contracts.md`) | T3 |
| T5 | Panel de ella: alta/edición con precio, unidades, ingredientes, etiquetas, fotos | T4 |
| T6 | Carta pública: tarjeta con precio por unidad, selector de cantidad y total en vivo | T4 (contrato, no implementación) |
| T7 | Pedido por WhatsApp: el carrito arma el mensaje y abre `wa.me`; el pedido queda en DB | T4 |
| T8 | Ficha "quién es ella": historia, foto, cómo llegó a ser repostera | material de ella |
| T9 | Retiro / envío visibles por producto + zona y costo desde una sola fuente de verdad | T3 |

T1 y T3 arrancan en paralelo (no se tocan entre sí). T5 y T6 se desacoplan con `contracts.md` aprobado. T8 está bloqueada por material, no por código.

## 7 · Criterios de verificación

Testeables, sin ambigüedad. Cada uno con su test en `testing.md`:

- **V1** · Ningún archivo de `front/Andres_Bakery/src/` supera 300 líneas; build y lint siguen verdes.
- **V2** · Elegir un tema cambia la paleta de toda la app, sobrevive a recargar, y los 4 temas pasan contraste AA en texto de cuerpo.
- **V3** · En un producto con precio por unidad, subir la cantidad a 5 muestra el total correcto (5 × precio) sin pedir nada al servidor.
- **V4** · Un producto con mínimo de 6 no deja pedir 3: el control no ofrece ese valor y el servidor rechaza un POST con 3.
- **V5** · Un producto con la etiqueta **"sin TACC"** la muestra en la carta y es filtrable por ella.
- **V6** · El botón de WhatsApp abre `wa.me` con el detalle del carrito y el total en el texto, y el pedido quedó creado en DB con los mismos importes.
- **V7** · El total lo calcula **el servidor**: un POST con un total manipulado se ignora y vale el precio de la DB (hoy ya se cumple; no se puede romper).
- **V8** · Ella puede crear un producto con precio, unidad, 3 ingredientes y 2 etiquetas desde un celular de 375px, sin scroll horizontal.
- **V9** · Los 19 tests del back siguen verdes después de migrar el modelo.
- **V10** · Un producto con receta cargada muestra ingredientes **y** pasos en su ficha; uno sin receta no deja secciones vacías colgando.
