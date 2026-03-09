# Backend Andres Bakery (Flask)

Backend API para la pagina de reposteria. Incluye autenticacion JWT, catalogo de productos, ordenes con datos de entrega, envio de correos y checkout con Mercado Pago.

## Instalacion

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Variables de entorno

- `DATABASE_URL` (default: `sqlite:///bakery.db`)
- `JWT_SECRET_KEY`
- `ADMIN_EMAIL` (default: `admin@bakery.local`)
- `ADMIN_PASSWORD` (default: `admin123`)
- `ADMIN_NAME` (default: `Admin`)
- `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USE_TLS`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_DEFAULT_SENDER`
- `SUPPORT_EMAIL` (default: `support@bakery.local`)
- `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`
- `PAYMENT_CURRENCY`
- `BACKEND_PUBLIC_URL`
- `FRONTEND_ORIGIN`
  - acepta uno o varios origins separados por coma
  - ejemplo: `http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174`
- `DELIVERY_ZONE_NAME`, `DELIVERY_FEE`, `PICKUP_ADDRESS`

## Levantar el servidor

```bash
python app.py
```

Tambien podes usar:

```bash
python -m backend.app
```

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products` (admin)
- `POST /api/orders`
- `GET /api/orders`
- `POST /api/payments/checkout`
- `POST /api/payments/webhook`
- `POST /api/contact`

Al iniciar la app se crea automaticamente el usuario admin usando las variables de entorno correspondientes y, si el catalogo esta vacio, se siembran productos y recetas iniciales para el storefront.
