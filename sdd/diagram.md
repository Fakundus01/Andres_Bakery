# diagram.md · Andres Bakery

**Versión:** 0.1.0 · **Última actualización:** 2026-10-16

## 1 · Arquitectura

```mermaid
flowchart TB
    subgraph nav["Navegador"]
        FR["React 19 + TS + Vite<br/>HashRouter · Tailwind 4"]
        TH["ThemeProvider<br/>data-theme + localStorage"]
        CT["CartContext · AuthContext"]
    end

    subgraph back["Flask (puerto 5000)"]
        RT["routes/ · 9 blueprints<br/>solo parsean y delegan"]
        SV["services/<br/>catalog · order · payment<br/>auth · contact · site · bootstrap"]
        MD["models.py · SQLAlchemy"]
    end

    DB[("SQLite<br/>instance/bakery.db")]
    WA["wa.me<br/>mensaje prellenado"]
    MP["API Mercado Pago<br/>(apagada: PAYMENTS_ENABLED=false)"]
    SMTP["SMTP"]

    FR -->|"fetch + Bearer"| RT
    TH --> FR
    CT --> FR
    RT --> SV
    SV --> MD
    MD --> DB
    FR -.->|"abre con el texto del back"| WA
    SV -.->|"urllib, si se prende"| MP
    SV -->|"avisos"| SMTP
    MP -.->|"webhook"| RT
```

## 2 · Flujo del pedido por WhatsApp (ADR-002)

```mermaid
sequenceDiagram
    actor C as Cliente
    participant F as Front
    participant B as Back
    participant D as SQLite
    actor R as La repostera

    C->>F: elige 6 brownies (min_qty=6)
    F->>F: total en vivo = 6 × precio
    C->>F: "Pedir por WhatsApp"
    F->>B: POST /api/orders {items, entrega}
    B->>D: relee precios, valida min_qty/qty_step
    B->>D: crea Order (channel="whatsapp")
    B-->>F: {order_id, total}
    F->>B: POST /api/orders/{id}/whatsapp
    B-->>F: {phone, message} ← importes de la DB
    F->>C: abre wa.me/<phone>?text=<message>
    C->>R: manda el mensaje ya armado
    R->>B: mueve el estado desde el panel
```

El mensaje lo arma el **back** a propósito: el texto que lee ella y los importes de la DB salen de la misma fuente y no pueden divergir.

## 3 · Modelo de datos objetivo (T3)

```mermaid
erDiagram
    USER ||--o{ ORDER : hace
    ORDER ||--|{ ORDER_ITEM : contiene
    ORDER ||--o| ORDER_DELIVERY : tiene
    ORDER ||--o{ PAYMENT : registra
    PRODUCT ||--o{ ORDER_ITEM : aparece_en
    PRODUCT }o--o{ INGREDIENT : lleva
    PRODUCT }o--o{ TAG : etiquetada
    PRODUCT ||--o{ PRODUCT_VARIANT : se_vende_como

    PRODUCT {
        string name
        string slug
        numeric price "precio de UNA unit_label"
        string unit_label "unidad|docena|porción|kg"
        int min_qty
        int qty_step
        text steps "receta paso a paso, opcional"
        text prep_note
        bool allows_pickup
        bool allows_delivery
        bool available
    }
    TAG {
        string name "sin TACC, vegano…"
        string slug
        string color_token
    }
    PRODUCT_VARIANT {
        string name "Torta 8 porciones"
        numeric price
    }
```

`RECIPE` no está en el diagrama: se jubila por ADR-001. `INGREDIENT` y su m2m con `PRODUCT` **ya existen** en el código — hoy sin uso.
