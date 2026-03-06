# Backend Andres Bakery (Flask)

Backend API para la página de repostería. Incluye autenticación JWT, catálogo de productos, órdenes con datos de entrega, envío de correos y checkout con Mercado Pago.

## Instalación

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
- `DELIVERY_ZONE_NAME`, `DELIVERY_FEE`, `PICKUP_ADDRESS`

## Levantar el servidor

```bash
python app.py
```

También podés usar:

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

Al iniciar la app se crea automáticamente el usuario admin usando las variables de entorno correspondientes y, si el catálogo está vacío, se siembran productos y recetas iniciales para el storefront.
