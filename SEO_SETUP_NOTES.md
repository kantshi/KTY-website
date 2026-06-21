# SEO setup added for KTY Autopart

Added on 2026-06-21:

- `sitemap.xml` at the project root with 238 URLs:
  - Homepage
  - About page
  - 236 product detail URLs from `autoparts/products.js`
- `robots.txt` at the project root pointing Google to the sitemap.
- Canonical and index/follow meta tags for homepage and about page.
- Noindex tags for cart/checkout pages so Google focuses on public catalog pages.
- Product page JavaScript now updates title, meta description, and canonical URL per product ID.

After deploying to GitHub Pages, check these URLs:

- https://ktyautopart.com/robots.txt
- https://ktyautopart.com/sitemap.xml

Then submit `https://ktyautopart.com/sitemap.xml` in Google Search Console.
