# security.md · Andres Bakery

**Versión:** 0.1.0 · **Clasificado el:** 2026-10-16 (R27) · **Reclasificar:** con cada feature nueva

## 1 · Superficie (R27)

| Nivel | ¿Aplica? | Por qué |
|---|---|---|
| **N0 · Base** | Sí | todo proyecto |
| **N1 · Identidad** | Sí | hay login con JWT y rol admin |
| **N2 · Datos** | Sí | nombre, email, teléfono y dirección de entrega de personas |
| **N3 · Plata** | Sí (latente) | Mercado Pago está implementado, apagado hasta tener credenciales (ADR-002) |
| **N4 · IA** | No | el "Soporte guiado" es un árbol de respuestas fijas, no un modelo |
| **N5 · Archivos** | No **hoy** | las fotos son `image_url` (texto). Si el panel pasa a subir archivos ⇒ **reclasificar** |
| **N6 · Superficie pública** | Sí | la API Flask queda expuesta |

## 2 · Estado medido el 2026-10-16

### N0 · Base

| Control | Estado |
|---|---|
| `.gitignore` con `.env` | ✅ está, y `*.db` y `.venv/` también |
| `.env.example` sin valores | ✅ existe en `backend/` |
| Secretos fuera del código | ✅ **sí** desde el 2026-10-16 (ADR-015): `ADMIN_EMAIL` y `ADMIN_PASSWORD` sin default — sin ellos no se crea admin —, `JWT_SECRET_KEY` cae a una clave **al azar por proceso**, y `backend/env_file.py` lee el `.env` de verdad. El email real **ya quedó en el historial de git** y eso no se deshace |
| Dependencias sin vulnerabilidades | ❓ sin auditar. `pip-audit` y `npm audit` pendientes (R19: el repo estuvo 7 meses quieto) |
| HTTPS | n/a: no hay deploy |

**Acción pendiente:** correr `pip-audit` y `npm audit` (R19, D10). Lo de los secretos quedó cerrado: ver **ADR-015**. Queda un control nuevo que no existía antes — `ensure_admin()` ya no reescribe la contraseña del admin en cada arranque, así que la clave que Andrea elija desde el panel es la que vale; para rotarla a mano hay `ADMIN_PASSWORD_RESET=true`, de una sola vez.

### N1 · Identidad

| Control | Estado |
|---|---|
| Hash de contraseña | ✅ `werkzeug.security` (`models.py:31`), nunca texto plano |
| Autorización ≠ autenticación | ✅ `payment_service.py` compara `order.user_id` contra la identidad del token; `admin_required` protege las rutas de admin |
| Sesión en cookie `httpOnly` | ❌ el token va a **`localStorage`** (`AuthContext.tsx:33-73`). Un XSS lo lee |
| Vencimiento de sesión | ⚠️ el default de flask-jwt-extended (15 min de access token); no está declarado en `config.py` |
| Rate limit en login | ❌ no hay, en ningún endpoint |
| Logout del lado del servidor | ❌ se borra el token local y nada más |

**Acción, por orden de rendimiento:** (1) rate limit en `/api/auth/login` y `/api/contact`, que hoy son gratis de abusar; (2) declarar el vencimiento explícito; (3) evaluar el pase a cookie `httpOnly` — es un refactor de `AuthContext` + config de JWT, y conviene decidirlo antes de T1 para no partir `App.tsx` dos veces.

### N2 · Datos — inventario

- **Qué se guarda:** nombre, email y hash de contraseña (`User`); nombre, teléfono, dirección, barrio y ciudad de entrega (`OrderDelivery`); el detalle de cada pedido.
- **Qué se decidió NO guardar:** datos de tarjeta (los toca Mercado Pago, nunca nosotros), fecha de nacimiento, documento. Lo que no está no se filtra.
- **De dónde sale:** lo carga la propia persona al registrarse y al pedir.
- **Para qué:** entregar el pedido y poder avisarle si hay un problema. Nada más.
- **Retención:** **[PENDIENTE]** sin definir. Propuesta: pedidos 2 años (respaldo ante reclamos), cuentas sin pedidos 1 año.
- **Con quién se comparte:** Mercado Pago (si se prende), el servidor SMTP de los avisos, y el hosting. **[PENDIENTE: cuál SMTP]** — hoy `MAIL_SERVER` está vacío.
- **Cómo se borra:** **[PENDIENTE]** no hay mecanismo. En Argentina aplica la **Ley 25.326**, que da derecho a pedir el borrado.
- **Borrado real en SQLite:** un `DELETE` deja los bytes en páginas libres del archivo. Cuando se implemente el borrado: `pragma secure_delete = on`, `VACUUM` después, y el test lee **los bytes del archivo**, no las filas.
- **Logs sin datos personales:** ❓ sin revisar.

### N3 · Plata (latente)

| Control | Estado |
|---|---|
| Nunca tocar datos de tarjeta | ✅ todo pasa por el checkout de Mercado Pago |
| El precio lo calcula el servidor | ✅ `order_service.py:37-62` relee `unit_price` de la DB y suma el envío de `DELIVERY_FEE`. **Cubierto por tests; no puede volverse rojo (V7)** |
| Confirmación por webhook, no por redirect | ✅ `routes/payments.py:25` |
| Idempotencia | ✅ hace upsert por `(order_id, provider, provider_payment_id)` |
| Verificar la firma del webhook | ❌ no se valida `x-signature` |

**Sobre la firma, con precisión** (corrige una lectura apresurada anterior): el handler **no confía en el body**. Toma el id del pago y lo consulta contra la API de Mercado Pago con `get_payment()`, y recién ahí lee `external_reference` y el estado de la **respuesta de MP**. Un webhook falso con un id inventado recibe 404 de MP y muere. Por eso esto **no** es "cualquiera regala pedidos pagos": el riesgo real es un endpoint sin autenticar que dispara una llamada saliente por request. Igual se valida la firma — está en la lista de N3 y es barato — pero su prioridad es **hardening**, no incendio.

### N6 · Superficie pública

| Control | Estado |
|---|---|
| SQL parametrizado | ✅ todo por el ORM, cero concatenación |
| CORS explícito, no `*` | ✅ `FRONTEND_ORIGINS` por env, lista separada por comas |
| Validar toda entrada en el servidor | ⚠️ parcial: hay `parse_int` y chequeos en los servicios, pero no validación por esquema |
| Rate limit general | ❌ no hay |
| Errores que no cuentan de más | ⚠️ `ExternalServiceError` propaga el body de error de Mercado Pago tal cual al cliente (`payment_service.py:89`) |
| Headers `nosniff` / `X-Frame-Options` / `Referrer-Policy` / CSP | ❌ no hay |
| Paginación con techo | ❌ `GET /api/products` y `/api/orders` devuelven todo. Con la carta de una repostería no duele; con `Order` crece para siempre |

## 3 · Datos de terceros y responsabilidades

- **Etiquetas de alérgenos ("sin TACC", "sin lactosa"):** las carga ella y son su declaración, bajo su responsabilidad. El software las muestra; no las certifica. Conviene que el front lo diga en letra chica junto al filtro.
- **Material de la clienta** (fotos, logo, textos, su historia): va a `material-cliente/` tal como llega, con quién lo mandó y cuándo. No se descarga de otro lado ni se inventa.
- **Arte de Stardew Valley:** no es nuestro. ADR-003 cierra la puerta: la estética se hace con CSS propio, no con assets del juego.

## 4 · Lo que BLOQUEA un `done` (R16)

Nada de esta lista está marcado como crítico hoy, así que no hay bloqueo abierto. Pasan a crítico — y bloquean release — si el proyecto se publica:

1. ~~`JWT_SECRET_KEY` y `ADMIN_PASSWORD` con valor propio en `.env`~~ — resuelto (ADR-015). Al desplegar hay que **cargarlos en el entorno del host**: sin `JWT_SECRET_KEY` las sesiones se cortan en cada reinicio, y sin `ADMIN_EMAIL` no hay panel.
2. Rate limit en login y contacto.
3. Headers de seguridad.
4. Firma del webhook, si se prende Mercado Pago.
