# KTY-website

## AutoParts checkout payment email workflow

The `autoparts` app now includes a backend payment confirmation endpoint:

- `POST /api/orders/confirm`
- Generates a PDF with shipping + product details
- Emails the PDF to `ktyautopart@gmail.com` (or `INVENTORY_EMAIL` override)

### 1) Install dependencies

```bash
cd autoparts
npm install
```

### 2) Configure SMTP

Copy `.env.example` values into your deployment environment:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- optional: `INVENTORY_EMAIL`, `MAIL_FROM`

> For local dry-runs without real email, set `TEST_EMAIL_TRANSPORT=true`.

### 3) Run the app

```bash
cd autoparts
TEST_EMAIL_TRANSPORT=true npm start
```

Then open: `http://localhost:3000/checkout.html`

### 4) Smoke test payment API

With server running:

```bash
cd autoparts
npm run smoke:test-payment
```

Expected result: response contains `{ ok: true, orderId, emailSentTo, ... }`.