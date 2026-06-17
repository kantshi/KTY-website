# KTY-website

## AutoParts checkout QR payment proof workflow

The `autoparts` app now uses QR-only checkout:

- Customer scans your QR and pays outside the website
- Customer uploads payment proof image in checkout
- Backend emails **two attachments** to `ktyautopart@gmail.com` (or `INVENTORY_EMAIL`):
  - payment proof image
  - shipping + product detail PDF (inventory reference)
- `GET /api/orders/:orderId/status` reports submission/email status

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
- optional: `INVENTORY_EMAIL`, `MAIL_FROM`, `BASE_URL`, `MAX_PROOF_IMAGE_MB`

> For local dry-runs without real email, set `TEST_EMAIL_TRANSPORT=true`.

### 3) Run the app

```bash
cd autoparts
npm start
```

Then open: `http://localhost:3000/checkout.html`

### 4) Test QR proof flow through checkout

1. Open `http://localhost:3000/checkout.html`
2. Fill shipping details
3. Upload an image as payment proof
4. Submit
5. `checkout-success.html` shows `Pending admin review` once email dispatch is complete
6. Admin inbox receives proof image + shipping PDF attachment

### 5) Manual smoke test (local/dev)

With server running:

```bash
cd autoparts
npm run smoke:test-payment
```

Expected result: response contains `{ ok: true, orderId, emailSentTo, ... }`.

## Bulk import products from spreadsheet + SKU image prefix matching

If you upload many products, you can import from Excel/CSV using:

```bash
cd autoparts
npm run import:products -- --source "/absolute/or/relative/path/to/products.xlsx"
```

Optional arguments:

- `--sheet Sheet1` (or sheet number like `--sheet 1`)
- `--output /workspace/autoparts/products.js`
- `--imagesDir /workspace/autoparts/images`
- `--brand "Toyota"` (default for new products)
- `--part "Air Hose"` (default for new products)
- `--stock 50` (default for new products)
- `--description "Default description text"`
- `--dry-run` (preview summary without writing file)

Spreadsheet mapping used by importer:

- Column A -> `sku`
- Column B -> `name`
- Column I -> `price`
- Column J -> `shopee`
- Column K -> `tiktok`

Image matching rule:

- Put files inside `autoparts/images/`
- Any file that starts with SKU basename is attached to that product
- Example SKU `TT-602` will match:
  - `TT-602.png`
  - `TT-602_2.jpg`
  - `TT-602_3.webp`
  - `TT-602_m.png`