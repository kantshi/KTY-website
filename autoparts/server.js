const express = require("express");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const Stripe = require("stripe");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const INVENTORY_EMAIL = process.env.INVENTORY_EMAIL || "ktyautopart@gmail.com";
const MAIL_FROM = process.env.MAIL_FROM || "AutoParts Hub <no-reply@autopartshub.my>";
const TEST_EMAIL_TRANSPORT = process.env.TEST_EMAIL_TRANSPORT === "true";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

ensureOrdersStore();
const transport = createTransport();

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send("Stripe webhook is not configured.");
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).send("Missing stripe-signature header.");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error.message);
    return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await markOrderPaidFromStripeSession(event.data.object);
    } else if (event.type === "checkout.session.async_payment_failed") {
      updateOrderByStripeSession(event.data.object.id, (order) => ({
        ...order,
        status: "payment_failed",
        updatedAt: new Date().toISOString()
      }));
    } else if (event.type === "checkout.session.expired") {
      updateOrderByStripeSession(event.data.object.id, (order) => ({
        ...order,
        status: "payment_expired",
        updatedAt: new Date().toISOString()
      }));
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return res.status(500).send("Webhook handler failed.");
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    stripeConfigured: Boolean(stripe),
    webhookConfigured: Boolean(STRIPE_WEBHOOK_SECRET),
    testEmailMode: TEST_EMAIL_TRANSPORT
  });
});

app.post("/api/orders/start-checkout", async (req, res) => {
  const validationError = validateCheckoutPayload(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  const order = createOrderRecord(req.body);
  saveOrder(order);

  if (order.paymentMethod === "cod") {
    updateOrder(order.orderId, (existing) => ({
      ...existing,
      status: "pending_cod",
      updatedAt: new Date().toISOString()
    }));

    return res.json({
      ok: true,
      orderId: order.orderId,
      status: "pending_cod",
      redirectUrl: `${BASE_URL}/checkout-success.html?orderId=${encodeURIComponent(order.orderId)}`
    });
  }

  if (!stripe) {
    return res.status(503).json({
      ok: false,
      error: "Online payment is not configured yet. Set STRIPE_SECRET_KEY."
    });
  }

  try {
    const session = await createStripeCheckoutSession(order);
    updateOrder(order.orderId, (existing) => ({
      ...existing,
      stripeSessionId: session.id,
      status: "awaiting_gateway_payment",
      updatedAt: new Date().toISOString()
    }));

    return res.json({
      ok: true,
      orderId: order.orderId,
      status: "pending_payment",
      checkoutUrl: session.url
    });
  } catch (error) {
    console.error("Stripe session creation failed:", error);
    updateOrder(order.orderId, (existing) => ({
      ...existing,
      status: "payment_setup_failed",
      paymentError: error.message,
      updatedAt: new Date().toISOString()
    }));
    return res.status(500).json({
      ok: false,
      error: "Unable to initialize payment. Please try again."
    });
  }
});

app.get("/api/orders/:orderId/status", (req, res) => {
  const order = getOrder(req.params.orderId);
  if (!order) {
    return res.status(404).json({ ok: false, error: "Order not found." });
  }

  return res.json({
    ok: true,
    order: {
      orderId: order.orderId,
      status: order.status,
      paymentMethod: order.paymentMethod,
      total: order.totals.total,
      paidAt: order.paidAt || null,
      emailSentAt: order.emailSentAt || null,
      emailStatus: order.emailStatus || "pending",
      updatedAt: order.updatedAt
    }
  });
});

// Manual endpoint for local smoke tests (simulates gateway-confirmed payment).
app.post("/api/orders/confirm", async (req, res) => {
  const validationError = validateOrderPayload(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  try {
    const order = {
      ...req.body,
      status: "paid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    };
    saveOrder(order);

    const info = await sendPaidOrderEmail(order);
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
  console.log(`AutoParts server listening on ${BASE_URL}`);
});

function money(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

function requiredShippingField(shipping, key) {
  return shipping && typeof shipping[key] === "string" && shipping[key].trim().length > 0;
}

function validateCheckoutPayload(body) {
  if (!body || typeof body !== "object") return "Invalid JSON payload.";
  if (!Array.isArray(body.items) || body.items.length === 0) return "At least one item is required.";
  if (!body.shipping || typeof body.shipping !== "object") return "shipping details are required.";
  if (!body.totals || typeof body.totals !== "object") return "totals are required.";
  if (!body.paymentMethod || typeof body.paymentMethod !== "string") return "paymentMethod is required.";

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

function validateOrderPayload(body) {
  if (!body || typeof body !== "object") return "Invalid JSON payload.";
  if (!body.orderId || typeof body.orderId !== "string") return "orderId is required.";
  return validateCheckoutPayload(body);
}

function createOrderRecord(payload) {
  return {
    orderId: generateOrderId(),
    paymentMethod: payload.paymentMethod,
    shipping: payload.shipping,
    items: payload.items,
    totals: payload.totals,
    status: "pending_payment",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    emailStatus: "pending"
  };
}

function generateOrderId() {
  return `AP${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

async function createStripeCheckoutSession(order) {
  const shippingCharge = Number(order.totals.shipping || 0);
  const lineItems = order.items.map((item) => ({
    quantity: Number(item.qty),
    price_data: {
      currency: "myr",
      unit_amount: Math.round(Number(item.price) * 100),
      product_data: {
        name: item.name,
        metadata: {
          sku: item.sku ? String(item.sku) : "N/A"
        }
      }
    }
  }));

  if (shippingCharge > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "myr",
        unit_amount: Math.round(shippingCharge * 100),
        product_data: { name: "Shipping Charge" }
      }
    });
  }

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.shipping.email,
    line_items: lineItems,
    success_url: `${BASE_URL}/checkout-success.html?orderId=${encodeURIComponent(order.orderId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/checkout.html?cancelled=1&orderId=${encodeURIComponent(order.orderId)}`,
    metadata: {
      orderId: order.orderId,
      paymentMethodRequested: order.paymentMethod
    }
  });
}

async function markOrderPaidFromStripeSession(session) {
  if (session.payment_status !== "paid") {
    return;
  }

  const orderIdFromMetadata = session.metadata && session.metadata.orderId;
  const order = orderIdFromMetadata ? getOrder(orderIdFromMetadata) : getOrderByStripeSessionId(session.id);
  if (!order) {
    console.warn("No matching order found for Stripe session:", session.id);
    return;
  }

  const orderId = order.orderId;
  updateOrder(orderId, (existing) => ({
    ...existing,
    status: "paid",
    paidAt: existing.paidAt || new Date().toISOString(),
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    updatedAt: new Date().toISOString()
  }));

  const latest = getOrder(orderId);
  if (!latest || latest.emailStatus === "sent" || latest.emailStatus === "sending") {
    return;
  }

  updateOrder(orderId, (existing) => ({
    ...existing,
    emailStatus: "sending",
    updatedAt: new Date().toISOString()
  }));

  try {
    const info = await sendPaidOrderEmail(getOrder(orderId));
    updateOrder(orderId, (existing) => ({
      ...existing,
      emailStatus: "sent",
      emailSentAt: new Date().toISOString(),
      emailMessageId: info.messageId || null,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    updateOrder(orderId, (existing) => ({
      ...existing,
      emailStatus: "failed",
      emailError: error.message,
      updatedAt: new Date().toISOString()
    }));
    throw error;
  }
}

function updateOrderByStripeSession(sessionId, updater) {
  const orders = readOrders();
  const index = orders.findIndex((order) => order.stripeSessionId === sessionId);
  if (index < 0) return null;
  const updated = updater(orders[index]);
  orders[index] = updated;
  writeOrders(orders);
  return updated;
}

function getOrderByStripeSessionId(sessionId) {
  return readOrders().find((order) => order.stripeSessionId === sessionId) || null;
}

function ensureOrdersStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "[]", "utf8");
  }
}

function readOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}

function saveOrder(order) {
  const orders = readOrders();
  const existingIndex = orders.findIndex((entry) => entry.orderId === order.orderId);
  if (existingIndex >= 0) {
    orders[existingIndex] = order;
  } else {
    orders.push(order);
  }
  writeOrders(orders);
}

function getOrder(orderId) {
  return readOrders().find((order) => order.orderId === orderId) || null;
}

function updateOrder(orderId, updater) {
  const orders = readOrders();
  const index = orders.findIndex((entry) => entry.orderId === orderId);
  if (index < 0) return null;
  const updated = updater(orders[index]);
  orders[index] = updated;
  writeOrders(orders);
  return updated;
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

async function sendPaidOrderEmail(order) {
  const pdf = await createPdfBuffer(order);
  return transport.sendMail({
    from: MAIL_FROM,
    to: INVENTORY_EMAIL,
    subject: `Paid Order ${order.orderId} - Shipping & Inventory Slip`,
    text: [
      "A customer payment has been verified by the payment gateway webhook.",
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
}
