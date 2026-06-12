const express = require("express");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const INVENTORY_EMAIL = process.env.INVENTORY_EMAIL || "ktyautopart@gmail.com";
const MAIL_FROM = process.env.MAIL_FROM || "AutoParts Hub <no-reply@autopartshub.my>";
const TEST_EMAIL_TRANSPORT = process.env.TEST_EMAIL_TRANSPORT === "true";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

function money(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function requiredShippingField(shipping, key) {
  return shipping && typeof shipping[key] === "string" && shipping[key].trim().length > 0;
}

function validateOrderPayload(body) {
  if (!body || typeof body !== "object") return "Invalid JSON payload.";
  if (!body.orderId || typeof body.orderId !== "string") return "orderId is required.";
  if (!Array.isArray(body.items) || body.items.length === 0) return "At least one item is required.";
  if (!body.shipping || typeof body.shipping !== "object") return "shipping details are required.";
  if (!body.totals || typeof body.totals !== "object") return "totals are required.";

  const requiredShipping = ["name", "phone", "email", "address", "city", "postcode", "state"];
  for (const key of requiredShipping) {
    if (!requiredShippingField(body.shipping, key)) {
      return `shipping.${key} is required.`;
    }
  }

  for (const item of body.items) {
    if (!item || typeof item !== "object") return "Invalid item in items array.";
    if (!item.name || typeof item.name !== "string") return "Each item.name is required.";
    if (!Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0) return "Each item.qty must be greater than 0.";
    if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) return "Each item.price must be a valid number.";
  }

  return null;
}

function createPdfBuffer(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Paid Order - Shipping & Inventory Slip");
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Order ID: ${order.orderId}`);
    doc.text(`Payment Method: ${order.paymentMethod || "N/A"}`);
    doc.text(`Generated At: ${new Date().toISOString()}`);
    doc.moveDown();

    doc.fontSize(14).text("Shipping Details");
    doc.fontSize(11);
    doc.text(`Name: ${order.shipping.name}`);
    doc.text(`Phone: ${order.shipping.phone}`);
    doc.text(`Email: ${order.shipping.email}`);
    doc.text(`Address: ${order.shipping.address}`);
    doc.text(`City: ${order.shipping.city}`);
    doc.text(`Postcode: ${order.shipping.postcode}`);
    doc.text(`State: ${order.shipping.state}`);
    doc.moveDown();

    doc.fontSize(14).text("Product Details (Inventory Reference)");
    doc.moveDown(0.5);
    doc.fontSize(10).text("SKU", 48, doc.y, { continued: true, width: 110 });
    doc.text("Product", { continued: true, width: 210 });
    doc.text("Qty", { continued: true, width: 40, align: "right" });
    doc.text("Price", { continued: true, width: 70, align: "right" });
    doc.text("Line Total", { width: 70, align: "right" });
    doc.moveDown(0.3);
    doc.moveTo(48, doc.y).lineTo(548, doc.y).stroke();
    doc.moveDown(0.4);

    order.items.forEach((item) => {
      const sku = item.sku && String(item.sku).trim().length > 0 ? item.sku : "N/A";
      const lineTotal = Number(item.lineTotal || Number(item.qty) * Number(item.price));
      doc.fontSize(10).text(sku, 48, doc.y, { continued: true, width: 110 });
      doc.text(item.name, { continued: true, width: 210 });
      doc.text(String(item.qty), { continued: true, width: 40, align: "right" });
      doc.text(money(item.price), { continued: true, width: 70, align: "right" });
      doc.text(money(lineTotal), { width: 70, align: "right" });
      doc.moveDown(0.2);
    });

    doc.moveDown();
    doc.fontSize(12).text(`Subtotal: ${money(order.totals.subtotal)}`, { align: "right" });
    doc.text(`Shipping: ${money(order.totals.shipping)}`, { align: "right" });
    doc.font("Helvetica-Bold").text(`Total Paid: ${money(order.totals.total)}`, { align: "right" }).font("Helvetica");

    doc.end();
  });
}

function createTransport() {
  if (TEST_EMAIL_TRANSPORT) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing SMTP config. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

const transport = createTransport();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/orders/confirm", async (req, res) => {
  const validationError = validateOrderPayload(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  try {
    const order = req.body;
    const pdf = await createPdfBuffer(order);
    const info = await transport.sendMail({
      from: MAIL_FROM,
      to: INVENTORY_EMAIL,
      subject: `Paid Order ${order.orderId} - Shipping & Inventory Slip`,
      text: [
        `A customer payment has been marked as successful.`,
        `Order ID: ${order.orderId}`,
        `Total Paid: ${money(order.totals.total)}`,
        "",
        "The PDF attachment contains shipping and product details for inventory reference."
      ].join("\n"),
      attachments: [
        {
          filename: `${order.orderId}-shipping-inventory.pdf`,
          content: pdf,
          contentType: "application/pdf"
        }
      ]
    });

    return res.json({
      ok: true,
      orderId: order.orderId,
      emailSentTo: INVENTORY_EMAIL,
      messageId: info.messageId || null,
      testMode: TEST_EMAIL_TRANSPORT
    });
  } catch (error) {
    console.error("order confirm failed:", error);
    return res.status(500).json({
      ok: false,
      error: "Unable to finalize order payment and inventory email."
    });
  }
});

app.listen(PORT, () => {
  console.log(`AutoParts server listening on http://localhost:${PORT}`);
});
