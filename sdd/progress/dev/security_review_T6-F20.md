# Security review · T6-F20 (ingredientes desde el panel)

**Rol:** `security-reviewer` (R27, R30, R31) · **Fecha:** 2026-10-18 · **Rama:** `dev` · **Diff:** sin commitear
**Tarjeta:** `sdd/cards/T6-F20-ingredientes.md` · **Superficie declarada:** N1 (panel autenticado, sin plata ni datos de terceros)
**Quien revisa no implementó.** No se tocó código ni tests: este archivo es lo único que se escribió.

## Veredicto

**APPROVED** — con 1 hallazgo de severidad MEDIA que **no bloquea el `done` de esta tarjeta** y **sí debería estar
cerrado antes de un deploy público** (mismo criterio que security.md §4).

Fundamento del alcance: la tarjeta es front y el back **no se modificó** (verificado: `git status --short` no lista
ningún archivo bajo `backend/`). El código nuevo del front no introduce ninguna falla: no hay XSS, la autorización
del back aguanta todo lo que se le tiró, y el token de admin no aparece en ninguna superficie nueva. El hallazgo
MEDIO es código de back **preexistente** (`ingredient_service.create`, de T3), pero esta tarjeta es lo primero que
lo hace alcanzable desde la UI y lo primero que pone su resultado en páginas públicas, así que queda registrado acá
y no en el limbo.

> **Nota de alcance (R27):** la tarjeta y CLAUDE.md apuntan a `sdd/seguridad.md` para los niveles. **Ese archivo no
> existe en el repo** (`ls sdd/` lo confirma); security.md §N4 "Lo que falta" ya lo había anotado. Se revisó contra
> `sdd/security.md`, que es lo que está activo. Los niveles que aplican a esta tarjeta: **N1** (identidad/autorización),
> **N4** (el camino del asistente de IA, que esta tarjeta cambió de "mostrar" a "persistir") y **N6** (lo que termina
> saliendo por la API pública). N2, N3 y N5 no se tocan.

## Resumen de los hallazgos

| # | Severidad | Qué | ¿Bloquea? |
|---|---|---|---|
| 1 | **MEDIA** | `ingredient_service.create/update` no limita el largo de `name` ni de `unit`: entraron **4 MB** y los devuelve el `GET` **público** | No el `done`; sí un deploy |
| 2 | **BAJA** | `name`/`unit` que no son string ⇒ **500 con HTML** en una API JSON (la clase exacta de bug que originó `saneado.py`) | No |
| 3 | **BAJA** | El panel ahora **crea** ingredientes globales que se ven en páginas públicas, pero **no expone borrar ni editar**: una entrada equivocada no tiene arreglo desde la UI | No |
| 4 | **INFO** | `GET /api/ingredients` público y sin tope: **no es fuga** (ver §Pregunta 1), pero es el amplificador del hallazgo 1 | No |

Lo que se probó y **salió limpio** está en §"Controles verificados". Un informe sin esa lista no sirve, así que está completa.

---

## Respuestas a las cuatro preguntas

### 1. `GET /api/ingredients` público y sin tope: ¿fuga o inocuo?

**Inocuo como fuga de información: los mismos nombres ya salían sin auth por `GET /api/products`, que serializa
`product.ingredients` para cualquiera.** La diferencia marginal es la lista global, que incluye ingredientes todavía
no atados a ningún producto (los que ella está cargando mientras arma algo) — eso revela, como mucho, que hay algo en
preparación. No hay datos de personas, ni precios, ni nada de N2/N3 en la tabla. No amerita cerrarlo.

Evidencia:

```
$ curl -s -i http://127.0.0.1:5000/api/ingredients | head -30
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: http://localhost:5173
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Cross-Origin-Resource-Policy: cross-origin
Content-Security-Policy: default-src 'none'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'
Connection: close

[{"id":1,"name":"Azúcar","unit":"100gr"},{"id":2,"name":"Test","unit":null}]
```

`backend/services/serializers.py:22-27` devuelve exactamente `id`, `name`, `unit`. No hay `created_at`, ni conteo de
productos, ni nada que no sea la carta. Los headers de seguridad globales están puestos.

**Lo que sí importa de "sin tope" no es la fuga, es el tamaño**: esta ruta no tiene paginación ni techo (consistente
con la fila "Paginación con techo ❌" de security.md §N6) y es la que sirve el resultado del hallazgo 1 a cada
visitante anónimo. Ahí está el riesgo real, no en la confidencialidad.

### 2. `POST /api/ingredients` admin-only: ¿aguanta? ¿`create` valida el largo?

**La autorización aguanta. El largo NO se valida: entran 4 MB en `Ingredient.name` y se guardan enteros.**

**(a) Autorización — cuatro intentos, los cuatro rechazados** (servidor real en `127.0.0.1:5000`):

```
$ curl -s -w "\n%{http_code}\n" -X POST http://127.0.0.1:5000/api/ingredients \
    -H "Content-Type: application/json" -d '{"name":"sin-token"}'
{"msg":"Missing Authorization Header"}
401

$ curl -s -w "\n%{http_code}\n" -X POST ... -H "Authorization: Bearer basura.basura.basura" ...
{"msg":"Invalid header padding"}
422

# token REAL de un usuario común, recién registrado por /api/auth/register (user_id 4, no admin)
$ curl -s -w "\n%{http_code}\n" -X POST ... -H "Authorization: Bearer <token de usuario común>" \
    -d '{"name":"usuario-comun"}'
{"error":"Admin privileges required"}
403

# el mismo token contra las otras dos rutas de escritura
$ curl -s -w "\n%{http_code}\n" -X PUT http://127.0.0.1:5000/api/ingredients/1 ... -d '{"name":"hackeado"}'
{"error":"Admin privileges required"}
403
$ curl -s -w "\n%{http_code}\n" -X DELETE http://127.0.0.1:5000/api/ingredients/1 ...
{"error":"Admin privileges required"}
403

# firma manoseada (último carácter del token de admin cambiado por X)
{"msg":"Invalid crypto padding"}
422

# alg:none, con sub=1 (el id del admin), firma vacía
{"msg":"The specified alg value is not allowed"}
422
```

`admin_required` (`backend/routes/utils.py`) hace `verify_jwt_in_request()` **y** relee el `User` de la base para
chequear `is_admin`: no confía en un claim del token. Correcto.

**(b) El largo — HALLAZGO 1, reproducido:** ver §Hallazgo 1.

### 3. XSS por el nombre del ingrediente en las páginas públicas

**Se renderiza como texto. No hay `dangerouslySetInnerHTML` en ninguna parte del front, y la prueba en navegador
real confirma que el payload sale escapado.**

```
$ grep -rn "dangerouslySetInnerHTML\|innerHTML" front/Andres_Bakery/src/
NO dangerouslySetInnerHTML
```

Prueba viva, de punta a punta (back real + front real + Chromium), con limpieza posterior:

1. Con token de admin: `POST /api/ingredients` con
   `name = <img src=x onerror="window.__XSS_T6F20=1;document.title=…">PWN` ⇒ `201 {"id":3}`.
2. `PUT /api/products/5 {"ingredient_ids":[2,3]}` ⇒ el ingrediente hostil queda en un producto **público**;
   `GET /api/products/5` lo devuelve literal, sin escapar (correcto: el back no es el que escapa).
3. Navegador en `http://localhost:5173/#/producto/brownies` (`pages/ProductPage.tsx`), evaluado en la página:

```json
{
  "xss_flag_window": null,
  "document_title": "Andres Bakery | Dulces artesanales & recetas",
  "img_tags_inyectados": 0,
  "nodo_textContent": "<img src=x onerror=\"window.__XSS_T6F20=1;document.title=(String.fromCharCode(88,83,83))\">PWN",
  "nodo_innerHTML": "&lt;img src=x onerror=\"window.__XSS_T6F20=1;document.title=(String.fromCharCode(88,83,83))\"&gt;PWN",
  "nodo_childElementCount": 0
}
```

`innerHTML` muestra `&lt;img …&gt;`: React escapó el texto, no se creó ningún elemento (`childElementCount: 0`),
el `onerror` no corrió (`window.__XSS_T6F20` sigue `null`, el título intacto) y la consola no registró errores.
`components/ProductCard.tsx:156-160` usa exactamente la misma forma (`{ingrediente.name}` como hijo JSX), igual que
`SelectorDeIngredientes.tsx` en el panel; no hay un sink distinto en ese camino. El `unit`, que también se muestra
en la ficha, sale por la misma vía.

4. **Limpieza:** `PUT /api/products/5 {"ingredient_ids":[2]}` + `DELETE /api/ingredients/3`. Estado final verificado:
   `[{"id":1,"name":"Azúcar",…},{"id":2,"name":"Test",…}]` y `producto 5 ingredients: [{'id': 2, 'name': 'Test'}]`.
   La base de desarrollo quedó como estaba.

### 4. ¿Se filtra el token de admin en algún lado nuevo?

**No.** Lo verificado:

- `ingredientsApi.create` manda el token en el header `Authorization: Bearer …` (`lib/api.ts:104`), nunca en la URL
  ni en el body. `ingredientsApi.list` **no manda token** (la ruta es pública), así que tampoco lo expone de más.
- `grep -rn "console\.(log|warn|error|debug)" front/Andres_Bakery/src/` ⇒ **cero resultados**. Nada se loguea.
- El error que muestra el panel sale de `getErrorMessage` (`lib/format.ts:9-14`), que devuelve `reason.message`, y ese
  mensaje es el body del servidor (`ApiError`). No arrastra headers ni token.
- `grep` de `searchParams` / `?token=` ⇒ nada; el token no entra en ninguna URL, ni en el `HashRouter`.
- Lo preexistente no empeora: el token sigue viviendo en `localStorage` (gap ya anotado en security.md §N1 ❌) y
  `avisarSesionVencida(options.token)` sigue despachando un `CustomEvent` con el token dentro de la misma página.
  `crearIngrediente` pasa por ese mismo camino, pero no agrega una superficie nueva.
- Consola del navegador durante la prueba del punto 3: 3 mensajes, **0 errores y 0 warnings**, ninguno con el token.

---

## Hallazgos

### Hallazgo 1 — `Ingredient.name` y `unit` sin tope de largo ⇒ 4 MB en una fila que devuelve el endpoint público · **MEDIA**

`backend/services/ingredient_service.py:15-25` (y `update`, líneas 27-43) hace `(data.get("name") or "").strip()` y
nada más: no hay tope. **SQLite no hace cumplir `String(120)`** del modelo (`backend/models.py:121`), que es
exactamente el hallazgo que ya tuvo este repo con los textos del pedido y que originó `backend/services/saneado.py`
(su docstring, regla 2, lo dice con todas las letras).

**Reproducción** (sonda en `scratchpad`, con una SQLite temporal como hace `backend/tests/support.py`, vía el
`test_client` sobre la **ruta real** con `@admin_required`; no se usó la base de desarrollo):

```
== 1. POST 4 MB en name (admin, via HTTP, ruta real) ==
status: 201 | body: {'id': 1}
len(Ingredient.name) guardado en SQLite: 4000000

== 2. GET /api/ingredients despues (lo publico devuelve esos 4 MB) ==
status: 200 | Content-Length: 4000033

== 3. unit sin tope ni tipo ==
name ok, unit 100k -> status: 201 | body: {'id': 2}
len(unit) guardado: 100000
```

**Por qué es MEDIA y no BAJA, estando detrás de `admin_required`:** la consecuencia no la paga el admin, la pagan los
anónimos. Una sola escritura de 4 MB hace que **cada visitante** del sitio se descargue esos megabytes en
`GET /api/ingredients` (sin paginación ni techo) y en `GET /api/products` si el ingrediente queda atado a un producto;
y el panel de Andrea se los descarga en cada carga. No hay rate limit en `POST /api/ingredients`, así que con un token
de admin robado —y el proyecto sabe que el token vive en `localStorage` (N1 ❌)— se puede repetir N veces. Tampoco hay
cuota, igual que D18 para los archivos.

**Por qué es MEDIA y no ALTA:** hace falta credencial de admin. No hay escalada de privilegios, ni lectura de datos
ajenos, ni ejecución.

**Arreglo, que ya está escrito en el repo:** usar `saneado.texto(data.get("name"), "name", tope=120, obligatorio=True)`
y `tope=40` para `unit` en `create` y en `update`. Son dos líneas por método y resuelven también el hallazgo 2. El
test rojo que lo demuestra no existe hoy: **no hay ningún `backend/tests/test_ingredient_service.py`** (`Ingredient`
sólo aparece en `support.py`, `test_product_service.py` y `test_ai_service.py`). Para esto sí hay que tocar el back,
que la tarjeta declaró fuera de zona ⇒ **tarjeta aparte**, no un parche dentro de esta.

### Hallazgo 2 — `name`/`unit` que no son string ⇒ 500 con HTML en una API JSON · **BAJA**

Mismo origen que el hallazgo 1: `create` asume que `name` es string y llama `.strip()` sin chequear el tipo.
`json_endpoint` sólo atrapa `ServiceError`, así que la excepción sale como 500.

```
# contra la sonda (test_client, ruta real, token de admin)
{'name': {'a': 1}}                 -> EXCEPCION AttributeError: 'dict' object has no attribute 'strip'
{'name': ['x']}                    -> EXCEPCION AttributeError: 'list' object has no attribute 'strip'
{'name': 12345}                    -> EXCEPCION AttributeError: 'int' object has no attribute 'strip'
{'name':'unit-dict','unit':{'a':1}} -> EXCEPCION ProgrammingError: (sqlite3.ProgrammingError)
                                       Error binding parameter 2: type 'dict' is not supported

# contra el servidor real (debug apagado), con token de admin
$ curl -s -X POST http://127.0.0.1:5000/api/ingredients -H "Authorization: Bearer <admin>" \
    -H "Content-Type: application/json" -d '{"name":{"a":1}}'
<!doctype html>
<html lang=en>
<title>500 Internal Server Error</title>
<h1>Internal Server Error</h1>
<p>The server encountered an internal error and was unable to complete your request. …</p>
[HTTP 500]
```

**No hay fuga**: `debug=True` está apagado (security.md §N6 ✅) y la respuesta no trae traceback ni rutas. Lo que
queda es HTML servido a un cliente que espera JSON, que es **la regla 1 del docstring de `saneado.py`**, escrita
después de la review de T7 por este mismo motivo. El front nunca manda un `name` que no sea string, así que hace
falta un request a mano de alguien ya autenticado como admin ⇒ BAJA. Se cierra con el mismo arreglo del hallazgo 1.

### Hallazgo 3 — el panel crea ingredientes públicos pero no expone borrarlos ni editarlos · **BAJA** (integridad / operación)

`ingredientsApi` (`front/Andres_Bakery/src/lib/api.ts:249-259`) tiene **`list` y `create`, nada más**. El back tiene
`PUT` y `DELETE /api/ingredients/<id>` desde T3 y siguen sin usarse.

Consecuencia concreta, y es nueva de esta tarjeta: el ingrediente es **global** (decisión explícita de la tarjeta) y
se muestra en el dorso de la tarjeta (`ProductCard.tsx:156-160`) y en la ficha (`ProductPage.tsx:127-138`), que son
**públicas**. Un nombre mal escrito, de prueba, o con texto que no corresponde queda visible para cualquiera y **no
hay forma de sacarlo desde el panel**: hay que ir a la API a mano. Desmarcarlo de un producto no borra el ingrediente,
sólo la relación.

Esto se cruza con el camino de la IA, que esta tarjeta cambió de naturaleza: antes los sugeridos por el modelo
**sólo se mostraban** (el comentario viejo decía "no se guardan solos"); ahora un clic en el botón `+` de
`FotoDelProducto.tsx` los **persiste** en una tabla global que sale en páginas públicas. Una foto con texto escrito
adentro puede influir lo que el modelo propone (security.md §N4 ya lo asume y dice que no se puede impedir).

**Lo que contiene el riesgo, y por eso es BAJA y no más:**
- `ai_service.py:202` recorta cada ingrediente a `LARGO_CORTO = 120` y la lista a `MAX_INGREDIENTES = 20`, así que por
  la vía de la IA **no** se puede llegar a los 4 MB del hallazgo 1.
- Se renderiza como texto (probado en §Pregunta 3): no es XSS, es contenido.
- Requiere un clic consciente de Andrea sobre un texto que tiene a la vista, que es justo lo que la tarjeta decidió
  (ADR-020: nada se publica solo).

**Sugerencia, no bloqueo:** exponer el `DELETE` que ya existe en una próxima tarjeta, o al menos dejar la deuda
anotada. Lo que hoy se puede crear con un clic, no se puede deshacer con ninguno.

### Hallazgo 4 — `GET /api/ingredients` sin rate limit ni paginación · **INFO**

Ya respondido en §Pregunta 1: como fuga de información es inocuo y no hay que cerrarlo. Se deja anotado porque es el
que convierte el hallazgo 1 en un problema que tocan los visitantes anónimos, y porque es coherente con lo que
security.md §N6 ya tiene marcado (`Paginación con techo ❌`, `Rate limit general ⚠️ parcial`). No requiere acción
propia: se resuelve el hallazgo 1 y esto deja de importar.

---

## Controles verificados que salieron limpios

Lo que se probó y **no** encontró nada, para que quede constancia de la cobertura:

| Control | Cómo | Resultado |
|---|---|---|
| El back no se modificó | `git status --short` | ✅ ningún archivo bajo `backend/` |
| `POST` sin token | `curl` sin header | ✅ 401 |
| `POST` con token sintácticamente inválido | `Bearer basura.basura.basura` | ✅ 422 |
| `POST` con token de **usuario común real** | registro + login + `curl` | ✅ 403 `Admin privileges required` |
| `PUT` y `DELETE` con token de usuario común | `curl` | ✅ 403 las dos |
| Firma manoseada (último char cambiado) | `curl` | ✅ 422 `Invalid crypto padding` |
| `alg:none` con `sub` del admin | JWT armado a mano | ✅ 422 `The specified alg value is not allowed` |
| `admin_required` no confía en un claim | lectura de `routes/utils.py` | ✅ relee `User.is_admin` de la base |
| XSS en la ficha pública | payload real + Chromium + `evaluate` | ✅ escapado, `onerror` no corre |
| `dangerouslySetInnerHTML` / `innerHTML` en el front | `grep -rn` sobre `src/` | ✅ cero resultados |
| Token en URL, log o mensaje de error | `grep` de `console.*`, `searchParams`, `?token=`; lectura de `getErrorMessage` y `apiRequest` | ✅ nada nuevo |
| Consola del navegador en la prueba | `browser_console_messages` | ✅ 0 errores, 0 warnings |
| Headers de seguridad en la ruta nueva | `curl -i` | ✅ `nosniff`, `X-Frame-Options`, `Referrer-Policy`, CORP, CSP |
| CORS no es `*` | `curl -i` | ✅ `Access-Control-Allow-Origin: http://localhost:5173` |
| SQL parametrizado | lectura del servicio | ✅ todo por el ORM, cero concatenación |
| El serializer no devuelve de más | `serializers.py:22-27` | ✅ sólo `id`, `name`, `unit` |
| Debugger de Werkzeug apagado | 500 forzado contra el server real | ✅ HTML genérico, sin traceback |
| La IA no puede inyectar texto sin límite | `ai_service.py:50-52, 202` | ✅ 120 chars × 20 ítems |
| Colisión de nombres por normalizar (¿"Piña" = "Pina"?) | bytes de `lib/ingredientes.ts` | ✅ el regex es `/ñ/gi` (NFD) y recompone a `ñ` **antes** de barrer diacríticos: no colisionan |
| Techo de gasto de IA, uploads, pagos, pedido de invitado | — | **no revisados a propósito**: fuera del alcance N1 de esta tarjeta |

## Efectos colaterales de esta revisión (todos revertidos)

- Se registró el usuario `revisor.sec.t6f20@example.com` en la base de desarrollo para probar el 403 con un token
  real de usuario común. **Borrado** de `instance/bakery.db` al terminar; verificado: login posterior ⇒ `401`.
- Se creó y se ató a un producto el ingrediente con payload XSS. **Desatado y borrado**; estado final verificado.
- Las sondas de largo corrieron contra una SQLite **temporal**, no contra `instance/bakery.db`.
- `git status --short` al cerrar: idéntico al del inicio. No se tocó ningún archivo del proyecto salvo este informe.
