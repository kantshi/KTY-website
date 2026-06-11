let selectedBrand = "All";
let currentProduct = null;
let currentImageIndex = 0;

const CART_KEY = "autoproCart";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  return `${storeSettings.currencyLabel}${Number(value).toFixed(2)}`;
}

function getVehicleText(product) {
  return product.vehicles
    .map(vehicle => `${vehicle.make} ${vehicle.model} ${vehicle.yearStart}-${vehicle.yearEnd}`)
    .join(", ");
}

function productHasBrand(product, brand) {
  return product.vehicles.some(vehicle => vehicle.make === brand);
}

function getSearchText(product) {
  return [
    product.name,
    product.sku,
    product.brand,
    product.category,
    product.description,
    getVehicleText(product),
    ...(product.tags || [])
  ].join(" ").toLowerCase();
}

function renderBrandButtons() {
  const wrapper = document.getElementById("brand-buttons");
  if (!wrapper) return;

  const brands = ["All", ...vehicleBrands];
  wrapper.innerHTML = brands.map(brand => `
    <button
      type="button"
      class="${brand === selectedBrand ? "active" : ""}"
      onclick="filterProducts('${escapeHtml(brand)}')"
    >
      ${escapeHtml(brand)}
    </button>
  `).join("");
}

function filterProducts(brand) {
  selectedBrand = brand;
  renderBrandButtons();
  applyFilters();
}

function searchProducts() {
  applyFilters();
}

function applyFilters() {
  const grid = document.getElementById("product-grid");
  const summary = document.getElementById("catalog-summary");
  const searchTerm = document.getElementById("search")?.value.trim().toLowerCase() || "";
  if (!grid) return;

  let visibleProducts = [...products];

  if (selectedBrand !== "All") {
    visibleProducts = visibleProducts.filter(product => productHasBrand(product, selectedBrand));
  }

  if (searchTerm) {
    visibleProducts = visibleProducts.filter(product => getSearchText(product).includes(searchTerm));
  }

  if (summary) {
    summary.textContent = selectedBrand === "All"
      ? `Showing ${visibleProducts.length} products`
      : `Showing ${visibleProducts.length} ${selectedBrand} product${visibleProducts.length === 1 ? "" : "s"}`;
  }

  if (visibleProducts.length === 0) {
    grid.innerHTML = "<p class=\"empty-state\">No products found.</p>";
    return;
  }

  grid.innerHTML = visibleProducts.map(product => `
    <article class="product-card">
      <a href="product.html?id=${product.id}">
        <img src="${product.images[0]}" alt="${escapeHtml(product.name)}" loading="lazy">
      </a>
      <h3><a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a></h3>
      <p class="card-meta">${escapeHtml(product.brand)} | ${escapeHtml(product.category)} | ${escapeHtml(product.sku)}</p>
      <p class="fitment">${escapeHtml(getVehicleText(product))}</p>
      <p class="product-price">${formatMoney(product.price)}</p>
      <div class="card-actions">
        <a href="product.html?id=${product.id}" class="buy-btn">Details</a>
        <button type="button" class="buy-btn secondary" onclick="addToCart(${product.id})">Add Cart</button>
      </div>
      <div class="marketplace-row">
        <a class="marketplace-link shopee" href="${product.links.shopee}" target="_blank" rel="noopener">Shopee</a>
        <a class="marketplace-link tiktok" href="${product.links.tiktok}" target="_blank" rel="noopener">TikTok Shop</a>
      </div>
    </article>
  `).join("");
}

function getCartItems() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveCartItems(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  renderCart();
}

function getCartProducts() {
  return getCartItems()
    .map(item => {
      const product = products.find(productItem => productItem.id === item.id);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean);
}

function addToCart(productId) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;

  const items = getCartItems();
  const existing = items.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ id: product.id, quantity: 1 });
  }

  saveCartItems(items);
  toggleCart(true);
}

function updateCartQuantity(productId, quantity) {
  const items = getCartItems();
  const existing = items.find(item => item.id === Number(productId));
  if (!existing) return;

  existing.quantity = Math.max(1, Number(quantity) || 1);
  saveCartItems(items);
}

function removeFromCart(productId) {
  saveCartItems(getCartItems().filter(item => item.id !== Number(productId)));
}

function getCartTotal(cartProducts) {
  return cartProducts.reduce((total, product) => total + product.price * product.quantity, 0);
}

function renderCart() {
  const count = document.getElementById("cart-count");
  const wrapper = document.getElementById("cart-items");
  const total = document.getElementById("cart-total");
  if (!count || !wrapper || !total) return;

  const cartProducts = getCartProducts();
  count.textContent = cartProducts.reduce((sum, product) => sum + product.quantity, 0);
  total.textContent = formatMoney(getCartTotal(cartProducts));

  if (cartProducts.length === 0) {
    wrapper.innerHTML = "<p class=\"empty-cart\">Your cart is empty.</p>";
    return;
  }

  wrapper.innerHTML = cartProducts.map(product => `
    <div class="cart-item">
      <img src="${product.images[0]}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div>
        <strong>${escapeHtml(product.name)}</strong>
        <span>${formatMoney(product.price)}</span>
        <label>
          Qty
          <input type="number" min="1" value="${product.quantity}" onchange="updateCartQuantity(${product.id}, this.value)">
        </label>
      </div>
      <button type="button" onclick="removeFromCart(${product.id})" aria-label="Remove ${escapeHtml(product.name)}">&times;</button>
    </div>
  `).join("");
}

function toggleCart(forceOpen) {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("overlay");
  if (!drawer || !overlay) return;

  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !drawer.classList.contains("open");
  drawer.classList.toggle("open", shouldOpen);
  overlay.classList.toggle("open", shouldOpen);
  drawer.setAttribute("aria-hidden", String(!shouldOpen));
}

function getOrderQrUrl(orderId, amount) {
  const qrText = `${storeSettings.paymentMerchantName} | Order ${orderId} | ${formatMoney(amount)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(qrText)}`;
}

function createDemoOrder(event) {
  event.preventDefault();

  const result = document.getElementById("order-result");
  const cartProducts = getCartProducts();
  if (!result) return;

  if (cartProducts.length === 0) {
    result.hidden = false;
    result.innerHTML = "<p>Please add at least one product first.</p>";
    return;
  }

  const orderId = `AP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const total = getCartTotal(cartProducts);
  const name = document.getElementById("customer-name").value;
  const phone = document.getElementById("customer-phone").value;

  result.hidden = false;
  result.innerHTML = `
    <h3>Demo order created</h3>
    <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
    <p><strong>Customer:</strong> ${escapeHtml(name)} (${escapeHtml(phone)})</p>
    <p><strong>Status:</strong> <span class="status pending">Pending Payment</span></p>
    <img src="${getOrderQrUrl(orderId, total)}" alt="Demo QR payment code for ${escapeHtml(orderId)}">
    <p><strong>Amount:</strong> ${formatMoney(total)}</p>
    <p class="note">For production, your payment gateway webhook updates this order to Paid automatically.</p>
  `;
}

function showImage(index) {
  if (!currentProduct) return;

  currentImageIndex = (index + currentProduct.images.length) % currentProduct.images.length;
  const image = document.getElementById("main-image");
  if (image) {
    image.src = currentProduct.images[currentImageIndex];
    image.alt = currentProduct.name;
  }

  document.querySelectorAll(".thumbnail-row button").forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === currentImageIndex);
  });
}

function prevImage() {
  showImage(currentImageIndex - 1);
}

function nextImage() {
  showImage(currentImageIndex + 1);
}

function loadProductDetail() {
  const detail = document.getElementById("product-detail");
  if (!detail) return;

  const productId = Number(new URLSearchParams(window.location.search).get("id"));
  currentProduct = products.find(product => product.id === productId);

  if (!currentProduct) {
    detail.innerHTML = "<p class=\"empty-state\">Product not found. <a href=\"index.html#catalog\">Back to catalog</a></p>";
    return;
  }

  document.title = `${currentProduct.name} | ${storeSettings.name}`;
  document.getElementById("product-category").textContent = currentProduct.category;
  document.getElementById("product-name").textContent = currentProduct.name;
  document.getElementById("product-sku").textContent = `${currentProduct.brand} | SKU ${currentProduct.sku}`;
  document.getElementById("product-price").textContent = formatMoney(currentProduct.price);
  document.getElementById("product-description").textContent = currentProduct.description;
  document.getElementById("shopee-link").href = currentProduct.links.shopee;
  document.getElementById("tiktok-link").href = currentProduct.links.tiktok;
  document.getElementById("add-cart-button").onclick = () => addToCart(currentProduct.id);

  document.getElementById("vehicle-list").innerHTML = currentProduct.vehicles
    .map(vehicle => `<li>${escapeHtml(`${vehicle.make} ${vehicle.model} ${vehicle.yearStart}-${vehicle.yearEnd}`)}</li>`)
    .join("");

  document.getElementById("spec-list").innerHTML = Object.entries(currentProduct.specs)
    .map(([label, value]) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `)
    .join("");

  const thumbnails = document.getElementById("thumbnail-row");
  thumbnails.innerHTML = currentProduct.images.map((image, index) => `
    <button type="button" onclick="showImage(${index})" aria-label="Show image ${index + 1}">
      <img src="${image}" alt="${escapeHtml(currentProduct.name)} thumbnail ${index + 1}" loading="lazy">
    </button>
  `).join("");

  showImage(0);
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") toggleCart(false);
});

document.addEventListener("DOMContentLoaded", () => {
  renderBrandButtons();
  applyFilters();
  renderCart();
  loadProductDetail();
});
