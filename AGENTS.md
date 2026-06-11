# KTY-website ("My Shop")

A zero-dependency static e-commerce storefront demo. Plain HTML/CSS/vanilla JS — no package manager, no build step, no backend, no database.

- `index.html` — shop landing page with product grid, category filter buttons, and live search.
- `product.html` — product detail page; reads `?id=` from the URL and shows name/price/description plus an image gallery.
- `products.js` — hardcoded product data array (the "data source").
- `script.js` — homepage grid rendering, category filtering, and search.
- `style.css` — all styling.

## Cursor Cloud specific instructions

- There are **no dependencies to install** and **no build step**. Development = serving the static files.
- Run the site (dev) with any static file server from the repo root, e.g. `python3 -m http.server 8000` (both `python3` and `node` are available), then open `http://localhost:8000/index.html`.
- There is no lint or automated test setup in this repo.
- Product images (`logo.png`, `images/*.jpg`) are **not present** in the repo, so images render as broken placeholders. This is expected; it does not indicate a setup problem. Filtering, search, and navigation still work fully.
