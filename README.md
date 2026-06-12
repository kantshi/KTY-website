# KTY-website

## AutoParts checkout payment + verified paid status workflow

The `autoparts` app now tracks order payment status in backend storage and marks orders as paid only after a verified Stripe webhook:

- `POST /api/orders/start-checkout` -> creates a `pending_payment` order and Stripe Checkout session
- `POST /api/stripe/webhook` -> verifies Stripe signature and updates order to `paid`
- `GET /api/orders/:orderId/status` -> returns current payment/email status
- After paid status is verified, backend generates a PDF with shipping + product details and emails `ktyautopart@gmail.com` (or `INVENTORY_EMAIL`)

### 1) Install dependencies

```bash
cd autoparts
npm install
```

### 2) Configure SMTP + Stripe

Copy `.env.example` values into your deployment environment:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- optional: `INVENTORY_EMAIL`, `MAIL_FROM`, `BASE_URL`

> For local dry-runs without real email, set `TEST_EMAIL_TRANSPORT=true`.
>
> For local webhook testing, use Stripe CLI and copy its webhook secret into `STRIPE_WEBHOOK_SECRET`.

### 3) Run the app

```bash
cd autoparts
npm start
```

Then open: `http://localhost:3000/checkout.html`

### 4) Listen to Stripe webhooks locally (recommended)

In another terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` secret printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET`.

### 5) Test paid flow through checkout

1. Open `http://localhost:3000/checkout.html`
2. Submit checkout form
3. Pay in Stripe hosted page (test mode)
4. Return to `checkout-success.html` where status polling shows `Paid (verified)` once webhook arrives
5. Inventory email with attached PDF is sent automatically after paid verification

### 6) Manual smoke test (no Stripe, local/dev only)

With server running:

```bash
cd autoparts
npm run smoke:test-payment
```

Expected result: response contains `{ ok: true, orderId, emailSentTo, ... }`.