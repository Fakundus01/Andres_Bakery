# security.md · Andres Bakery

**Versión:** 0.2.0 · **Clasificado el:** 2026-10-16 · **Reclasificado el:** 2026-10-17 (R27: F45 prendió N5 y F46 prendió N4) · **Reclasificar:** con cada feature nueva

## 1 · Superficie (R27)

| Nivel | ¿Aplica? | Por qué |
|---|---|---|
| **N0 · Base** | Sí | todo proyecto |
| **N1 · Identidad** | Sí | hay login con JWT y rol admin |
| **N2 · Datos** | Sí | nombre, email, teléfono y dirección de entrega de personas |
| **N3 · Plata** | Sí (latente) | Mercado Pago está implementado, apagado hasta tener credenciales (ADR-002) |
| **N4 · IA** | **Sí** desde el 2026-10-17 | el asistente de recetas manda una foto a un modelo (F46, ADR-020). El panel de Ayuda sigue siendo un árbol fijo |
| **N5 · Archivos** | **Sí** desde el 2026-10-17 | el panel pasó a subir fotos de verdad (F45, ADR-018). Era el gatillo que esta fila anticipaba |
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
- **Las métricas de visitas no agrandan este inventario** (F48, ADR-019). `PageView` guarda `(día, ruta, clase de dispositivo) → cantidad`: ni IP, ni cookie, ni user agent, ni id de sesión. Es un contador, no un registro de personas, y por eso **no entra en el pedido de borrado** de la Ley 25.326: no hay nada que borrar de una persona en particular. La contracara está dicha en la ADR: no hay visitantes únicos ni se puede cruzar quién mira con quién compra.

### N3 · Plata (latente)

| Control | Estado |
|---|---|
| Nunca tocar datos de tarjeta | ✅ todo pasa por el checkout de Mercado Pago |
| El precio lo calcula el servidor | ✅ `order_service.py:37-62` relee `unit_price` de la DB y suma el envío de `DELIVERY_FEE`. **Cubierto por tests; no puede volverse rojo (V7)** |
| Confirmación por webhook, no por redirect | ✅ `routes/payments.py:25` |
| Idempotencia | ✅ hace upsert por `(order_id, provider, provider_payment_id)` |
| Verificar la firma del webhook | ❌ no se valida `x-signature` |

**Sobre la firma, con precisión** (corrige una lectura apresurada anterior): el handler **no confía en el body**. Toma el id del pago y lo consulta contra la API de Mercado Pago con `get_payment()`, y recién ahí lee `external_reference` y el estado de la **respuesta de MP**. Un webhook falso con un id inventado recibe 404 de MP y muere. Por eso esto **no** es "cualquiera regala pedidos pagos": el riesgo real es un endpoint sin autenticar que dispara una llamada saliente por request. Igual se valida la firma — está en la lista de N3 y es barato — pero su prioridad es **hardening**, no incendio.

### N4 · IA (activada el 2026-10-17 por F46, ADR-020)

El asistente de recetas manda una foto a la API de Anthropic y recibe un borrador. Está **apagado** sin `ANTHROPIC_API_KEY`, pero los controles se escribieron con el código, no para después.

| Control | Estado |
|---|---|
| La llave vive en el entorno, nunca en el repo ni en el front | ✅ `ANTHROPIC_API_KEY` por `.env`, listada en `.env.example` sin valor. El front **nunca** la ve: llama a `/api/ai/recipe-draft`, que es admin-only |
| Apagado por default | ✅ sin llave o con `AI_ENABLED=false` ⇒ **503** con mensaje explicativo, y el botón del panel no se renderiza |
| Solo admin | ✅ `@admin_required`. Un endpoint que cuesta plata por llamada no se deja público |
| Techo de gasto | ✅ `AI_DAILY_LIMIT` (default 25 borradores/día), contado en proceso. Pasado el techo, 429 |
| La salida del modelo es **dato**, no instrucción (R26) | ✅ se acepta solo JSON con la forma esperada; cada campo recortado a su largo y cada lista a su cantidad; lo que no está en el esquema se descarta. No se ejecuta, no se concatena en una consulta, no se guarda sin que ella lo vea |
| Inyección por la imagen | ✅ considerada: una foto puede traer texto escrito adentro y el modelo lo lee. El prompt lo dice y el parseo de salida lo contiene. **No hay forma de impedir que el modelo lea el texto de la imagen**: lo que se garantiza es que nada de eso cambie el comportamiento del back |
| Nunca decide sobre alérgenos | ✅ el borrador **no propone etiquetas**. "Sin TACC" lo pone Andrea, es su declaración (§3) y un modelo adivinándolo es un problema de salud |
| Nada se publica solo | ✅ el borrador prellena el formulario; publicar sigue siendo un clic suyo |
| Se avisa que lo escribió una IA | ✅ cartel en el panel, junto al borrador |
| Datos personales al proveedor | ✅ se manda **la foto del producto y nada más**: ni nombre de cliente, ni pedidos, ni mails |

**Lo que falta:** el paquete universal de SDD trae `seguridad.md` con los niveles y `playbooks/ia-en-el-producto.md` (R12), y **ninguno de los dos vino con este proyecto** — en `sdd/` no están. Los controles de arriba se escribieron desde el pedido de R27, no copiados de ese playbook. Si el humano los tiene, conviene traerlos y cruzar la lista.

### N5 · Archivos (activada el 2026-10-17 por F45, ADR-018)

| Control | Estado |
|---|---|
| Solo admin puede subir | ✅ `@admin_required` en `POST /api/uploads` |
| Tope de tamaño | ✅ 4 MB, cortado por `MAX_CONTENT_LENGTH` de Flask **y** revisado en el servicio (el primero devuelve 413, el segundo un mensaje en castellano) |
| Tipo por contenido, no por extensión | ✅ se parsea la estructura: marcadores `FFD8…FFD9` en JPEG, firma + chunks en PNG. El `Content-Type` del navegador y el nombre del archivo **no deciden nada** |
| Metadatos fuera | ✅ el archivo se **reescribe**: se van EXIF (incluido el GPS de la foto del celular), XMP, ICC y comentarios |
| Archivo políglota | ✅ muere en la reescritura: lo que sale es solo lo que el parser entendió |
| Nombre generado por el servidor | ✅ `secrets.token_hex(16)` + extensión del tipo detectado. El nombre que manda el cliente se descarta ⇒ no hay path traversal posible |
| Fuera del árbol de código y del repo | ✅ `instance/uploads/`, con `.gitignore` |
| Nunca se ejecuta lo subido | ✅ lo sirve `GET /uploads/<nombre>` con `Content-Type` fijo, `nosniff` y sin interpretar nada |
| Headers de seguridad | ✅ **entraron con esto** (cierra D3): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Resource-Policy` y CSP mínima, globales en `after_request` |
| Borrado de lo subido | ❌ **no hay**. Reemplazar la foto de un producto deja la anterior en disco. Deuda **D17** |
| Cuota total en disco | ❌ no hay. Un admin distraído puede llenar el disco a 4 MB por vez. Deuda **D18** |
| WEBP / HEIC | ❌ rechazados a propósito (ADR-018). HEIC es el default de iPhone ⇒ va a pasar seguido. Deuda **D16** |

### N6 · Superficie pública

| Control | Estado |
|---|---|
| SQL parametrizado | ✅ todo por el ORM, cero concatenación |
| CORS explícito, no `*` | ✅ `FRONTEND_ORIGINS` por env, lista separada por comas |
| Validar toda entrada en el servidor | ⚠️ parcial: hay `parse_int` y chequeos en los servicios, pero no validación por esquema |
| Rate limit general | ❌ no hay |
| Errores que no cuentan de más | ⚠️ `ExternalServiceError` propaga el body de error de Mercado Pago tal cual al cliente (`payment_service.py:89`) |
| Headers `nosniff` / `X-Frame-Options` / `Referrer-Policy` / CSP | ✅ desde el 2026-10-17, globales en `after_request` (entraron con N5, ADR-018) |
| Paginación con techo | ❌ `GET /api/products` y `/api/orders` devuelven todo. El panel ya no los usa para contar (`/api/metrics/summary` agrega en el servidor, ADR-019). Con la carta de una repostería no duele; con `Order` crece para siempre |

## 3 · Datos de terceros y responsabilidades

- **Etiquetas de alérgenos ("sin TACC", "sin lactosa"):** las carga ella y son su declaración, bajo su responsabilidad. El software las muestra; no las certifica. Conviene que el front lo diga en letra chica junto al filtro.
- **Material de la clienta** (fotos, logo, textos, su historia): va a `material-cliente/` tal como llega, con quién lo mandó y cuándo. No se descarga de otro lado ni se inventa.
- **Arte de Stardew Valley:** no es nuestro. ADR-003 cierra la puerta: la estética se hace con CSS propio, no con assets del juego.

## 4 · Lo que BLOQUEA un `done` (R16)

Nada de esta lista está marcado como crítico hoy, así que no hay bloqueo abierto. Pasan a crítico — y bloquean release — si el proyecto se publica:

1. ~~`JWT_SECRET_KEY` y `ADMIN_PASSWORD` con valor propio en `.env`~~ — resuelto (ADR-015). Al desplegar hay que **cargarlos en el entorno del host**: sin `JWT_SECRET_KEY` las sesiones se cortan en cada reinicio, y sin `ADMIN_EMAIL` no hay panel.
2. Rate limit en login y contacto.
3. ~~Headers de seguridad.~~ — puestos el 2026-10-17 con ADR-018.
4. Firma del webhook, si se prende Mercado Pago.
