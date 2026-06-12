const payload = {
  orderId: `TEST${Date.now()}`,
  paymentMethod: "fpx",
  shipping: {
    name: "Smoke Test Customer",
    phone: "0123456789",
    email: "customer@example.com",
    address: "123 Test Street",
    city: "Kuala Lumpur",
    postcode: "50000",
    state: "Kuala Lumpur"
  },
  items: [
    {
      id: 1,
      sku: "TT-601",
      name: "Air Hose Toyota MIGHTY-X",
      qty: 2,
      price: 225,
      lineTotal: 450
    }
  ],
  totals: {
    subtotal: 450,
    shipping: 12,
    total: 462
  }
};

async function run() {
  const baseUrl = process.env.PAYMENT_API_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/orders/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Smoke test failed (${response.status}): ${JSON.stringify(body)}`);
  }

  console.log("Smoke test passed:", body);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
