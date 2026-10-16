# status.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16

## 1 · Dónde estamos

El repo tiene 4 meses de código (15 commits, el último el 2026-03-08) y **estuvo 7 meses quieto**. El 2026-10-16 se le aplicó el SDD por el flujo brownfield (R15).

**Salud medida hoy, no deducida:**

| Check | Resultado |
|---|---|
| Tests del back | 19 OK |
| Lint del front (eslint + tsc) | limpio |
| Build del front | verde — 292 KB JS · 41 KB CSS (antes de T1: 291 · 41) |
| App corriendo | back en `127.0.0.1:5000` y front en `localhost:5174` (5173 ocupado). Home, tienda y carrito verificados en navegador |
| Rama | `dev`, adelantada respecto de `main` |

## 2 · Avance por feature

Lo heredado (F01–F12) está Complete salvo lo anotado. Lo pedido el 2026-10-16:

| ID | Feature | % | Estado |
|---|---|---|---|
| F13 | Partir `App.tsx` | 100% | **Complete** |
| F14–F15 | Estética pixel + 4 temas | 40% | Planned |
| F16–F17 | Modelo nuevo + precio por unidad | 40% | Planned |
| F18–F19 | Cantidad con total en vivo + variantes | 40% | Planned |
| F20–F21 | Ingredientes + etiquetas | 40% | Planned |
| F22–F23 | Retiro/envío + WhatsApp | 40% | Planned |
| F24 | Cartilla de Andrea | 20% | Specified — bloqueada por su texto y su foto |
| F25 | Ficha de producto | 40% | Planned |
| F26 | Link a PedidosYa | 20% | **Deferred** — todavía no tiene tienda |
| F27 | Higiene | 100% | **Complete** |
| F28 | Receta paso a paso en la ficha | 40% | Planned |

Nada arranca hasta el OK de este `sdd/` (R08/R15).

## 3 · Bloqueos

| # | Bloqueo | Quién lo destraba |
|---|---|---|
| B1 | F24: el nombre ya está (**Andrea**), falta **su historia escrita y una foto** | Andrea → `material-cliente/` |
| B2 | F23 no tiene número de WhatsApp. No bloquea construir (sale de `WHATSAPP_PHONE`), sí probarlo de verdad | Andrea |
| B4 | F22 no tiene zona ni costo de envío reales | Andrea |
| B5 | F07 (Mercado Pago) no tiene credenciales | Andrea, o se queda apagado (ADR-002) |

**Destrabados el 2026-10-16:** B6 (ADR-010 aprobada: Flask-Migrate entra en T3), B3 ("sin TACC" confirmada como etiqueta) y la duda de `Recipe` (publica ingredientes **y** pasos ⇒ ADR-001 enmendada, F28). F26 pasó a diferida: todavía no tiene tienda en PedidosYa.

Ninguno bloquea T0, T1, T2 ni T3. El trabajo puede arrancar igual.

## 4 · Deuda registrada

| ID | Deuda | Desde | Nota |
|---|---|---|---|
| D1 | Token de sesión en `localStorage`, no en cookie `httpOnly` | 2026-10-16 | decidir **antes** de T1 para no partir `App.tsx` dos veces |
| D2 | Sin rate limit en ningún endpoint | 2026-10-16 | login y contacto primero |
| D3 | Sin headers de seguridad | 2026-10-16 | |
| D4 | Firma del webhook de MP sin validar | 2026-10-16 | hardening, no incendio — ver `security.md` N3 |
| D5 | Ninguna lista pagina | 2026-10-16 | `Order` crece para siempre |
| D6 | Respuestas de escritura inconsistentes (`{id}` vs `{status}`) | 2026-10-16 | |
| D7 | Cero tests de front | 2026-10-16 | |
| D8 | Retención y borrado de datos personales sin definir (Ley 25.326) | 2026-10-16 | |
| D9 | Varios `.py` del back arrancan con BOM | 2026-10-16 | cosmético |
| D10 | `pip-audit` y `npm audit` sin correr tras 7 meses quietos (R19) | 2026-10-16 | |
| ~~D11~~ | ~~`front/.env` apunta a `default-profile.svg`~~ | resuelta en T0 | el path quedó bien. Se vio además que **nadie lee** `VITE_PROFILE_DEFAULT`: queda para T8/F24 |

## 5 · Próximo paso propuesto

**T0 y T1 cerrados el 2026-10-16.** El siguiente ciclo es **T2** (tokens de diseño, estética pixel y los 4 temas estacionales), que ahora puede arrancar porque los componentes ya existen por separado.

Antes de T2 conviene resolver **D1** (token de sesión en `localStorage` → cookie `httpOnly`): toca `AuthContext` y el back, no el árbol de componentes, así que ya no obliga a repartir `App.tsx` dos veces.
