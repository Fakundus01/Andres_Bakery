# status.md · Andres Bakery

**Versión:** 0.5.0 · **Última actualización:** 2026-10-16

## 1 · Dónde estamos

El repo tiene 4 meses de código (15 commits, el último el 2026-03-08) y **estuvo 7 meses quieto**. El 2026-10-16 se le aplicó el SDD por el flujo brownfield (R15).

**Salud medida hoy, no deducida:**

| Check | Resultado |
|---|---|
| Tests del back | **70 OK** (eran 19 antes de T3) |
| Lint del front (eslint + tsc) | limpio |
| Build del front | verde — 326,85 KB JS · 29,22 KB CSS |
| Migraciones | `0002` aplicada. Probada sobre **una copia** antes que sobre la base real, en los dos sentidos y desde base vacía |
| App corriendo | back en `127.0.0.1:5000`, front en `127.0.0.1:5188`. Flujo completo probado en navegador hasta el pedido #4 |
| Responsive 390px | carta, ficha, carrito, **checkout y panel**: cero desbordes, medido con `scrollWidth` vs `clientWidth` |
| Rama | `dev`, adelantada respecto de `main` |

## 2 · Avance por feature

Lo heredado (F01–F12) está Complete salvo lo anotado. Lo pedido el 2026-10-16:

| ID | Feature | % | Estado |
|---|---|---|---|
| F13 | Partir `App.tsx` | 100% | **Complete** |
| F14–F15 | Estética pixel + 4 temas | 100% | **Complete** |
| F16–F17 | Modelo nuevo + precio por unidad | 100% | **Complete** |
| F18 | Cantidad con total en vivo | 100% | **Complete** |
| F19 | Variantes de tamaño | 80% | **In Progress** — falta cargarlas desde el panel |
| F20 | Ingredientes relacionales | 70% | **In Progress** — se ven; falta elegirlos desde el panel |
| F21 | Etiquetas + filtro | 100% | **Complete** |
| F22 | Retiro/envío por producto | 60% | **In Progress** — flags y `/api/site/delivery` listos; falta que el checkout los respete |
| F23 | Pedido por WhatsApp | 40% | Planned — T7 |
| F24 | Cartilla de Andrea | 70% | **In Progress** — la página está; falta su texto y su foto |
| F29–F30 | Nav configurable + Configuración | 100% | **Complete** |
| F33–F34 | Tarjetas que giran + carrito propio | 100% | **Complete** |
| F35–F37 | Ayuda, WhatsApp y PedidosYa | 100% | **Complete** |
| F31 | Tres roles explícitos | 60% | **In Progress** — `Order.user_id` ya es opcional; falta la ruta pública (T7) |
| F32 | Vista de cliente separada | 40% | Planned |
| F25 | Ficha de producto | 100% | **Complete** — `/producto/<slug>` |
| F38 | Responsive | 100% | **Complete** |
| F40 | Más vistas propias | 100% | **Complete** |
| F26 | Link a PedidosYa | 20% | **Deferred** — todavía no tiene tienda |
| F27 | Higiene | 100% | **Complete** |
| F28 | Receta paso a paso en la ficha | 100% | **Complete** |

T0, T1, T2, las cuatro secciones de UI y **T3** están cerradas.

## 3 · Bloqueos

| # | Bloqueo | Quién lo destraba |
|---|---|---|
| B1 | F24: la página está hecha; falta **su historia escrita y una foto**. Mientras tanto se ve el texto genérico del seed | Andrea → `material-cliente/` |
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
| ~~D12~~ | ~~`backend/.env` no lo lee nadie~~ | resuelta 2026-10-16 | `backend/env_file.py` lo carga antes de `Config` (ADR-015). `PAYMENTS_ENABLED` y `WHATSAPP_PHONE` ya existen en `Config`; **todavía no los lee ningún servicio** (pagos ⇒ T4, WhatsApp ⇒ T7) |
| ~~D13~~ | ~~`admin123` como default en un repo público, reescrito en cada arranque~~ | resuelta 2026-10-16 | `ADMIN_EMAIL`/`ADMIN_PASSWORD` sin default, `ensure_admin()` no pisa la clave y `ADMIN_PASSWORD_RESET` rota a pedido. Sin `JWT_SECRET_KEY` se usa una al azar por proceso. El mail real **sigue en el historial de git** |
| D14 | El carrito guarda una **foto del producto** (nombre y precio) en `localStorage`. Si Andrea cambia el precio, el carrito sigue mostrando el viejo hasta vaciarlo | 2026-10-16 | el total **lo recalcula el servidor**, así que no se cobra de menos; lo que miente es la pantalla. Se arregla releyendo los productos al cargar el carrito |
| D15 | Los mensajes de error de la API están **en inglés** y la UI los muestra tal cual (`product 3 is sold in steps of 6 unidad`) | 2026-10-16 | el front los previene antes de llegar, así que hoy casi no se ven. Al traducirlos, que sea en un solo lugar |
| D9 | Varios `.py` del back arrancan con BOM | 2026-10-16 | cosmético — `services/__init__.py` ya quedó sin BOM |
| D10 | `pip-audit` y `npm audit` sin correr tras 7 meses quietos (R19) | 2026-10-16 | |
| ~~D11~~ | ~~`front/.env` apunta a `default-profile.svg`~~ | resuelta en T0 | el path quedó bien. Se vio además que **nadie lee** `VITE_PROFILE_DEFAULT`: queda para T8/F24 |

## 5 · Próximo paso propuesto

**T3 cerrada el 2026-10-16**, junto con **D12** y **D13** (el `admin123` ya no está en el repo público). Con el esquema estable, lo que destraba más cosas por orden:

1. **T7 · Pedido por WhatsApp** (F23, F31). El back arma el mensaje con los importes de la DB y aparece la ruta pública de pedido: ahí recién queda cerrado el invitado sin cuenta (ADR-012), que hoy está a mitad de camino (la columna es opcional, falta el camino).
2. **T4/T6 · Terminar el panel** (F19, F20): cargar variantes e ingredientes desde la pantalla de Andrea. Hoy el modelo y la API los soportan, pero ella solo puede cargarlos por API.
3. **F41 · Deploy** (ADR-014). Ya no está bloqueado por el esquema. Antes conviene decidir host del back y Postgres, con su ADR y los números en `costs.md`.

**Sin cambios:** F24 sigue esperando **la historia escrita y la foto de Andrea**, y F23/F22 esperan el número de WhatsApp y la zona/costo reales. Nada de eso se inventa.
