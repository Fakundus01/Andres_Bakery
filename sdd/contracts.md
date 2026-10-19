# contracts.md · Andres Bakery

**Versión:** 0.4.0 · **Última actualización:** 2026-10-19

Contrato de la API. Es lo que desacopla el panel (T5) de la carta pública (T6): aprobado esto, las dos pueden ir en paralelo.

Base: `VITE_BACKEND_URL`, default `http://127.0.0.1:5000`. Auth: `Authorization: Bearer <token>`.
Errores: `{"error": "<mensaje>"}` con el status de la excepción (`services/exceptions.py` → `_register_http_handlers`).

## 1 · Lo que existe hoy (verificado el 2026-10-16)

| Método | Ruta | Auth | Devuelve |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{token, user}` |
| POST | `/api/auth/login` | — | `{token, user}` |
| GET | `/api/auth/me` | token | `User` |
| GET | `/api/products` | — | `Product[]` |
| POST | `/api/products` | admin | `{id}` · 201 |
| PUT | `/api/products/<id>` | admin | `{status}` |
| DELETE | `/api/products/<id>` | admin | `{status}` |
| GET | `/api/recipes` | — | `Recipe[]` — **se jubila (ADR-001)** |
| POST·PUT·DELETE | `/api/recipes[/<id>]` | admin | **se jubilan** |
| GET | `/api/ingredients` | — | `Ingredient[]` — lo usa el panel desde T6 (F20) |
| POST | `/api/ingredients` | admin | `{id, name}` · **201 si lo creó, 200 si ya existía** con ese nombre normalizado (ADR-030). El `name` que vuelve es el **guardado**, que puede estar escrito distinto del que se mandó |
| PUT·DELETE | `/api/ingredients/<id>` | admin | `{status}` — los usa el panel desde T6-F20b para corregir un tipeo y borrar lo que sobra |
| GET | `/api/orders` | token | `Order[]` (del usuario; todas si es admin) |
| POST | `/api/orders` | token | `{order_id, total, emails}` |
| POST | `/api/orders/whatsapp` | **— (token opcional)** | `{order_id, total, phone, message}` · 201 — el pedido del invitado (F23, F31, ADR-025) |
| PATCH | `/api/orders/<id>/status` | admin | `{status}` |
| POST | `/api/payments/checkout` | token | `{checkout_url, preference_id, …}` |
| POST | `/api/payments/webhook` | — (MP) | `{status}` |
| GET | `/api/site/about` | — | `{content}` |
| PUT | `/api/site/about` | admin | `{status}` |
| GET | `/api/users` | admin | `User[]` |
| POST | `/api/contact` | — | `{status}` |

**Deuda de contrato:** ninguna lista pagina (`security.md` N6) y las respuestas de escritura son inconsistentes — unas devuelven `{id}`, otras `{status}`. No se arregla en este ciclo; queda anotado.

## 2 · Lo que cambia con T3/T4 — **implementado el 2026-10-16**

Esto dejo de ser propuesta: esta construido y con tests. Tres diferencias respecto de lo que decia este documento, todas por necesidad del panel:

- `Tag` devuelve tambien **`sort_order`**. Sin eso, editar una etiqueta desde el panel le reseteaba el orden a 0.
- `POST /api/products` y `POST /api/tags` devuelven **`{id, slug}`**, no solo `{id}`: el panel necesita el slug para linkear la ficha recien creada.
- `GET /api/site/delivery` devuelve ademas **`whatsapp_phone`** y **`payments_enabled`**. Con eso el front dejo de tener su propio `VITE_WHATSAPP_PHONE` (el numero vivia en dos lados y podian discrepar) y sabe si mostrar el pago online o el camino por WhatsApp.

### `Product` — forma nueva

```json
{
  "id": 12,
  "slug": "brownie-clasico",
  "name": "Brownie clásico",
  "description": "Texto largo para la ficha.",
  "steps": "1. Derretir el chocolate…\n2. …",
  "category": "brownies",
  "price": 1800.0,
  "unit_label": "unidad",
  "min_qty": 6,
  "qty_step": 6,
  "prep_note": "Se encarga con 48 h de anticipación.",
  "available": true,
  "allows_pickup": true,
  "allows_delivery": true,
  "image_url": "https://…",
  "ingredients": [{"id": 3, "name": "Chocolate semiamargo", "unit": "g"}],
  "tags": [{"id": 1, "name": "sin TACC", "slug": "sin-tacc", "color_token": "acento"}],
  "variants": [{"id": 5, "name": "Torta 8 porciones", "price": 14000.0}],
  "option_groups": [{"id": 1, "name": "Relleno", "required": true, "sort_order": 0,
                     "options": [{"id": 3, "name": "Dulce de leche", "sort_order": 0}]}]
}
```

`price` es el precio de **una** `unit_label`. `variants` vacío ⇒ el producto se vende por unidad. Con `variants` ⇒ el precio sale de la variante elegida (ADR-007). `steps` en `null` o vacío ⇒ la ficha no renderiza la sección de receta (V10).

### Endpoints nuevos

| Método | Ruta | Auth | Para qué |
|---|---|---|---|
| GET | `/api/products?tag=<slug>&available=1` | — | filtro por etiqueta y disponibilidad (F21) |
| GET | `/api/products/<slug>` | — | ficha del producto (F25) |
| GET | `/api/tags` | — | etiquetas para el filtro |
| POST·PUT·DELETE | `/api/tags[/<id>]` | admin | las crea ella (ADR-006) |
| GET | `/api/site/delivery` | — | `{zone_name, fee, pickup_address, whatsapp_phone, payments_enabled, ai_enabled, personalization_tag}` — mata el 2500 hardcodeado (C4), y desde el 2026-10-19 dice **cuál es la etiqueta que habilita la personalización** (ADR-033, cierra D27) |
| ~~POST~~ | ~~`/api/orders/<id>/whatsapp`~~ | ~~token~~ | **reemplazada el 2026-10-17 por `POST /api/orders/whatsapp`** (ADR-025): pedía el token que el invitado no tiene, y con el id en la URL se leía el mensaje de otro pedido |

### Cambios sobre endpoints existentes

- `POST /api/orders` valida `min_qty` y `qty_step` del lado del servidor y rechaza con **400** si no se cumplen (V4). Suma `channel` (`"whatsapp"` | `"mercado_pago"`) y `customer_phone`.
- **El envío lo decide el servidor** desde el 2026-10-17: `delivery.shipping_amount` del request se ignora en las dos rutas. Antes se respetaba si venía, y en una ruta pública eso es envío gratis —o negativo— a pedido (ADR-025).
- `POST /api/payments/checkout` devuelve **503** si `PAYMENTS_ENABLED=false`, en vez del `ConfigurationError` actual.
- `GET /api/products` deja de devolver `Recipe`-ismos y pasa a la forma de arriba.

## 3 · Compatibilidad

El front y el back se despliegan juntos y no hay consumidores externos, así que **no se mantienen las dos formas**: el cambio es de corte, en un solo ciclo, con los tests del back como red. Si alguna vez hay un consumidor externo, esto deja de valer y hay que versionar.

## 4 · Lo que entró el 2026-10-17 (T10–T14) — **implementado, con tests**

| Método | Ruta | Auth | Devuelve |
|---|---|---|---|
| GET | `/api/site/profile` | — | el perfil de Andrea: redes, ficha y CV (F43, F44) |
| PUT | `/api/site/profile` | admin | `{status}` — lo valida y normaliza el servidor (ADR-017) |
| POST | `/api/uploads` | admin | `{url, filename, content_type, bytes, width, height}` · 201 — `multipart/form-data`, campo `file` (F45) |
| GET | `/uploads/<nombre>` | — | el archivo, con `Content-Type` fijo y `nosniff` |
| POST | `/api/metrics/view` | — | `204` — cuenta una visita, sin cookie ni IP (F48) |
| GET | `/api/metrics/summary?days=30` | admin | lo que dibujan los gráficos, **ya agregado** (F47, F48) |
| POST | `/api/ai/recipe-draft` | admin | el borrador de receta, o **503** si está apagado (F46) |

### `GET /api/site/profile`

Todo campo puede venir vacío: la página renderiza solo lo que tiene (F24).

```json
{
  "role": "Repostera",
  "tagline": "Hace todo ella",
  "photo_url": "/uploads/ab12….jpg",
  "location": "Villa Maipú, General San Martín",
  "socials": [{"network": "instagram", "url": "https://instagram.com/…", "label": "@…"}],
  "cv": {
    "published": false,
    "headline": "", "summary": "", "contact_email": "", "file_url": "",
    "skills": ["…"],
    "experience": [{"title": "", "place": "", "period": "", "detail": ""}],
    "education": [{"title": "", "place": "", "period": "", "detail": ""}]
  }
}
```

`socials[].network` solo puede ser uno de: `instagram`, `tiktok`, `facebook`, `youtube`, `whatsapp`, `linkedin`, `pinterest`, `web`, `mail`. `url` solo `http(s)://` — cualquier otro esquema se descarta al guardar (ADR-017). `cv.published` en `false` ⇒ `/cv` no se linkea desde el perfil.

### `POST /api/uploads`

`multipart/form-data` con el campo **`file`**. Solo **JPEG y PNG**, hasta **4 MB**. El servidor descarta el nombre y el `Content-Type` que manda el navegador: decide por el contenido (ADR-018).

Errores en castellano, con el caso de HEIC nombrado: `413` si pasa el tope de Flask, `400` si el archivo no es una imagen que el servidor entienda.

### `POST /api/metrics/view`

```json
{"path": "/tienda", "device": "mouse"}
```

`204` siempre que el cuerpo sea sano, incluso si la ruta no se reconoce (cae en `otra`). `device` es `mouse` o `tactil`; cualquier otra cosa cuenta como `otra`. **No lleva auth, no deja cookie y no guarda IP** (ADR-019).

### `GET /api/metrics/summary?days=30`

```json
{
  "days": 30,
  "revenue_total": 184500.0,
  "orders_total": 23,
  "orders_paid": 9,
  "customers": 7,
  "visits_total": 412,
  "revenue_by_day": [{"day": "2026-10-01", "value": 12000.0}],
  "orders_by_day": [{"day": "2026-10-01", "value": 2}],
  "visits_by_day": [{"day": "2026-10-01", "value": 31}],
  "orders_by_status": [{"label": "paid", "value": 9}],
  "top_products": [{"label": "Brownie clásico", "value": 48, "revenue": 86400.0}],
  "top_paths": [{"label": "/tienda", "value": 160}],
  "devices": [{"label": "mouse", "value": 240}, {"label": "tactil", "value": 172}]
}
```

`days` se recorta a `[1, 365]`. Las series vienen **con los días vacíos rellenos en cero**: el gráfico no tiene que adivinar huecos.

### `POST /api/ai/recipe-draft`

```json
{"image_url": "/uploads/ab12….jpg", "hint": "brownie"}
```

Responde el borrador, siempre con la misma forma y siempre recortado por el servidor:

```json
{
  "name": "Brownie clásico",
  "category": "brownies",
  "description": "…",
  "ingredients": ["…"],
  "steps": ["…"],
  "unit_label": "unidad",
  "notice": "Lo escribió una IA mirando la foto. Leelo y corregilo antes de publicar."
}
```

**No propone etiquetas** a propósito (alérgenos ⇒ ADR-020). `503` con los pagos de IA apagados o sin `ANTHROPIC_API_KEY`; `429` si se pasó `AI_DAILY_LIMIT`; `400` si la imagen no existe o no es del propio sitio.

## 5 · Lo que entró el 2026-10-17 (T7) — **implementado, con tests**

### `POST /api/orders/whatsapp` — el pedido sin cuenta (F23, F31, ADR-025)

Pública a propósito. Si llega un `Authorization` válido, el pedido queda atado a esa cuenta; si llega uno vencido o roto, se ignora y el pedido es de invitado.

```json
{
  "items": [{ "product_id": 3, "quantity": 6 }],
  "customer": { "name": "Vecina del barrio", "phone": "11 4455 6677", "email": "opcional@…" },
  "delivery": {
    "method": "delivery",
    "address": "Jose Hernandez 1234",
    "neighborhood": "Villa Maipú",
    "notes": "Timbre B"
  }
}
```

Responde **201**:

```json
{
  "order_id": 6,
  "total": 21700.0,
  "phone": "5491170595319",
  "message": "¡Hola Andrea! Te hago un pedido desde la web.\n\nPedido #6\n- 12 x Cookies New York: $19.200\nEnvío: $2.500\nTotal: $21.700\n…"
}
```

- **`message` lo arma el servidor** con los importes de la base. El front no lo escribe ni lo corrige: lo pega en `wa.me` con `linkWhatsApp()`. **El mensaje entero** entra en 1500 caracteres: la cabecera y el pie se miden primero y los productos se reparten lo que sobra, así que el total y la entrega nunca se pierden (corregido el 2026-10-18: antes el tope recortaba solo los productos y una dedicatoria larga dejaba el link inservible).
- **`phone`** sale de `WHATSAPP_PHONE`. Si está vacío, el front muestra el número de pedido y dice que falta configurarlo, en vez de un link roto.
- **Obligatorios:** `items`, `customer.name` y `customer.phone` (8 dígitos mínimo). El mail es opcional (migración `0004`).
- **400** con el motivo **en castellano**: sin nombre, sin teléfono, fuera de la zona de entrega, más de 30 productos distintos, más de 1000 unidades de uno, una cantidad que no respeta `min_qty`/`qty_step`, un campo que no es del tipo esperado (`customer` que no es objeto, notas que son un diccionario) o un método de entrega que no es `delivery` ni `pickup`.
- **Topes de texto** (se recorta, no se rechaza): nombre y barrio 120, dirección 255, notas 500, teléfono 40.
- **`delivery.method`** tiene lista blanca y se normaliza a minúscula: `"Delivery"` es un envío, `"envio a domicilio"` es un 400. Antes se guardaba tal cual y cobraba $0 de envío.
- **429** con `Retry-After` pasando 3 por minuto o 10 por hora desde la misma IP (ADR-026).

### Topes por IP (ADR-026)

| Ruta | Tope | Respuesta al pasarse |
|---|---|---|
| `POST /api/orders/whatsapp` | 3/min y 10/hora **de pedidos concretados**, 15/min y 40/hora de intentos | `429` + `Retry-After` |
| `POST /api/orders` | 5/min y 30/hora concretados, mismos intentos | `429` + `Retry-After` |
| `POST /api/auth/login` | 10 cada 5 min | `429` + `Retry-After` |
| `POST /api/auth/register` | 5/hora | `429` + `Retry-After` |
| `POST /api/contact` | 5/hora | `429` + `Retry-After` |

El cuerpo del 429 es `{"error": "…"}` con el texto en castellano, como el resto de los errores del front.

## 5 · Lo que entró el 2026-10-19 (T4-F19a, T18) — **implementado, con tests**

| Método | Ruta | Auth | Devuelve |
|---|---|---|---|
| GET | `/api/option-groups` | — | `OptionGroup[]` — qué se puede elegir (F57). Público porque lo necesita la ficha |
| POST | `/api/option-groups` | admin | el grupo · **201 si lo creó, 200 si ya existía** con ese nombre normalizado (ADR-030/031) |
| PUT·DELETE | `/api/option-groups/<id>` | admin | `{status}` — renombrar, cambiar `required`, reordenar, borrar |
| POST | `/api/option-groups/<id>/options` | admin | la opción · **201 / 200** con la misma regla |
| PUT·DELETE | `/api/option-groups/<id>/options/<option_id>` | admin | `{status}` — la opción tiene que ser **de ese grupo**, si no 400 |
| POST | `/api/uploads/referencia` | **—** | `{url, filename, content_type, bytes, width, height}` · 201 — la foto que sube quien compra (F59) |

### `OptionGroup`

```json
{
  "id": 1,
  "name": "Relleno",
  "required": true,
  "sort_order": 0,
  "options": [{"id": 3, "name": "Dulce de leche", "sort_order": 0}]
}
```

No expone `normalized_name`: es cómo se decide la unicidad (ADR-030), no algo que la pantalla
necesite. `GET /api/products[/<slug>]` suma `option_groups` con esta misma forma, y
`POST·PUT /api/products` aceptan **`option_group_ids`** (qué grupos aplican a ese producto).

### El renglón del pedido

`POST /api/orders` y `POST /api/orders/whatsapp` aceptan por renglón, además de `product_id` y
`quantity`:

| Campo | Qué es | Qué valida el servidor |
|---|---|---|
| `variant_id` | el tamaño elegido (F19a) | que la variante **sea de ese producto**; si no, 400. **El precio nunca llega del request**: sale de la fila (ADR-029) |
| `variant_name` | el nombre que la pantalla mostró, **como testigo** | si no coincide con el de la fila, 400 pidiendo elegir de nuevo: evita que un id viejo (SQLite reusa los rowid) cobre un tamaño por otro. Opcional: un carrito guardado antes de esto no lo manda |
| `option_ids` | los sabores elegidos (F58) | que cada opción sea de un grupo **asignado a ese producto**, uno solo por grupo, y que estén todos los `required`; si no, 400 |
| `note` | cómo quiere la torta | texto, tope 300, **una sola línea** (si no, "Pagado: SI" finge un campo del sistema) |
| `reference_image` | la foto de referencia (F59) | que sea **una URL que emitimos nosotros** (ADR-031/032); cualquier otra cosa es 400 |

**Los tres últimos solo se aceptan si el producto lleva la etiqueta `tortas-personalizadas`**
(ADR-033). Para cualquier otro producto son un **400 explicado**, no un descarte en silencio.
`variant_id` no depende de la etiqueta: vender por tamaños es de la carta (ADR-007).

El pedido devuelve el renglón con `variant_name`, `note`, `reference_image` y `options`
(`[{group_name, option_name}]`), **copiados por nombre**: si ella renombra un sabor el año que
viene, el pedido de hoy sigue diciendo lo que vendió hoy (ADR-031).

### `POST /api/uploads/referencia`

Ruta **separada** de la de admin, con su propia política (ADR-032):

| | `/api/uploads` (panel) | `/api/uploads/referencia` (cliente) |
|---|---|---|
| Auth | admin | — |
| Tope por archivo | `UPLOAD_MAX_BYTES` (4 MB) | `REFERENCE_UPLOAD_MAX_BYTES` (2 MB), nunca más que el del panel |
| Tope por IP | — | 4/min y 15/hora ⇒ `429` + `Retry-After` |
| Al subirse | queda | nace **provisoria**: si no llega a un pedido, el barrido la borra (D17) |

Las dos validan por contenido y reescriben sin metadatos (ADR-018), las dos cuentan contra
`UPLOAD_QUOTA_BYTES` —y la pública además contra `REFERENCE_UPLOAD_QUOTA_BYTES`, para que no le
llene el lugar a las fotos de la carta— con **507** explicado al llenarse, y con mensaje distinto
según quién lo lee (D18) y las dos guardan donde diga el entorno:
Cloudinary con credenciales, disco local sin ellas (ADR-032).
