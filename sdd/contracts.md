# contracts.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16

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
| POST | `/api/orders` | token | `{order_id, total, …}` |
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
| GET | `/api/site/delivery` | — | `{zone_name, fee, pickup_address}` — mata el 2500 hardcodeado (C4) |
| POST | `/api/orders/<id>/whatsapp` | token | `{phone, message}`: el back arma el texto con los importes de la DB (ADR-002) |

### Cambios sobre endpoints existentes

- `POST /api/orders` valida `min_qty` y `qty_step` del lado del servidor y rechaza con **400** si no se cumplen (V4). Suma `channel` (`"whatsapp"` | `"mercado_pago"`) y `customer_phone`.
- `POST /api/payments/checkout` devuelve **503** si `PAYMENTS_ENABLED=false`, en vez del `ConfigurationError` actual.
- `GET /api/products` deja de devolver `Recipe`-ismos y pasa a la forma de arriba.

## 3 · Compatibilidad

El front y el back se despliegan juntos y no hay consumidores externos, así que **no se mantienen las dos formas**: el cambio es de corte, en un solo ciclo, con los tests del back como red. Si alguna vez hay un consumidor externo, esto deja de valer y hay que versionar.
