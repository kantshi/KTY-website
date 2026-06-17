const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { ThaiQRPaymentBuilder } = require("thai-qr-payment");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const INVENTORY_EMAIL = process.env.INVENTORY_EMAIL || "ktyautopart@gmail.com";
const MAIL_FROM = process.env.MAIL_FROM || "AutoParts Hub <no-reply@autopartshub.my>";
const TEST_EMAIL_TRANSPORT = process.env.TEST_EMAIL_TRANSPORT === "true";
const MAX_PROOF_IMAGE_MB = Number(process.env.MAX_PROOF_IMAGE_MB || 8);
const PROMPTPAY_MOBILE = normalizePromptPayMobile(process.env.QR_PROMPTPAY_MOBILE || "0827401051");
const PROMPTPAY_DISPLAY = formatThaiMobileDisplay(PROMPTPAY_MOBILE);

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const UPLOADS_DIR = path.join(__dirname, "uploads", "payment-proofs");

ensureLocalStores();
const transport = createTransport();

const proofUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, UPLOADS_DIR),
    filename: (_req, file, callback) => {
      const rawExt = path.extname(file.originalname || "").toLowerCase();
      const ext = rawExt || mimeToExt(file.mimetype);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      callback(null, name);
    }
  }),
  limits: {
    fileSize: MAX_PROOF_IMAGE_MB * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      callback(new Error("Payment proof must be an image file."));
      return;
    }
    callback(null, true);
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    paymentMode: "qr-proof-upload",
    paymentQrType: "promptpay",
    paymentQrRecipient: PROMPTPAY_DISPLAY,
    maxProofImageMb: MAX_PROOF_IMAGE_MB,
    testEmailMode: TEST_EMAIL_TRANSPORT
  });
});

app.get("/api/payments/qr", async (req, res) => {
  const amount = Number(req.query.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, error: "amount must be a positive number." });
  }

  const roundedAmount = Math.round(amount * 100) / 100;
  try {
    const payload = new ThaiQRPaymentBuilder()
      .promptpay(PROMPTPAY_MOBILE, "mobile")
      .amount(roundedAmount)
      .build();
    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: "H"
    });

    return res.json({
      ok: true,
      account: {
        bank: "PromptPay",
        accountNumber: PROMPTPAY_DISPLAY
      },
      amount: roundedAmount,
      qrDataUrl
    });
  } catch (error) {
    console.error("Failed to generate payment QR:", error);
    return res.status(500).json({ ok: false, error: "Could not generate payment QR code." });
  }
});

app.post("/api/orders/submit-proof", (req, res) => {
  proofUpload.single("paymentProof")(req, res, async (uploadError) => {
    if (uploadError) {
      if (uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          ok: false,
          error: `Payment proof image is too large. Maximum allowed is ${MAX_PROOF_IMAGE_MB}MB.`
        });
      }
      return res.status(400).json({
        ok: false,
        error: uploadError.message || "Invalid payment proof upload."
      });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Payment proof image is required." });
    }

    let payload;
    try {
      payload = JSON.parse(req.body.orderData || "{}");
    } catch (_error) {
      return res.status(400).json({ ok: false, error: "Invalid orderData JSON payload." });
    }

    const validationError = validateOrderPayload(payload);
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    const order = createOrderRecord(payload, req.file);
    saveOrder(order);

    updateOrder(order.orderId, (existing) => ({
      ...existing,
      emailStatus: "sending",
      updatedAt: new Date().toISOString()
    }));

    try {
      const info = await sendQrProofOrderEmail(order);
      updateOrder(order.orderId, (existing) => ({
        ...existing,
        status: "pending_manual_review",
        emailStatus: "sent",
        emailSentAt: new Date().toISOString(),
        emailMessageId: info.messageId || null,
        updatedAt: new Date().toISOString()
      }));

      return res.json({
        ok: true,
        orderId: order.orderId,
        status: "pending_manual_review",
        emailSentTo: INVENTORY_EMAIL,
        redirectUrl: `${BASE_URL}/checkout-success.html?orderId=${encodeURIComponent(order.orderId)}`
      });
    } catch (emailError) {
      console.error("QR payment proof email failed:", emailError);
      updateOrder(order.orderId, (existing) => ({
        ...existing,
        status: "proof_submitted_email_failed",
        emailStatus: "failed",
        emailError: emailError.message,
        updatedAt: new Date().toISOString()
      }));

      return res.status(500).json({
        ok: false,
        orderId: order.orderId,
        error: "Payment proof was received but sending the notification email failed."
      });
    }
  });
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
      emailStatus: order.emailStatus || "pending",
      emailSentAt: order.emailSentAt || null,
      proofUploadedAt: order.paymentProof.uploadedAt,
      transactionReference: order.transactionReference || "",
      updatedAt: order.updatedAt
    }
  });
});

app.listen(PORT, () => {
  console.log(`AutoParts QR payment server listening on ${BASE_URL}`);
});

function validateOrderPayload(body) {
  if (!body || typeof body !== "object") return "Invalid order payload.";
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

function requiredShippingField(shipping, key) {
  return shipping && typeof shipping[key] === "string" && shipping[key].trim().length > 0;
}

function createOrderRecord(payload, proofFile) {
  return {
    orderId: generateOrderId(),
    paymentMethod: "qr_transfer",
    status: "proof_submitted",
    shipping: payload.shipping,
    items: payload.items,
    totals: payload.totals,
    transactionReference: String(payload.transactionReference || "").trim(),
    paymentProof: {
      originalName: proofFile.originalname,
      storedName: proofFile.filename,
      mimeType: proofFile.mimetype,
      size: proofFile.size,
      relativePath: path.join("uploads", "payment-proofs", proofFile.filename),
      uploadedAt: new Date().toISOString()
    },
    emailStatus: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function generateOrderId() {
  return `AP${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

function ensureLocalStores() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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

    doc.fontSize(18).text("QR Payment Order - Shipping & Inventory Slip");
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Order ID: ${order.orderId}`);
    doc.text(`Payment Method: QR Bank Transfer`);
    doc.text(`Transaction Reference: ${order.transactionReference || "N/A"}`);
    doc.text(`Proof Uploaded At: ${order.paymentProof.uploadedAt}`);
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
    doc.font("Helvetica-Bold").text(`Total: ${money(order.totals.total)}`, { align: "right" }).font("Helvetica");

    doc.end();
  });
}

function money(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
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

async function sendQrProofOrderEmail(order) {
  const pdf = await createPdfBuffer(order);
  const proofPath = path.join(__dirname, order.paymentProof.relativePath);
  return transport.sendMail({
    from: MAIL_FROM,
    to: INVENTORY_EMAIL,
    subject: `QR Payment Proof Submitted - ${order.orderId}`,
    text: [
      "A customer submitted QR payment proof.",
      `Order ID: ${order.orderId}`,
      `Transaction Reference: ${order.transactionReference || "N/A"}`,
      `Total: ${money(order.totals.total)}`,
      "",
      "Attachments:",
      "- Payment proof image",
      "- Shipping and product detail PDF for inventory reference"
    ].join("\n"),
    attachments: [
      {
        filename: `${order.orderId}-payment-proof${path.extname(order.paymentProof.originalName || "") || mimeToExt(order.paymentProof.mimeType)}`,
        path: proofPath,
        contentType: order.paymentProof.mimeType
      },
      {
        filename: `${order.orderId}-shipping-inventory.pdf`,
        content: pdf,
        contentType: "application/pdf"
      }
    ]
  });
}

function mimeToExt(mimeType) {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif"
  };
  return map[mimeType] || ".img";
}

function normalizePromptPayMobile(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith("66")) {
    return `0${digits.slice(2)}`;
  }
  throw new Error("QR_PROMPTPAY_MOBILE is missing or invalid.");
}

function formatThaiMobileDisplay(mobile) {
  return `${mobile.slice(0, 3)}-${mobile.slice(3, 6)}-${mobile.slice(6)}`;
}
