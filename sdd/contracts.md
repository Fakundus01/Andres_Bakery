# contracts.md · Andres Bakery

**Versión:** 0.3.0 · **Última actualización:** 2026-10-17

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
| GET | `/api/ingredients` | — | `Ingredient[]` — existe, el front no lo usa |
| POST·PUT·DELETE | `/api/ingredients[/<id>]` | admin | existen, el front no los usa |
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
  "variants": [{"id": 5, "name": "Torta 8 porciones", "price": 14000.0}]
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
| GET | `/api/site/delivery` | — | `{zone_name, fee, pickup_address, whatsapp_phone, payments_enabled, ai_enabled}` — mata el 2500 hardcodeado (C4) |
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

- **`message` lo arma el servidor** con los importes de la base. El front no lo escribe ni lo corrige: lo pega en `wa.me` con `linkWhatsApp()`. Se corta a 1500 caracteres sin tocar el total ni la entrega.
- **`phone`** sale de `WHATSAPP_PHONE`. Si está vacío, el front muestra el número de pedido y dice que falta configurarlo, en vez de un link roto.
- **Obligatorios:** `items`, `customer.name` y `customer.phone` (8 dígitos mínimo). El mail es opcional (migración `0004`).
- **400** con el motivo en castellano: sin nombre, sin teléfono, fuera de la zona de entrega, más de 30 productos distintos, más de 1000 unidades de uno, o una cantidad que no respeta `min_qty`/`qty_step`.
- **429** con `Retry-After` pasando 3 por minuto o 10 por hora desde la misma IP (ADR-026).

### Topes por IP (ADR-026)

| Ruta | Tope | Respuesta al pasarse |
|---|---|---|
| `POST /api/orders/whatsapp` | 3/min, 10/hora | `429` + `Retry-After` |
| `POST /api/auth/login` | 10 cada 5 min | `429` + `Retry-After` |
| `POST /api/auth/register` | 5/hora | `429` + `Retry-After` |
| `POST /api/contact` | 5/hora | `429` + `Retry-After` |

El cuerpo del 429 es `{"error": "…"}` con el texto en castellano, como el resto de los errores del front.
