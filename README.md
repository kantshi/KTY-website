# AutoPro Parts Website

Modern static auto-parts catalog:

- Top navigation tabs for Catalog and Company Information
- Separate `company.html` page for company details and payment-confirmation design
- Brand/search filter bar above the product grid with more whitespace
- Vehicle brand catalog for Toyota, Nissan, Mazda, Isuzu, Mitsubishi, Hino, Suzuki, Ford, Chevrolet, and Honda
- Brand and keyword filtering
- Modern product grid cards with image, price, stock, compatible vehicles, View Details button, and cart button
- Separate product detail page with image gallery, compatibility, specifications, Shopee link, and TikTok Shop link
- Shopping cart with quantity controls
- Demo checkout that creates an order ID and QR payment reference
- Company Information page explaining how real paid-order confirmation should work

## Customize before launch

1. Replace demo contact details in `index.html`, `product.html`, and `products.js`.
2. Replace product images, prices, SKU values, OEM references, stock counts, and warranty details in `products.js`.
3. Replace Shopee and TikTok Shop demo URLs with your real listing URLs.
4. Replace the demo QR flow with an official payment gateway that creates a unique QR for each order.
5. Add a backend checkout with order records, payment records, gateway webhooks, admin notifications, stock sync, invoices, and delivery tracking.

## Real payment confirmation design

A static website cannot reliably know if a customer has paid. For production:

1. Save the order in a database with status `Pending Payment`.
2. Ask the payment gateway to generate a QR code for that order ID and exact amount.
3. Receive the gateway webhook after successful payment.
4. Update the order status to `Paid`.
5. Notify the seller and customer by dashboard, email, or WhatsApp.

Open `index.html` in a browser to preview the site.