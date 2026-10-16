# design.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16 · **Estado:** propuesta, esperando OK

Dos partes: **A) lo que existe hoy** (fiel, R15) y **B) a dónde va** con las decisiones del 2026-10-16.

---

## A · Arquitectura actual (as-is, verificada el 2026-10-16)

```
Andres_Bakery/
├── backend/            Flask 3.0.2 + SQLAlchemy + JWT, SQLite
│   ├── app_factory.py  create_app(): extensiones → blueprints → handlers → db.create_all() + bootstrap
│   ├── config.py       todo por os.getenv con defaults de dev
│   ├── models.py       User Product Ingredient Recipe Order OrderItem OrderDelivery Payment
│   ├── routes/         9 blueprints delgados: solo parsean request y delegan
│   └── services/       la lógica: catalog, order, payment, auth, contact, site, bootstrap, notifications
├── front/Andres_Bakery/        (partido en T1 el 2026-10-16)
│   ├── src/App.tsx     17 líneas: providers + router
│   ├── src/layout/     AppShell · SiteHeader · SiteFooter
│   ├── src/pages/      Home Shop Checkout Orders Login Register · admin/ (AdminPage + 5 tabs)
│   ├── src/components/ HeroCarousel ProductCard CartDrawer SupportChat · ui/ (11 helpers)
│   ├── src/contexts/   AuthContext (token en localStorage) · CartContext
│   └── src/lib/        api.ts · types.ts · constants.ts · format.ts · ui-types.ts
└── instance/bakery.db  SQLite, 61 KB
```

**Capas del back (bien separadas, se mantienen).** `routes/` nunca toca la DB: cada endpoint hace `request.get_json()` y llama a un servicio. Los servicios heredan de `ServiceBase` (`services/base.py`) y levantan excepciones tipadas (`exceptions.py`) que `_register_http_handlers` traduce a JSON con su status. Es un patrón consistente y vale respetarlo.

**Cómo nace el esquema.** Solo `db.create_all()` en `app_factory.py:21`. **Crea tablas que faltan; nunca modifica una tabla que ya existe.** Consecuencia directa: agregar una columna a `Product` no se aplica sobre `instance/bakery.db` — ver ADR-010.

**Dos conceptos que se pisan.** `Product` (precio, categoría, `available`, m2m con `Ingredient`) y `Recipe` (título, resumen, `ingredients` como **texto libre**, pasos, estado). El m2m `Product.ingredients` existe y **nadie lo usa**: `routes/ingredients.py` expone su CRUD completo y el front no lo consume. Es la pieza que ADR-001 pone a trabajar.

**Front.** `HashRouter` con 7 rutas, todas resueltas por componentes declarados en el mismo `App.tsx`. Tailwind 4 por `@tailwindcss/vite`, con clases utilitarias escritas inline y unas pocas clases propias (`.field`, `.btn-secondary`) en `index.css`. Paleta actual: `stone-950` + `orange-500`, nada pastel.

---

## B · Arquitectura objetivo

### B1 · Partir `App.tsx` (T1 · R05, regla FIJA) — ✅ HECHO el 2026-10-16

Refactor **sin cambio de comportamiento**: se mueven componentes, no se reescriben. El orden importa — primero esto, porque los temas (T2) necesitan que los componentes existan por separado para recibir tokens.

```
src/
├── main.tsx                    arranque
├── App.tsx                     solo providers + router  (~60 líneas)
├── theme/
│   ├── tokens.css              las 4 paletas como custom properties
│   ├── ThemeProvider.tsx       tema activo, persistencia, data-theme en <html>
│   └── ThemeSwitcher.tsx       el selector del header
├── layout/                     AppShell · SiteHeader · SiteFooter
├── pages/
│   ├── HomePage · ShopPage · ProductPage(nueva) · CheckoutPage
│   ├── OrdersPage · AboutPage(nueva) · LoginPage · RegisterPage
│   └── admin/                  AdminPage + OverviewTab · ProductsTab · OrdersTab · StoryTab
├── components/
│   ├── HeroCarousel · ProductCard · QuantityPicker(nuevo) · TagBadge(nuevo)
│   ├── CartDrawer · SupportChat · WhatsAppButton(nuevo)
│   └── ui/                     SectionHeading · InfoCard · StatCard · Field · ChoiceCard
│                               StatusPill · EmptyState · LoadingPanel · ErrorBanner · AuthLayout
├── contexts/                   AuthContext · CartContext (ya existen)
└── lib/
    ├── api/                    client.ts + un archivo por recurso
    ├── types.ts · format.ts · whatsapp.ts(nuevo)
```

Regla de corte: una página = un archivo; si pasa de 300 líneas, sus secciones salen a `components/`. Los 13 helpers de presentación que hoy viven al final de `App.tsx` van a `components/ui/` tal cual están.

**Lo que quedó realmente** (T1, verificado): el árbol de arriba es el objetivo completo; T1 movió lo que ya existía. `theme/`, `ProductPage`, `AboutPage`, `QuantityPicker`, `TagBadge`, `WhatsAppButton`, `lib/api/` por recurso y `whatsapp.ts` **siguen sin existir**: llegan con T2, T3, T6 y T7. Se sumaron, fuera de este boceto, `lib/constants.ts` y `lib/ui-types.ts`, un barrel `components/ui/index.ts`, y `admin/RecipesTab.tsx` que se jubila en T3.

### B2 · Temas (T2 · ADR-003, ADR-005)

Tres capas, de abajo hacia arriba:

1. **`tokens.css`** · un bloque por tema: `:root[data-theme="primavera"] { --color-superficie: …; --color-tinta: …; --color-acento: … }`. Nombres **semánticos**, nunca el color literal: `--color-acento`, no `--rosa-300`.
2. **Tailwind 4** lee esos tokens desde `@theme` en `index.css`, así las utilidades (`bg-superficie`, `text-tinta`) quedan atadas al tema sin duplicar paletas.
3. **`ThemeProvider`** escribe `data-theme` en `<html>`, lo persiste en `localStorage` y, la primera vez, respeta `prefers-color-scheme` para elegir entre la variante clara y la oscura de la estación.

El look pixel no usa imágenes: bordes de 3–4px sin radio (o radio de 2px), `box-shadow` dura sin blur para el biselado, `image-rendering: pixelated` donde haya que escalar algo, y tipografía pixel de Google Fonts solo en títulos y precios — el cuerpo va en una tipografía legible, porque una pixel font en párrafos largos es ilegible en celular.

### B3 · Modelo de datos (T3 · ADR-001, ADR-006, ADR-007)

```
Product            ← la entidad vendible, absorbe la receta
  price            Numeric  precio de UNA unidad (ya existe)
  unit_label       String   "unidad" | "docena" | "porción" | "kg" | lo que ella escriba
  min_qty          Integer  default 1   (el mínimo de pedido: 6 brownies)
  qty_step         Integer  default 1   (se vende de 6 en 6)
  steps            Text     la receta paso a paso, opcional (ADR-001 enmendada)
  prep_note        Text     "se encarga con 48 h de anticipación"
  allows_pickup    Boolean  default True
  allows_delivery  Boolean  default True
  ingredients      m2m → Ingredient     ← el m2m que ya existe y nadie usaba
  tags             m2m → Tag  (nuevo)
  variants         1..n → ProductVariant (nuevo, opcional: "torta 8 porciones")

Tag (nuevo)        name, slug, color_token, sort_order
                   ella las crea: "sin TACC", "vegano", "sin lactosa", "frío"

ProductVariant (nuevo)  product_id, name, price, sort_order
                   solo para lo que se vende entero con tamaños

Order              + channel  String  "whatsapp" | "mercado_pago"
                   + customer_phone  (lo pide el flujo de WhatsApp)

Recipe             se jubila (ADR-001). Su contenido migra a Product:
                   summary → description · ingredients(texto) → m2m Ingredient
                   steps → Product.steps · category/status → los que ya tiene
```

La migración de `Recipe.ingredients` es la única que no es mecánica: hoy es **texto libre** y pasa a ser filas de `Ingredient`. Se parte por líneas, se normaliza por nombre y lo que no se pueda mapear queda en `description` para que Andrea lo acomode a mano desde el panel. No se descarta nada en silencio.

**El total lo sigue calculando el servidor.** `order_service` ya recorre los items, relee `unit_price` de la DB y suma el envío desde `DELIVERY_FEE` (`order_service.py:37-62`). Eso no se toca: es el control de N3 que ya está bien y los tests lo cubren. Se le suma validar `min_qty` y `qty_step` del lado del servidor, no solo en el control del front (V4).

### B4 · Pedido por WhatsApp (T7 · ADR-002)

```
Carrito → POST /api/orders (crea la orden, el servidor fija los precios)
       → el back devuelve el texto del mensaje ya armado
       → el front abre wa.me/<telefono>?text=<encodeURIComponent(mensaje)>
       → la orden queda en "pendiente" y ella la mueve de estado desde el panel
```

El mensaje lo arma **el back**, no el front: así el texto que lee ella y los importes de la DB salen de la misma fuente y no pueden divergir. El número de WhatsApp sale de env (`WHATSAPP_PHONE`), no del código.

Mercado Pago queda intacto detrás de `PAYMENTS_ENABLED` (default `false`). Cuando haya credenciales se prende y los dos caminos conviven sin tocar el modelo.

### B5 · Lo que se va

- `front/Andres_Bakery/api/*.js` — 13 archivos, 316 líneas, cero referencias desde `src/`.
- `stripe==8.7.0` de `requirements.txt` — no se importa en ningún lado; los pagos van por `urllib` directo a la API de Mercado Pago.
- `Recipe` + `routes/recipes.py` + `recipesApi` — después de migrar su contenido (ADR-001).
- El `DELIVERY_FEE = 2500` hardcodeado en `App.tsx:62` — pasa a venir del back (C4).
