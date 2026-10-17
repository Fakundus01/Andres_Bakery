# status.md · Andres Bakery

**Versión:** 0.8.0 · **Última actualización:** 2026-10-17

## 1 · Dónde estamos

El repo tiene 4 meses de código y **estuvo 7 meses quieto** hasta el 2026-10-16, cuando se le aplicó el SDD por el flujo brownfield (R15). Desde entonces van cinco ciclos: T0–T3 el 16, y **T10–T14 el 17**.

**Salud medida hoy, no deducida:**

| Check | Resultado |
|---|---|
| Tests del back | **151 OK** (eran 70 al cerrar T3) |
| Tests del front | **48 OK** — Vitest, lógica pura (ADR-023). Eran 0 hasta hoy |
| Lint del front (eslint + tsc) | limpio |
| Build del front | verde — 366,59 KB JS · 33,92 KB CSS |
| Migraciones | **`0003` aplicada**. Probada sobre una copia antes que sobre la real, en los dos sentidos y desde base vacía |
| App corriendo | back en `127.0.0.1:5000`, front en `127.0.0.1:5173`. Probado en navegador: giro por hover, subida de una foto real de punta a punta, panel con gráficos, perfil y `/cv` |
| Responsive 390px | `/cv`, `/historia`, `/tienda` y `/admin`: cero desbordes, medido con `scrollWidth` vs `clientWidth` |
| Archivos > 300 líneas | ninguno (el más largo es `CheckoutPage.tsx`, 278) |
| Encontrado usando la página | el hover le borraba la rotación al dorso de la tarjeta (0.7.1). Lo vio el humano, no los tests ni el reviewer: **nadie había pasado el mouse por encima de una tarjeta ya dada vuelta** |
| Revisión independiente | dos revisores que **re-ejecutaron** (R30/R31). Entre los dos encontraron **seis cosas reales**: el techo de gasto de la IA en memoria, una carrera que devolvía 500 en un endpoint público, un filtro de URL con un agujero de un carácter, rutas basura contadas como la portada, un gráfico que ignoraba el filtro de fechas, y dos tests que pasaban de casualidad. **Las seis quedaron corregidas con su test**, cada uno visto en rojo primero |
| Rama | `dev`, adelantada respecto de `main` |

## 2 · Avance por feature

Lo heredado (F01–F12) está Complete salvo lo anotado. De lo pedido el 2026-10-16, sigue abierto lo mismo que antes. Lo pedido el **2026-10-17** cerró entero:

| ID | Feature | % | Estado |
|---|---|---|---|
| F42 | Hover que da vuelta la tarjeta | 100% | **Complete** — y el dorso ganó el "Agregar" (ADR-016) |
| F43 | Redes sociales en el perfil | 100% | **Complete** — falta que ella cargue sus links reales |
| F44 | CV / perfil profesional en `/cv` | 100% | **Complete** — falta su trayectoria real |
| F45 | Subir fotos desde el panel | 100% | **Complete** — N5 activado con sus controles |
| F46 | Asistente de recetas con IA | 100% | **Complete, apagado** — necesita `ANTHROPIC_API_KEY` y la decisión de gastar |
| F47 | Gráficos de ventas | 100% | **Complete** |
| F48 | Visitas medidas sin cookies | 100% | **Complete** |
| F50 | Header limpio + menú de cuenta | 100% | **Complete** — T15 |
| F51 | `/cuenta`, el perfil de quien usa el sitio | 100% | **Complete** — T15 |
| F52 | Panel lateral fijo o que se abre al acercarse | 100% | **Complete** — T15 |
| F53 | La tarjeta gira con un clic en la foto | 100% | **Complete** — T15, reemplaza el hover de F42 |
| F49 | Panel más fácil | 100% | **Complete** — la foto se sube, el borrador prellena |

**Lo que sigue abierto de las tandas anteriores** (sin cambios en este ciclo): F19 y F20 (variantes e ingredientes desde el panel, 80% y 70%), F22 (que el checkout respete el flag por producto, 60%), F23 y F31 (WhatsApp y la ruta pública de pedido, T7), F24 (su texto y su foto), F32 (vista propia de cliente), F26 (PedidosYa, diferida) y F41 (deploy, diferida).

> **F20 se movió un poco sin querer:** el asistente de IA propone ingredientes y el panel los **muestra para copiar**, porque guardarlos todavía no se puede. Cuando F20 cierre, ese bloque pasa a ser un clic.

## 3 · Bloqueos

| # | Bloqueo | Quién lo destraba |
|---|---|---|
| B1 | F24: falta **su historia escrita y una foto**. El perfil, las redes y el CV ya tienen dónde entrar | Andrea → `material-cliente/` |
| B2 | F23 no tiene número de WhatsApp | Andrea |
| B4 | F22 no tiene zona ni costo de envío reales | Andrea |
| B5 | F07 (Mercado Pago) no tiene credenciales | Andrea, o se queda apagado (ADR-002) |
| **B7** | **F46 no tiene `ANTHROPIC_API_KEY`**, y prenderlo cuesta plata (`costs.md`: ~USD 0,02 por borrador). Está construido y testeado con un cliente falso | el humano decide: la llave y el gasto |

Ninguno bloquea lo que se construyó. B7 es nuevo y es una decisión, no un impedimento técnico.

## 4 · Deuda registrada

Lo de 0.5.0 sigue igual salvo lo tachado. **D3 se cerró** y entraron tres deudas nuevas, todas nacidas de la subida de archivos:

| ID | Deuda | Desde | Nota |
|---|---|---|---|
| D1 | Token de sesión en `localStorage`, no en cookie `httpOnly` | 2026-10-16 | sigue |
| D2 | Sin rate limit en ningún endpoint | 2026-10-16 | **subió de prioridad**: `POST /api/uploads` es admin-only, pero `/api/metrics/view` es público y sin límite. Ya **no puede crear filas** (la lista blanca de rutas lo acota a ~39 por día) ni tirar un 500 (la carrera se cerró), pero sigue siendo una escritura con commit por request: un bot ensucia el número que ella mira y hace trabajar la base de arriba |
| ~~D3~~ | ~~Sin headers de seguridad~~ | resuelta 2026-10-17 | globales en `after_request` (ADR-018) |
| D4 | Firma del webhook de MP sin validar | 2026-10-16 | sigue |
| D5 | Ninguna lista pagina | 2026-10-16 | el panel ya no depende de eso para contar (`/api/metrics/summary`) |
| D6 | Respuestas de escritura inconsistentes | 2026-10-16 | sigue |
| **D21** | **A 320px** (por debajo del mínimo que nos pusimos, 390) `/tienda` desborda 15px | 2026-10-17 | lo midió el reviewer. A 390 está impecable en las 11 rutas. Queda anotado por si alguna vez baja el piso |
| ~~D7~~ | ~~Cero tests de front~~ | **resuelta en parte** 2026-10-17 | entró Vitest (ADR-023) y la **lógica pura** quedó cubierta con 48 tests. Lo que sigue sin red son los **componentes**: para eso hace falta `jsdom` + Testing Library, con su propia decisión. La línea vieja decía: **sigue creciendo**: ya hay seis funciones puras sin cubrir y el bug de los emojis en `iniciales` salió de una lectura, no de un test. Entra Vitest cuando se apruebe la dependencia. **crece**: hay lógica propia que lo amerita (`ejeY`, `normalizar_ruta` del lado del front, `urlDeImagen`). Lo de arriba se probó en navegador, no con tests |
| D8 | Retención y borrado de datos personales sin definir | 2026-10-16 | sigue. Las visitas **no** agrandan esto: son contadores sin persona (ADR-019) |
| **D19** | **Se tira el perfil de color de la foto.** El limpiador descarta el chunk `iCCP`/los APPn, así que una foto de iPhone en Display P3 conserva sus píxeles pero pierde el perfil y el navegador la dibuja como sRGB | 2026-10-17 | lo marcó el reviewer y es **de producto, no de seguridad**: en una repostería la foto *es* el producto y el corrimiento de color se ve. Hoy es el precio de no tener `Pillow`; se resuelve igual que D16 |
| **D20** | **La llamada real al SDK de Anthropic no tiene test.** El parseo de la respuesta sí (`leer_respuesta`, que salió afuera justo para eso); lo que no se ejercita nunca es `messages.create` | 2026-10-17 | es la frontera con una librería de terceros. Si algún día cambia la forma del pedido, lo vamos a ver en producción y no en los tests |
| **D16** | **WEBP y HEIC se rechazan.** HEIC es el default de iPhone | 2026-10-17 | el mensaje lo nombra y dice qué hacer, pero si ella saca fotos con iPhone lo va a ver seguido. Se arregla con `Pillow` o convirtiendo en el navegador antes de subir |
| **D17** | **Lo subido no se borra nunca.** Cambiar la foto de un producto deja la anterior en disco | 2026-10-17 | nadie la ve (el nombre es aleatorio), pero ocupa lugar. Hace falta un barrido de huérfanas |
| **D18** | **No hay cuota de disco** para las subidas | 2026-10-17 | 4 MB por archivo, infinitos archivos. Con un solo admin no es urgente; al deployar, sí |
| D14 | El carrito guarda una foto del producto en `localStorage` | 2026-10-16 | sigue |
| D15 | Mensajes de error de la API en inglés | 2026-10-16 | los nuevos (subida, IA, métricas) **salen en castellano**; los viejos siguen igual |
| D9 | Varios `.py` del back arrancan con BOM | 2026-10-16 | cosmético |
| **D23** | **16 avisos de seguridad en las dependencias del front, 12 altos.** `react-router-dom` (la mayoría de modo SSR, que no usamos; **dos sí aplican**: open redirect por barra invertida y por ruta `//`), `vite` (tres altos, todos del servidor de desarrollo), `postcss`, `nanoid` y las de `eslint` | 2026-10-17 | medido al instalar Vitest, que **no** los trajo. Actualizar es R19: pide su OK y su verificación. `react-router-dom` se arregla con un salto de versión menor |
| D10 | ~~`pip-audit` y `npm audit` sin correr~~ (R19) | 2026-10-16 | `npm audit` **corrió el 2026-10-17**: resultado en D23. `pip-audit` sigue pendiente | **ahora importa más**: entró `anthropic` como dependencia nueva |
| ~~D11~~, ~~D12~~, ~~D13~~ | | resueltas | ver 0.4.0 y 0.5.0 |

## 5 · Próximo paso propuesto

Con T10–T14 cerrados, por orden de lo que destraba más:

1. **T7 · Pedido por WhatsApp** (F23, F31). Sigue siendo lo que falta para que el invitado pueda comprar sin cuenta. Es el agujero más grande del flujo.
2. **T4/T6 · Terminar el panel** (F19, F20): variantes e ingredientes desde la pantalla. Con F46 andando, los ingredientes que propone la IA pasarían de "copiá esto" a un clic.
3. **D2 · Rate limit**, aunque sea en `/api/metrics/view`, `/api/auth/login` y `/api/contact`. Es barato y los tres están expuestos.
4. **F41 · Deploy** (ADR-014). Ojo con lo nuevo: las fotos viven en el disco del back, y el disco de Render free **no persiste**. Antes del deploy hay que decidir dónde van (Cloudflare R2 o Supabase Storage, los dos free) o se pierden en cada reinicio.

**Sin cambios:** F24 sigue esperando **la historia escrita y la foto de Andrea**, y ahora también **sus redes y su trayectoria** si quiere el CV publicado. Nada de eso se inventa.
