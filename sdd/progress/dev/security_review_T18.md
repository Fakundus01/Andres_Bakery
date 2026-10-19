# Security review + pentest · T18-F59 (foto de referencia) y T4-F19a (la variante se cobra)

**Roles:** `security-reviewer` + `pentester` (R27, R30, R31) · **Fecha:** 2026-10-19 · **Rama:** `dev` · **Diff:** sin commitear sobre `ddaf6f0`
**Tarjetas:** `sdd/cards/T18-F59-foto-de-referencia.md`, `sdd/cards/T4-F19a-la-variante-se-cobra.md`
**Superficie declarada:** **N3** (un renglón cambia de precio con un id del cliente) y **N5 de grado alto** (escritura pública de archivos). También N6.
**Quien revisa no implementó nada de esto.** No se tocó código, ni tests, ni la base de desarrollo. Los scripts de ataque viven fuera del repo (`%TEMP%\claude\...\scratchpad\atk\`) y este archivo es lo único que se escribió.

## Veredicto

**CHANGES_REQUESTED** — y conviene leer *por qué*, porque **no hay ninguna CRÍTICA ni ninguna ALTA**, y **los dos controles que la tanda puso en el centro aguantaron todo**:

- **La plata (N3) no se mueve.** 22 formas distintas de `variant_id` y ninguna compró una torta de 12 al precio de 8. El total jamás quedó por debajo de la suma de los renglones, y el envío sigue saliendo de `DELIVERY_FEE`.
- **La URL de la foto (ADR-031/032) no se perfora.** 33 payloads —externa, `data:`, `//evil.com`, `..`, barra invertida, hex en mayúsculas, otra extensión, Cloudinary de otro cloud, hex sin fila, fila sin archivo, la foto del panel— y **entraron solo las tres que emitimos nosotros**.

Lo que pide cambios es otra cosa: **tres documentos afirman controles que el código no tiene**, y uno de esos tres es de esta tanda (ADR-029 parte 3, que no está implementada y rompe el carrito de quien está comprando cada vez que Andrea guarda un producto). R27 pide que `security.md` diga la verdad medida; hoy dice de más en tres renglones.

| Severidad | Cantidad |
|---|---|
| **CRÍTICA** | 0 |
| **ALTA** | 0 |
| **MEDIA** | 5 |
| **BAJA** | 4 |
| **INFO** | 5 |

### Resumen

| # | Sev. | Qué | ¿Bloquea? |
|---|---|---|---|
| 1 | **MEDIA** | **ADR-029 parte 3 no está implementada**: `_build_variants` sigue reemplazando. Cada guardado del panel cambia los ids ⇒ el carrito que ya tenía un tamaño recibe **400 en el checkout**. Y si la tabla de variantes queda vacía, los ids se reusan y un carrito que decía **$14.000 se convierte en un pedido de $20.000** | **Sí** (es de esta tanda y la ADR lo declara hecho) |
| 2 | **MEDIA** | La cuota de disco (D18) es **check-then-write sin candado**: con 6 requests concurrentes entraron **3.678 bytes contra una cuota de 2.000**. Mismo patrón que el `check-then-insert` que se corrigió en T6-F20 | No el `done`; sí antes del deploy |
| 3 | **MEDIA** | **Una cuota sola para las dos puertas**: el anónimo la llena y **Andrea no puede subir la foto de un producto** (507), ni otro cliente la suya. La ruta pública hace DoS sobre el panel | No el `done`; sí antes del deploy |
| 4 | **MEDIA** | Un anónimo puede guardar **bytes arbitrarios** (hasta 2 MB) dentro de un `IDAT` con CRC válido y el server los sirve desde `/uploads/`. Si los ata a un pedido, **no se borran nunca**. `security.md` §2-N5 todavía dice "subir es admin-only" como mitigación | No el `done`; sí el renglón de `security.md` |
| 5 | **MEDIA** | `POST /api/orders/whatsapp` con body `[1,2,3]`, `"x"`, `5` o `true` ⇒ **500 con HTML sin auth**. Es la clase exacta que `saneado.py` existe para cerrar, y `security.md` §N6 la da por cerrada. **Preexistente** (está en `ddaf6f0`), pero afecta a `/api/contact` y `/api/metrics/view` también | No el `done`; sí el renglón de `security.md` |
| 6 | **BAJA** | Si el `commit` falla después de escribir, queda **archivo sin fila**: ni lo cuenta la cuota ni lo levanta el barrido | No |
| 7 | **BAJA** | El tope de Flask (4,5 MB global) y el de la ruta pública (2 MB) no coinciden: un anónimo mete 4,5 MB en memoria antes del rechazo, y el 413 le dice **"más de 4 MB"** en una ruta cuyo tope son 2 | No |
| 8 | **BAJA** | Una fila cuyo archivo ya no está **sigue ocupando cuota para siempre** y el barrido no la levanta si está usada | No |
| 9 | **BAJA** | `GET /api/option-groups` (público) devuelve **todos** los grupos, incluidos los que ella creó y no asignó a ningún producto | No |
| 10 | **BAJA** | `front/src/lib/imagenes.ts::urlDeImagen` devuelve cualquier esquema tal cual y el valor termina en un `href`. Hoy lo salva solo la validación del back: un control, sin red | No |
| 11 | **INFO** | `es_referencia` no exige `provisional`: una foto ya usada se puede volver a referenciar (hace falta conocer los 32 hex) | No |
| 12 | **INFO** | Rotar IP de origen sigue dando presupuesto nuevo (medido). Ya está dicho en `rate_limit.py` y en `security.md` §1b | No |
| 13 | **INFO** | El 429 de la foto dice "Estás mandando muchos **pedidos** seguidos" | No |
| 14 | **INFO** | Las subidas rechazadas **sí** cuentan para el tope por IP (correcto), con un costo: cuatro intentos con HEIC (el default del iPhone, D16) dejan a quien compra un minuto afuera | No |
| 15 | **INFO** | Cada pedido personalizado emite dos `SAWarning` de autoflush desde `renglon_del_pedido.py:146`. **Los datos se graban bien** (verificado), pero es ruido en los logs que dispara un anónimo | No |

---

## 1 · MEDIA — ADR-029 parte 3 no está implementada: los ids de variante cambian en cada guardado

**Dónde:** `backend/services/product_service.py:115-116` y `:130-148`.

ADR-029 dice, como decisión tomada:

> **3. Los ids de las variantes dejan de cambiar en cada guardado.** `_build_variants` pasa a aceptar un `id` opcional y actualizar en lugar de reemplazar. Si no, cada edición del panel invalida el `variant_id` que alguien tiene en su carrito de `localStorage`, y el 400 le cae en el checkout.

El código no hace eso. `_build_variants` no mira ningún `id` y arma `ProductVariant` nuevos; `product.variants = [...]` con `cascade="all, delete-orphan"` (`backend/models/catalogo.py:84`) borra las filas viejas. El `git diff` contra `ddaf6f0` de `product_service.py` solo agrega `option_group_ids`: la parte 3 de la ADR no se escribió.

**El ataque** (no hace falta ser atacante: alcanza con que Andrea guarde):

```
ids iniciales: 8 porciones=1 ($14.000) | 12 porciones=2 ($20.000)

== 1. el cliente pone '8 porciones' en el carrito (variant_id en localStorage) ==
   carrito: product_id=5 variant_id=1 -> dice $14.000

== 2. Andrea guarda el producto desde el panel, SIN cambiar nada de las variantes ==
   PUT /api/products -> 200
   ids ahora: [(3, '8 porciones', '14000.00'), (4, '12 porciones', '20000.00')]

== 3. el carrito viejo manda su variant_id ==
   -> 400 {"error": "Ese tamaño no es de «Torta de chocolate»."}
```

Y el caso en el que además **cambia la plata**, cuando la tabla de variantes queda vacía y SQLite reusa los rowid:

```
carrito del cliente: 8 porciones = 1 ($14.000); 12 porciones = 2
Andrea saca TODAS las variantes (la tabla queda vacia): 200
  filas de variante: 0
Andrea las vuelve a cargar, al reves: 200
  ids ahora: [(1, '12 porciones', '20000.00'), (2, '8 porciones', '14000.00')]
  el carrito viejo manda variant_id=1 (su pantalla decia 8 porciones / $14.000):
  -> 201 {"message": "¡Hola Andrea! Te hago un pedido desde la web.\n\nPedido #1\n- 1 x Torta (12 porciones): $20.000\nTotal: $20.000\n...", "order_id": 1, "total": 20000.0}
```

**Lo que es justo aclarar:** mientras la tabla **no** quede vacía, los rowid de SQLite son monótonos (medido: `1,2 → 3,4 → 5,6 → 7,8`, porque el INSERT de los nuevos ocurre antes del DELETE de los viejos), así que el `variant_id` viejo apunta a nada y el guard de `_variante` lo rechaza con 400. **No hay un camino para pagar menos a voluntad**: esto no es explotable por quien compra, necesita una secuencia de acciones del panel. Por eso es MEDIA y no ALTA.

**Qué le pasa a quien compra:** eligió "8 porciones", vio $14.000, llenó el formulario, apretó "Pedir por WhatsApp" y le salió *«Ese tamaño no es de "Torta de chocolate"»*. No tiene idea de qué hacer con eso: el carrito se ve bien. Es el abandono exacto que ADR-029 §3 dice estar previniendo. En el caso de los ids reusados, le llega a Andrea un pedido de 12 porciones a $20.000 de alguien que aceptó $14.000.

**Qué pediría:** implementar la parte 3 (aceptar `id` opcional en cada variante y actualizar la fila existente, descartando el `id` que no sea de ese producto, igual que `_opcion_del_grupo`), **o** corregir ADR-029 para que no declare hecho lo que no está y aceptar el 400 con un mensaje que le diga a quien compra "los tamaños cambiaron, elegilo de nuevo" y le refresque el renglón. Lo que no puede quedar es la ADR afirmándolo.

---

## 2 · MEDIA — la cuota de disco se puede pasar con requests concurrentes

**Dónde:** `backend/services/almacen_de_imagenes.py:218-225` (`_exigir_espacio`) y `:53-72` (`guardar`).

`_exigir_espacio` hace `SELECT sum(bytes)` y compara; después `guardar` escribe el archivo y hace el `INSERT`. Entre la lectura y el `commit` no hay candado ni transacción que sirva de barrera, así que N requests concurrentes leen el mismo total y las N escriben.

**El ataque** (6 requests HTTP reales contra un Werkzeug `threaded=True`, cuota de 2.000 bytes, tope por IP apagado para medir solo la cuota):

```
== B. la cuota con 6 requests HTTP concurrentes ==
   estados: [201, 201, 201, 201, 201, 201]
   cuota=2000 usado=3678 filas=6 archivos=6
```

Con 8 hilos la medición fue peor: `usado=4904` contra la misma cuota de 2.000 (2,45×). El exceso por ráfaga está acotado por `concurrencia × tamaño del archivo`, así que con el tope real (2 MB) y los 4/min por IP, cada IP puede empujar **hasta 8 MB por encima** de la cuota por minuto, y con varias IPs a la vez el exceso escala con la concurrencia del server, no con la cuota.

**Por qué importa más de lo que parece:** `security.md` §1b cierra diciendo *"contra eso no alcanza un contador, y hoy **el freno real es la cuota**"*. El freno real es, entonces, blando. Y es el mismo patrón que la review de T6-F20 rompió con 8 hilos y una barrera (ADR-030 §4: *"la primera versión era un check-then-insert sin nada que lo respaldara"*): acá volvió, en el control que cierra D18.

**Qué le pasa a Andrea:** el disco (o el plan free de Cloudinary) pasa el techo que ella configuró, y el 507 que debía protegerla llega tarde.

**Qué pediría:** que la cuota la sostenga algo y no una mirada. Lo más barato sin dependencia nueva: una transacción que haga el `INSERT` de `stored_image` y después verifique el total, con `rollback` + borrado del archivo si se pasó (y el archivo escrito recién **después** de que la fila esté segura); o un `threading.Lock` en `AlmacenDeImagenes` que, como el `_candado` de `Limitador`, no cuesta nada con un proceso y deja escrito por qué existe. Vale decir en el código que con varios workers un lock de proceso no alcanza, igual que lo dice `rate_limit.py`.

---

## 3 · MEDIA — una cuota sola para las dos puertas: el anónimo le cierra el panel a Andrea

**Dónde:** `backend/services/almacen_de_imagenes.py:188-195` (`espacio_usado` suma **todas** las filas) + `:218-225`, llamado igual desde `guardar_referencia` y desde `guardar` (`upload_service.py:195-215`).

`espacio_usado()` suma `StoredImage.bytes` sin filtrar por `kind`, y `UPLOAD_QUOTA_BYTES` es una sola. Las fotos que sube un anónimo consumen el presupuesto de las fotos de producto de Andrea.

**El ataque** (cuota recortada a 5.701.900 bytes para medirlo en 3 requests; con la cuota real de 500 MB son 250 subidas de 2 MB, o sea ~17 horas desde una IP a 15/hora, o minutos rotando IPs —ver INFO 12—, y lo provisorio no se barre hasta las 24 h):

```
anonimo #1 (1900631 b) -> 201
anonimo #2 (1900631 b) -> 201
anonimo #3 (1900631 b) -> 201
usado = 5701839 / cuota 5701900
ANDREA sube la foto de un producto (144 b, PNG 60x60) -> 507 {"error": "No queda lugar para más fotos por ahora. Escribinos por WhatsApp y lo resolvemos."}
otro CLIENTE legitimo sube su foto de referencia -> 507 {"error": "No queda lugar para más fotos por ahora. Escribinos por WhatsApp y lo resolvemos."}
```

**Qué le pasa a Andrea:** está cargando la carta un domingo a la noche, le aparece *"No queda lugar para más fotos por ahora. **Escribinos por WhatsApp** y lo resolvemos"* —un mensaje escrito para un cliente, que a ella no le dice nada— y no puede publicar el producto. Y a quien quiere encargar una torta con foto le pasa lo mismo. El tope por IP y el TTL acotan cuánto dura, no que pase.

**Qué pediría:** que la ruta pública tenga su propio techo (un `REFERENCE_UPLOAD_QUOTA_BYTES` menor que el total, o un porcentaje reservado), de modo que lo que sube un anónimo no pueda consumir el último byte que ella necesita; y que el 507 de la ruta de admin tenga su propio texto, el que le sirve a ella ("se llenó la cuota de fotos: subí `UPLOAD_QUOTA_BYTES` o borrá lo que no uses").

---

## 4 · MEDIA — un anónimo puede guardar bytes arbitrarios y, si los ata a un pedido, quedan para siempre

**Dónde:** `backend/services/image_file.py:139-174` (`_PNG_CONSERVAR` incluye `IDAT` y se copia tal cual), `backend/routes/uploads.py:275-289`, `backend/services/almacen_de_imagenes.py:157-186` (el barrido no toca lo usado).

El validador conserva la data comprimida sin mirarla: un `IDAT` con CRC correcto pasa aunque adentro no haya pixeles. Eso ya estaba dicho en `security.md` §2-N5 ("un archivo con estructura correcta y relleno adentro pasa"), pero el renglón cierra con *"No es ejecutable (tipo fijo + `nosniff`) y **subir es admin-only**, pero conviene no leer la promesa de más"*. **La segunda mitad dejó de ser cierta hoy.**

**El ataque** (PNG 1×1 con `IHDR` + `IDAT` de carga elegida + `IEND`, por la ruta pública, sin ninguna credencial):

```
subida -> 201 {'bytes': 351, 'content_type': 'image/png', 'filename': 'fa8290aff8ddcd5de91224dafe2f710c.png',
               'height': 1, 'url': '/uploads/fa8290aff8ddcd5de91224dafe2f710c.png', 'width': 1}
GET /uploads/fa8290aff8ddcd5de91224dafe2f710c.png -> 200 351 bytes
    Content-Type: image/png
    X-Content-Type-Options: nosniff
    Content-Disposition: inline
    Content-Security-Policy: default-src 'none'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'
    X-Frame-Options: DENY
    Cross-Origin-Resource-Policy: cross-origin
    Cache-Control: public, max-age=3600
   contiene la carga del atacante: True
```

Lo mismo con un JPEG: un `<script>alert(1)</script>` metido en la data de entropía antes del EOI entra y se conserva (201, 638 bytes). **No es XSS**: el tipo es fijo, está `nosniff`, la CSP del back es `default-src 'none'` y va `inline` — eso aguantó. El problema es otro: hasta 2 MB de contenido elegido por un anónimo, servidos desde el dominio de Andrea, y **si después manda un pedido que la referencia, `marcar_usada` la saca de lo provisorio y el barrido no se la lleva nunca** (verificado: la usada sobrevive al barrido, que es justo H7). Con 10 pedidos/hora por IP son ~20 MB/hora de retención permanente.

**Qué le pasa a Andrea:** su servidor termina alojando lo que alguien quiera —hasta que la cuota diga basta, y ahí entra el hallazgo 3— con su dominio en la URL. Si eso llega a un reporte de abuso, el reporte es contra su hosting.

**Qué pediría:** dos cosas chicas. (a) Corregir el renglón de `security.md` §2-N5: la mitigación "subir es admin-only" ya no aplica a la mitad de la superficie. (b) Que el camino que vuelve una foto "del pedido" no sea para siempre y gratis: hoy `es_referencia` ni exige que la foto esté provisoria (ver INFO 11), así que no hay nada que acote cuántas fotos puede fijar una IP. Una relación 1-a-1 (la foto se marca usada **una** vez y con el id del pedido) la acotaría al mismo tope que los pedidos.

---

## 5 · MEDIA — `500` con HTML sin auth en la ruta pública de pedido (y en `/api/contact` y `/api/metrics/view`)

**Dónde:** `backend/services/order_service.py:54` (`customer = saneado.diccionario(data.get("customer"), "customer")`) y `:37` (`data.get("channel")`); el body llega sin validar desde `backend/routes/orders.py:43` y `:27` (`request.get_json(silent=True) or {}` devuelve la lista/el string tal cual, y `or {}` solo salva al `null`). Mismo patrón en `backend/services/metrics_service.py:77` y en el servicio de contacto.

`saneado.diccionario` se llama **sobre `data.get(...)`**, no sobre `data`: el chequeo del body entero recién ocurre en `_armar_pedido` (`order_service.py:108`), que nunca se alcanza.

**El ataque** (HTTP real, sin ningún token):

```
POST /api/orders/whatsapp     body=[1,2,3]        -> 500 text/html; charset=utf-8 '<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title'
POST /api/orders/whatsapp     body="x"            -> 500 text/html; charset=utf-8 '<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title'
POST /api/orders/whatsapp     body=5              -> 500 text/html; charset=utf-8 '<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title'
POST /api/orders/whatsapp     body=true           -> 500 text/html; charset=utf-8 '<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title'
POST /api/orders/whatsapp     body=null           -> 400 application/json '{"error":"Necesitamos tu nombre para el pedido."}'
POST /api/orders              body=[1,2,3]        -> 500 text/html; charset=utf-8 '<!doctype html>...'
POST /api/metrics/view        -> 500 text/html; charset=utf-8 '<!doctype html>...'
POST /api/contact             -> 500 text/html; charset=utf-8 '<!doctype html>...'
```

Traza exacta, con `debug=False` (no se filtra nada al cliente, solo el HTML genérico):

```
  File "backend\routes\orders.py", line 42, in create_whatsapp_order
    order_service.create_whatsapp_order(
  File "backend\services\order_service.py", line 54, in create_whatsapp_order
    customer = saneado.diccionario(data.get("customer"), "customer")
                                   ^^^^^^^^
AttributeError: 'list' object has no attribute 'get'
```

**Es preexistente:** `git show ddaf6f0:backend/services/order_service.py` tiene la misma línea, así que **no lo introdujo esta tanda**. Queda acá porque `security.md` §N6 lo lista como cerrado —*"✅ Tipos y largos de lo que llega: lo que no es del tipo esperado es un 400 explicado... Antes: once vectores de 500 con HTML sin auth"*— y eso, para el body de primer nivel, no es verdad. Es el renglón que esta review tiene que corregir.

**Qué le pasa a quien compra:** poco, porque el front manda un objeto. Lo que importa es que hay un camino anónimo a un 500, y que `app_factory._register_http_handlers` no tiene `errorhandler(500)`, así que cualquier excepción futura en estas rutas sale como HTML en una API JSON.

**Qué pediría:** `data = saneado.diccionario(data, "pedido")` como **primera** línea de `create_whatsapp_order` y de `create_order` (y lo mismo en `registrar_visita` y en contacto), más un `@app.errorhandler(500)` que devuelva JSON, que es una red y no una excusa para no arreglar el caso.

---

## 6 · BAJA — si el `commit` falla después de escribir, queda archivo sin fila

**Dónde:** `backend/services/almacen_de_imagenes.py:53-72`: se escribe el archivo (`_escribir_en_disco`, `:227-230`) y **después** se hace `db.session.add(...)` + `commit()`.

**El ataque** (se simuló el `commit` fallando, que en SQLite es el `database is locked` de cualquier concurrencia):

```
excepcion: RuntimeError base bloqueada (simulacion de SQLite busy)
archivos en disco: ['ef521eac135751a0be22ac7348d326a8.jpg']
filas en el registro: 0
espacio contado por la cuota: None
```

El archivo queda invisible para los dos controles que la tarjeta promete: la cuota no lo cuenta (D18) y el barrido no lo conoce (D17). Y la request sale como 500.

**Qué pediría:** escribir el archivo **después** de que la fila esté commiteada, o borrarlo en un `except` antes de propagar. Con Cloudinary pasa lo mismo y es peor, porque el huérfano queda en la cuenta de ella.

---

## 7 · BAJA — el tope de Flask y el de la ruta pública no dicen lo mismo

**Dónde:** `backend/config.py:87` (`MAX_CONTENT_LENGTH = UPLOAD_MAX_BYTES + 512 KB` = 4,5 MB, **global**), `backend/services/upload_service.py:220-225` (el tope real de la pública es 2 MB), `backend/app_factory.py:103-111` (el 413 informa `MAX_CONTENT_LENGTH`).

```
MAX_CONTENT_LENGTH = 4718592 | tope publico real = 2097152
1.5 MB (entra)                            (1500631 b) -> (201, ...)
3 MB (> 2MB publico, < 4.5MB Flask)       (3000631 b) -> (400, '{"error": "La imagen pesa mas de 2 MB. Sacale peso o elegi otra."}')
5 MB (> Flask)                            (5000631 b) -> (413, '{"error": "El archivo pesa mas de 4 MB."}')
```

El rechazo funciona y es JSON (bien), pero: (a) un anónimo puede hacer que el server reciba y bufferee 4,5 MB por request antes del rechazo, 4 veces por minuto por IP; (b) el 413 le dice "más de 4 MB" a alguien cuyo tope son 2 MB. `security.md` §N5b dice *"Tamaño menor que el del panel ✅"* — en el servicio sí, en el transporte es el del panel.

**Qué pediría:** nada urgente. Si se toca, el 413 puede mirar la ruta (o el mensaje puede no prometer un número), y vale anotar en `security.md` que el tope de transporte es el general.

---

## 8 · BAJA — una fila cuyo archivo ya no está ocupa cuota para siempre

```
== 5b. fila con el archivo borrado a mano (fila sin archivo) ==
   pedido reusando la foto cuyo archivo ya no esta -> (400, '{"error": "Esa foto no está en el servidor. Volvé a subirla y mandá el pedido de nuevo."}')
   GET de esa foto -> 404
   la fila sigue en el registro y sigue contando para la cuota: 1 1300
```

El rechazo es correcto (la tercera pregunta de `_fila_si_es_nuestra` hace su trabajo). Lo que queda es que `espacio_usado()` cuenta 1.300 bytes que no existen, y si la fila está marcada usada el barrido no la levanta (`almacen_de_imagenes.py:168-177`). Es el espejo del punto que §N5b ya anota sobre borrar un pedido a mano: el registro y el disco pueden separarse y nada los reconcilia.

---

## 9 · BAJA — `GET /api/option-groups` devuelve los grupos que todavía no asignó

**Dónde:** `backend/routes/options.py:10-18`, `backend/services/option_service.py:33-37`.

Público a propósito, y el serializer no filtra nada del esquema (verificado: solo `id`, `name`, `required`, `sort_order`, `options[].name`). Pero devuelve **todos** los grupos, incluido uno que no está asignado a ningún producto:

```
GET /api/option-groups -> 200
[{"id":2,"name":"Cobertura",...},{"id":1,"name":"Relleno",...},
 {"id":3,"name":"Relleno secreto","options":[{"id":5,"name":"Pistacho","sort_order":0}],"required":true,...},
 {"id":4,"name":"Solo de cookies",...}]
```

`"Relleno secreto"` no está asignado a ningún producto y sale igual. Es el mismo caso que la review de T6-F20 resolvió como inocuo para ingredientes (*"revela, como mucho, que hay algo en preparación"*) y acá vale lo mismo, con un matiz: la ficha del producto ya trae sus grupos en `GET /api/products`, así que la lista global **no la necesita el público**. Si se filtra a los grupos con al menos un producto, no se pierde nada.

---

## 10 · BAJA — `urlDeImagen` no tiene lista blanca de esquemas

**Dónde:** `front/Andres_Bakery/src/lib/imagenes.ts:13-22` y `front/Andres_Bakery/src/components/DetalleDelRenglon.tsx:33-46`.

`urlDeImagen` prefija `API_URL` si el valor empieza con `/uploads/` y **devuelve cualquier otra cosa tal cual**; el resultado va a `href` y a `src`. En el panel el valor viene validado por el back, así que hoy no hay agujero. En el cajón del carrito el valor sale de `localStorage` del propio visitante (self-XSS, sin impacto en nadie más).

Lo anoto porque el proyecto ya tomó esta decisión en el otro lado: `security.md` §N1 dice *"URL que escribe el admin y después sale en un `href`: ✅ lista blanca de esquemas en `ProfileService`"*, y ahí la corrección del 2026-10-17 fue exactamente por esto. Acá el único control es el del back: si alguna vez entra una fila por otro camino (un import, un fix a mano en la base, un endpoint nuevo), el `href` la toma sin preguntar.

**Qué pediría:** que `urlDeImagen` devuelva `""` para lo que no sea `/uploads/`, `http://` o `https://`. Son tres líneas y cierra el camino.

---

## 11-15 · INFO

- **11 · `es_referencia` no exige `provisional`** (`almacen_de_imagenes.py:83-97`). Una foto ya usada por un pedido se puede volver a referenciar: *"dos renglones con la misma foto -> 201"*, *"otro pedido con la misma foto (ya usada) -> 201"*. Hace falta conocer los 32 hex, que son `secrets.token_hex(16)`, así que no se adivina. Importa solo como el camino por el que una IP puede fijar fotos sin tope (ver hallazgo 4).
- **12 · Rotar la IP de origen da presupuesto nuevo.** Medido: desde `127.0.0.1` el quinto upload es 429; bindeando el origen a `127.0.0.3`, tres 201 seguidos. Ya está escrito en `rate_limit.py` y en `security.md` §1b, así que no es un hallazgo nuevo: queda como confirmación de que sigue siendo así.
- **13 · El 429 de la foto habla de pedidos**: `{"error":"Estas mandando muchos pedidos seguidos. Proba de nuevo en un minuto."}` en `POST /api/uploads/referencia`. El texto es de `RateLimitError` y se comparte con el pedido.
- **14 · Las subidas rechazadas cuentan para el tope** (verificado: 4 subidas de basura y a la quinta 429). Es lo correcto contra abuso. El costo: alguien con un iPhone que intenta cuatro veces con HEIC (D16) queda un minuto afuera **sin haber subido nada**. Vale tenerlo presente cuando se cierre D16.
- **15 · Dos `SAWarning` por pedido personalizado**, desde `renglon_del_pedido.py:146`: *"Object of type \<OrderItem\> not in session, add operation along 'Product.order_items' will not proceed"*. Se dispara porque `_opciones` consulta `product.option_groups` (autoflush) cuando el `OrderItem` ya existe pero todavía no se hizo `db.session.add(item)` (`:91`). **Verifiqué que no se pierde nada**: `pedido #1 total=20000.00 items=1`, `filas OrderItem=1 OrderItemOption=2`, con sus dos opciones. Es ruido de log que puede disparar un anónimo. Mover el `db.session.add(item)` arriba del cálculo de `elegidas` lo apaga.

---

## Lo que atacaste y aguantó

Esto es la mitad útil del informe: lo que está acá no hay que volver a probarlo.

### La plata (N3) · `renglon_del_pedido.py:119-136`

**Ninguno de los 22 `variant_id` compró de menos.** La verificación `variante.product_id != product.id` está y funciona, y el mensaje no revela qué ids existen.

```
variant_id de 8 porciones                    -> 201  total 14000.0   (línea base)
variant_id=3 (del alfajor, $900) sobre torta -> 400 {"error": "Ese tamaño no es de «Torta de chocolate»."}
variant_id=4 (fila borrada)                  -> 400 {"error": "Ese tamaño no es de «Torta de chocolate»."}
variant_id=-1 / 0 / 2147483648 / 10**30      -> 400 {"error": "«variant_id» tiene que estar entre 1 y 2147483647."}
variant_id=2147483647                        -> 400 {"error": "Ese tamaño no es de «Torta de chocolate»."}
variant_id='8' / '08' / ' 8 ' / '+8' / '٨'   -> 400 {"error": "Ese tamaño no es de «Torta de chocolate»."}   (int() los acepta; el guard de producto los para igual)
variant_id=8.0 / 8.9 / True / False          -> 400 {"error": "«variant_id» tiene que ser un numero entero."}
variant_id='1e2' / '0x8' / '8​' / '八'   -> 400 {"error": "«variant_id» tiene que ser un numero entero."}
variant_id=[] / {} / '8; DROP TABLE'         -> 400 {"error": "«variant_id» tiene que ser un numero entero."}
variant_id=None / ''                         -> 201  total 6000.0    (precio base, B4)
```

**El total nunca quedó por debajo de la suma de los renglones, y el envío no se negocia.**

```
shipping_amount=-99999 / shipping=-99999 / fee=-99999 con delivery -> 201  total 22500.0  (envío $2.500 de DELIVERY_FEE)
total_amount=1 / total=1 en el body                                 -> 201  total 20000.0
unit_price=1 / price=1 / total=1 / subtotal=1 en el renglón         -> 201  total 20000.0
quantity=-5 en el segundo renglón                                   -> 400 {"error": "«cantidad» tiene que estar entre 1 y 1000."}

lo grabado:
  pedido #4 total=20800.00 envio=0.00  suma_renglones=20800.0
  pedido #6 total=22500.00 envio=2500.00 suma_renglones=20000.0
  pedido #7 total=20000.00 envio=0.00  suma_renglones=20000.0
```

### La URL de la foto (ADR-031/032) · `almacen_de_imagenes.py:83-144`, `renglon_del_pedido.py:196-213`

**33 payloads; entraron las 3 que emitimos nosotros.** Las tres preguntas (forma + fila + archivo) hacen cada una su trabajo, y la fila es la que sostiene el control.

```
la que subi (linea base)                 '/uploads/3611de...1a6.jpg'                     -> 201  <<< ENTRO (correcto)
cloudinary NUESTRO cloud, con fila       'https://res.cloudinary.com/nuestro-cloud/...'  -> 201  <<< ENTRO (correcto)
espacio al final                         '/uploads/3611de...1a6.jpg '                    -> 201  <<< ENTRO (saneado.texto hace strip; el valor guardado es el legítimo)
la del panel, kind=product               '/uploads/5ee579...9ef.png'                     -> 400
URL externa https / http                 'https://evil.example.com/x.jpg'                -> 400
data: URI                                'data:image/jpeg;base64,/9j/4AAQ'               -> 400
protocolo relativo                       '//evil.com/x.jpg'                              -> 400
javascript:                              'javascript:alert(1)'                           -> 400
hex inventado                            '/uploads/000...0.jpg'                          -> 400
con ..                                   '/uploads/../3611de...1a6.jpg'                  -> 400
con ../../ al .env                       '/uploads/../../backend/.env'                   -> 400
barra invertida                          '/uploads\3611de...1a6.jpg'                     -> 400
barra invertida al host                  '/\evil.com/3611de...1a6.jpg'                   -> 400
hex en MAYUSCULAS                        '/uploads/3611DE...1A6.jpg'                     -> 400
extension distinta (.svg)                '/uploads/3611de...1a6.svg'                     -> 400
extension doble                          '/uploads/3611de...1a6.jpg.html'                -> 400
mayuscula en la extension                '/uploads/3611de...1a6.JPG'                     -> 400
prefijo /Uploads/                        '/Uploads/3611de...1a6.jpg'                     -> 400
query / fragmento pegados                '...jpg?x=1' / '...jpg#x'                       -> 400
nul byte                                 '...jpg\x00.html'                               -> 400
newline + url externa                    '...jpg\nhttps://evil.com/x.jpg'                -> 400
absoluta a nuestro propio back           'http://127.0.0.1:5000/uploads/3611de...'       -> 400
cloudinary de OTRO cloud, con fila       'https://res.cloudinary.com/cloud-del-atacante/...' -> 400
cloudinary nuestro, hex sin fila         'https://res.cloudinary.com/nuestro-cloud/.../eee...e.jpg' -> 400
cloudinary nuestro con @evil.com         'https://res.cloudinary.com/nuestro-cloud/.../bbb.jpg@evil.com' -> 400
fila sin archivo en disco                '/uploads/ddd...d.jpg'                          -> 400
lista / dict                             ['/uploads/...'] / {'url': ...}                 -> 400 {"error": "El campo «foto de referencia» tiene que venir como texto."}
numero                                   1                                               -> 400
500 caracteres + la buena                'xxx...x/uploads/...'                           -> 400
```

Mensaje de rechazo, siempre el mismo y sin decir qué falló: `{"error": "Esa foto no está en el servidor. Volvé a subirla y mandá el pedido de nuevo."}`. **H4 se cumple.**

`GET /uploads/<nombre>` tampoco escapa de la carpeta:

```
/uploads/3611de8406d1e06eb7daa2d13d95d1a6.jpg -> 200 image/jpeg 613b
/uploads/../../backend/.env                   -> 404 {"error":"not found"}
/uploads/..%2f..%2fbackend%2f.env             -> 404 {"error":"not found"}
/uploads/<hex>.svg                            -> 404
/uploads/<HEX EN MAYUSCULAS>.jpg              -> 404
/uploads/aaaa...a.jpg                         -> 404
```

### La puerta de ADR-033 (la etiqueta) · `renglon_del_pedido.py:94-117`

**Un producto sin la etiqueta rechaza los tres campos, con 400 explicado y no en silencio.** Probé también los valores que `_rechazar_personalizacion` podría dejar pasar por su lista `(None, "", [], {})`:

```
cookies + option_ids=[1]                 -> 400 {"error": "«Docena de cookies» no se pide personalizado: ..."}
cookies + note='regalo'                  -> 400 (idem)
cookies + reference_image='/uploads/...' -> 400 (idem)
cookies + note=' ' / 0 / False / '\n'    -> 400 (idem)   <- 0 y False NO son None/""/[]/{}: entran al rechazo
cookies + option_ids=[0] / ['x']         -> 400 (idem)
cookies + reference_image=0 / False / ' '-> 400 (idem)
```

La etiqueta renombrada se comporta como la ADR dice (y eso es una decisión, no un bug): con el slug cambiado a `tortas-a-pedido`, `option_ids` sale 400 y el producto se vende como siempre, **ignorando el grupo `required`**. Está escrito en ADR-033 ("El costo honesto") y mitigado en el panel; lo dejo acá medido para que no se descubra en producción:

```
torta con option_ids despues de renombrar el slug -> 400 {"error": "«Torta a pedido» no se pide personalizado: ..."}
torta SIN option_ids despues de renombrar         -> 201  total 20000.0
```

### Las opciones elegidas · `renglon_del_pedido.py:138-189`

```
option_ids=[5] (grupo sin productos asignados)  -> 400 {"error": "Una de las opciones elegidas no es de «Torta a pedido»."}
option_ids=[6] (grupo asignado a OTRO producto) -> 400 (idem)
dos opciones del mismo grupo                    -> 400 {"error": "Elegí una sola opción de «Relleno»."}
el mismo option_id dos veces                    -> 400 (idem)
grupo required sin elegir / sin option_ids      -> 400 {"error": "Falta elegir: Relleno."}
21 ids                                          -> 400 {"error": "Hay demasiadas opciones elegidas en un producto."}
option_ids="1,2"                                -> 400 {"error": "Las opciones elegidas tienen que venir como lista."}
option_ids=[[1]]                                -> 400 {"error": "«option_id» tiene que ser un numero entero."}
```

### La nota

```
note de 5000 caracteres + "\nPagado: SI"  -> 201, y lo grabado mide 300 (TOPE_NOTA), sin el salto de línea
note = dict / lista                       -> 400 {"error": "El campo «nota» tiene que venir como texto."}
note de 1 MB por HTTP                     -> 201, grabado 300. Acotado además por MAX_CONTENT_LENGTH
```

No hay ningún campo nuevo sin tope de largo: busqué el 4 MB en una fila que encontró la review de T6-F20 y no está ni en `note`, ni en `reference_image` (tope 500 antes de validar), ni en los nombres de grupo/opción (`TOPE_NOMBRE=120`, medido abajo).

### El tope por IP de la ruta pública de archivos · `rate_limit.py:209`, `routes/utils.py:78-120`

**4/min con `Retry-After`, y no se saltea con ningún header.** Diez headers de proxy probados con la IP ya castigada, los diez 429:

```
#1..#4 -> HTTP/1.1 201 CREATED
#5     -> HTTP/1.1 429 TOO MANY REQUESTS Retry-After: 60 {"error":"Estas mandando muchos pedidos seguidos. Proba de nuevo en un minuto."}
#6     -> HTTP/1.1 429 ... Retry-After: 60

X-Forwarded-For: 9.9.9.9            -> 429   X-Forwarded-For: 9.9.9.9, 8.8.8.8 -> 429
X-Real-IP: 8.8.8.8                  -> 429   Forwarded: for=7.7.7.7            -> 429
X-Client-IP: 6.6.6.6                -> 429   True-Client-IP: 4.4.4.4           -> 429
X-Originating-IP: 5.5.5.5           -> 429   CF-Connecting-IP: 3.3.3.3         -> 429
X-Forwarded-Host: otro.local        -> 429   Host: otro.local                  -> 429
```

`remote_addr` es lo único que cuenta (`routes/utils.py:101`), que es lo correcto sin `ProxyFix`. **H2 se cumple.** La contracara (rotar la IP de origen) está en INFO 12 y ya estaba documentada.

### La cuota y el barrido · `almacen_de_imagenes.py:157-230`

**Pasada la cuota no se escribe nada** (H3): dos 507 seguidos y la carpeta quedó con 7 archivos para 7 subidas exitosas, cero para las rechazadas.

```
anonimo #7 -> (507, '{"error": "No queda lugar para más fotos por ahora. Escribinos por WhatsApp y lo resolvemos."}')
anonimo #8 -> (507, ídem)
espacio usado = 3751 / cuota 4000;  archivos en disco = 7
```

**El barrido se lleva la huérfana y no toca la usada** (H6 y H7):

```
antes:   [(usada,'reference',False), (huerfana,'reference',True), (del panel,'product',False)]
despues: [(usada,'reference',False), (del panel,'product',False), (la nueva,'reference',True)]
la usada sigue? True   | el archivo de la usada sigue? True
la huerfana se fue? True | su archivo se fue? True
la del panel sigue (D17 abierta)? True
```

**40 huérfanas vencidas**: el barrido saca 25 por subida y recupera el espacio sin dejar filas sin archivo ni archivos sin fila (`filas 40 → 16`, `bytes 80.000.000 → 30.000.613`). El tope de 25 no deja un agujero permanente: se alcanza en subidas sucesivas.

### Los formatos, por la ruta pública · `image_file.py`

**El validador se comporta igual que en el panel (H5).** Lo único que entra es lo que el parser entendió:

```
0 bytes                          -> 400 {"error": "No llego ningun archivo."}
1 byte                           -> 400 {"error": "El archivo no es una imagen JPG ni PNG."}
poliglota HTML+JPEG              -> 400 {"error": "El archivo no es una imagen JPG ni PNG."}
HEIC                             -> 400 {"error": "Esa foto es HEIC, el formato del iPhone. ..."}
WEBP                             -> 400 {"error": "Por ahora no se puede subir WEBP: guardala como JPG o PNG."}
JPEG cortado a la mitad          -> 400 {"error": "Un segmento del JPG declara un largo imposible."}
PNG sin IHDR                     -> 400 {"error": "El PNG no empieza por su cabecera."}
PNG con CRC roto                 -> 400 {"error": "El PNG esta corrupto: un chunk no coincide con su checksum."}
PNG 30000x30000 (bomba)          -> 400 {"error": "La imagen mide 30000x30000: el maximo por lado es 6000 pixeles."}
PNG con eXIf/zTXt/evIl           -> 201, y lo guardado pesa 73 b contra 484 b de entrada: los tres chunks se fueron
nombre '../../../evil.jpg'       -> 201 con nombre 'fa152a27...9e.jpg' (el del cliente se descarta)
nombre 'a\x00.php.jpg'           -> 201 con nombre 'd4fedf7f...f0.jpg'
```

Lo que sí entra con contenido elegido por quien sube está en el hallazgo 4 (`IDAT` arbitrario, JPEG mínimo sin pixeles): es estructura válida, no es ejecutable, y ya estaba anotado como precisión en `security.md` §2-N5.

### Autorización de los grupos de opciones · `routes/options.py`, `option_service.py:165-175`

**Seis rutas de admin, cinco clases de credencial, treinta intentos, ninguno pasó.** `GET` es el único público, a propósito.

```
-- sin token
    POST/PUT/DELETE /api/option-groups[...]       -> 401 {"msg":"Missing Authorization Header"}
-- token de usuario comun (recién registrado)
    POST/PUT/DELETE /api/option-groups[...]       -> 403 {"error":"Admin privileges required"}
-- token vencido/con firma inválida
    POST/PUT/DELETE /api/option-groups[...]       -> 422 {"msg":"Invalid crypto padding"}
-- token basura ("Bearer xxx")
    POST/PUT/DELETE /api/option-groups[...]       -> 422 {"msg":"Not enough segments"}
-- Authorization vacío
    POST/PUT/DELETE /api/option-groups[...]       -> 401 {"msg":"Missing Authorization Header"}
```

**Y con token de admin, la opción de otro grupo no se renombra ni se borra por la ruta de este:**

```
PUT    /api/option-groups/1/options/3  (la 3 es del grupo 2) -> 400 {"error":"Esa opción no es de este grupo."}
DELETE /api/option-groups/1/options/3                        -> 400 {"error":"Esa opción no es de este grupo."}
PUT    /api/option-groups/999999                             -> 404 {"error":"option group not found"}
```

**Los largos y los tipos, en las rutas de admin** (el agujero de T6-F20 no se repitió):

```
name de 5000 caracteres          -> 400 {"error":"El nombre no puede pasar de 120 caracteres."}
options=[{name: 5000 chars}]     -> 400 (idem)
name=null                        -> 400 {"error":"Hace falta un nombre."}
name=dict                        -> 400 {"error":"El campo «nombre» tiene que venir como texto."}
options=[null]                   -> 400 {"error":"Hace falta un nombre."}
options=[[1]]                    -> 400 {"error":"El campo «nombre» tiene que venir como texto."}
sort_order=1e308                 -> 400 {"error":"«orden» tiene que ser un numero entero."}
required=['x']                   -> 400 {"error":"«required» tiene que ser verdadero o falso."}
body = [1,2,3] / "string" / "{"  -> 400 {"error":"El campo «grupo» tiene que venir como objeto."} / "Hace falta un nombre."
```

Acá `saneado.diccionario` **sí** se llama sobre el body entero (`option_service.py:48` y `:76`), que es exactamente lo que le falta al pedido (hallazgo 5).

### La ruta del panel sigue siendo de ella (H8)

```
POST /api/uploads sin token                      -> 401 {"msg":"Missing Authorization Header"}   (medido también contra el server real en 127.0.0.1:5000)
POST /api/uploads con token de usuario comun     -> 403 {"error":"Admin privileges required"}
POST /api/uploads con token de admin, 3 MB       -> 201  (su tope son 4 MB, y el público 2)
```

### Nada filtra el pedido de otra persona

```
pedido de A (con note='secreto de A') -> 201
GET /api/orders/1 como B         -> (403, {"error":"not authorized"})
GET /api/orders/1 como sin token  -> (401, {"msg":"Missing Authorization Header"})
GET /api/orders/1 como admin      -> (200, el pedido completo)   <- correcto: es el panel de Andrea
```

La respuesta de `POST /api/orders/whatsapp` se arma con el pedido recién creado y no trae nada ajeno (`order_id`, `total`, `phone`, `message`). Los cuerpos hostiles tampoco devolvieron datos de nadie.

### La suite del proyecto

```
$ backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -t . -q
Ran 307 tests in 74.968s
OK
```

Los tests que las tarjetas prometen existen y corren: `test_foto_de_referencia.py` (12), `test_subida_publica.py` (12), `test_solo_las_tortas_se_personalizan.py` (5), `test_pedido_hostil.py` (18). El "test de los diez casos" de la URL que menciona `security.md` §N5b está en `test_foto_de_referencia.py:108-125` y cubre 9 casos con `subTest`; los 33 que probé acá se apoyan en los mismos tres controles y ninguno los perforó.

---

## Alcance: lo que NO se pudo probar, y por qué

1. **Cloudinary de verdad.** `backend/.env` no tiene ninguna de las cuatro `CLOUDINARY_*`, así que `cloudinary_client.configurado()` es `False` y **toda subida va al disco**. No se ejercitó: la llamada HTTP firmada, el multipart que arma `_multipart`, el `destroy` del barrido, ni qué pasa si Cloudinary devuelve un `secure_url` con una forma inesperada. Lo que **sí** se atacó es la validación de la forma de las URLs de Cloudinary, cargando solo `CLOUDINARY_CLOUD_NAME` (que deja `configurado()` en `False` pero `_forma_de_cloudinary` activa) e insertando filas a mano en `stored_image`. El camino "subir a Cloudinary y después usar esa URL en un pedido" queda sin medir de punta a punta, y con él el huérfano del hallazgo 6 en la cuenta de ella.
2. **El navegador.** H1 (un anónimo sube y ve su foto en el pedido), B7, B8 y B9 son criterios de navegador y no se corrieron: esta review es por HTTP y por servicio. El front se leyó solo donde toca la seguridad (`imagenes.ts`, `DetalleDelRenglon.tsx`, el espejo de `TAG_PERSONALIZABLE`, que **coincide**: `carrito.ts:23` dice `"tortas-personalizadas"`, igual que `renglon_del_pedido.py:34`).
3. **La migración (B6).** No se corrió `db upgrade`/`downgrade` ni se tocó `instance/bakery.db`: todo se midió contra bases propias en el temporal. La base de desarrollo quedó **intacta** (la única cosa que se le pidió fue `GET /api/health` y un `POST /api/uploads` sin token, los dos de lectura).
4. **Varios workers.** Todo se midió con un proceso. Lo que `rate_limit.py` dice sobre el tope en memoria (N workers = N veces el tope) sigue sin medirse, y el hallazgo 2 es **peor** con varios workers: un lock de proceso no lo cerraría.
5. **La concurrencia del hallazgo 2 necesita requests que se solapen**, no el mismo milisegundo: se midió con una `threading.Barrier` de 6 y de 8 contra un Werkzeug `threaded=True`, que es lo que corre hoy. No hace falta nada más fino que eso.
6. **`sdd/seguridad.md` no existe en el repo** (ya lo anotó `security.md` §N4 y la review de T6-F20). La tarjeta y CLAUDE.md lo mencionan; se revisó contra `sdd/security.md`, que es lo que está activo.

## Lo que pediría, en orden

1. **ADR-029 parte 3**: implementarla, o corregir la ADR y el mensaje del 400 (hallazgo 1). Es lo único de esta tanda que rompe algo hoy.
2. **Tres renglones de `security.md` que hoy dicen de más** (hallazgos 2, 4 y 5): la cuota no es atómica; "subir es admin-only" ya no aplica; el body de primer nivel del pedido no está tipado.
3. **La atomicidad de la cuota** y **un techo propio para la ruta pública** (hallazgos 2 y 3), antes de un deploy con la subida pública prendida.
4. **`saneado.diccionario` sobre el body** en las cuatro rutas, más un `errorhandler(500)` que devuelva JSON (hallazgo 5).
5. El resto (6 a 15) cuando se toque la zona: ninguno bloquea nada.
