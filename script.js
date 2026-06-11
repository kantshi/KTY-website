let selectedBrand = "All";

const CART_KEY = "autoproSimpleCart";
const galleryIndexByProduct = {};

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

function productHasBrand(product, brand) {
  return product.vehicles.some(vehicle => vehicle.make === brand);
}

function getVehicleText(product) {
  return product.vehicles
    .map(vehicle => `${vehicle.make} ${vehicle.model} ${vehicle.yearStart}-${vehicle.yearEnd}`)
    .join(", ");
}

function getProductSearchText(product) {
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

  const buttons = ["All", ...vehicleBrands];
  wrapper.innerHTML = buttons.map(brand => `
    <button
      type="button"
      class="${brand === selectedBrand ? "active" : ""}"
      onclick="selectBrand('${escapeHtml(brand)}')"
    >
      ${escapeHtml(brand)}
    </button>
  `).join("");
}

function selectBrand(brand) {
  selectedBrand = brand;
  renderBrandButtons();
  renderCatalog();
}

function changeProductImage(productId, direction) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;

  const currentIndex = galleryIndexByProduct[product.id] || 0;
  galleryIndexByProduct[product.id] = (currentIndex + direction + product.images.length) % product.images.length;
  renderCatalog();
}

function renderCatalog() {
  const grid = document.getElementById("product-grid");
  const summary = document.getElementById("catalog-summary");
  const searchTerm = document.getElementById("search")?.value.trim().toLowerCase() || "";
  if (!grid || !summary) return;

  let visibleProducts = [...products];

  if (selectedBrand !== "All") {
    visibleProducts = visibleProducts.filter(product => productHasBrand(product, selectedBrand));
  }

  if (searchTerm) {
    visibleProducts = visibleProducts.filter(product => getProductSearchText(product).includes(searchTerm));
  }

  summary.textContent = selectedBrand === "All"
    ? `Showing ${visibleProducts.length} products from all brands`
    : `Showing ${visibleProducts.length} ${selectedBrand} product${visibleProducts.length === 1 ? "" : "s"}`;

  if (visibleProducts.length === 0) {
    grid.innerHTML = "<p class=\"empty-state\">No products found for this brand or search.</p>";
    return;
  }

  grid.innerHTML = visibleProducts.map(product => {
    const imageIndex = galleryIndexByProduct[product.id] || 0;
    const currentImage = product.images[imageIndex];

    return `
      <article class="product-card">
        <div class="product-gallery">
          <img src="${currentImage}" alt="${escapeHtml(product.name)}" loading="lazy">
          <button class="gallery-control previous" type="button" onclick="changeProductImage(${product.id}, -1)" aria-label="Previous ${escapeHtml(product.name)} image">&#10094;</button>
          <button class="gallery-control next" type="button" onclick="changeProductImage(${product.id}, 1)" aria-label="Next ${escapeHtml(product.name)} image">&#10095;</button>
          <span class="image-count">${imageIndex + 1}/${product.images.length}</span>
        </div>

        <div class="product-body">
          <p class="product-meta">${escapeHtml(product.category)} | ${escapeHtml(product.brand)} | ${escapeHtml(product.sku)}</p>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <p class="vehicle-fit">${escapeHtml(getVehicleText(product))}</p>
          <div class="price-row">
            <strong>${formatMoney(product.price)}</strong>
            <span>${product.stock} in stock</span>
          </div>
        </div>

        <div class="product-actions">
          <a class="marketplace-link shopee" href="${product.links.shopee}" target="_blank" rel="noopener">Shopee</a>
          <a class="marketplace-link tiktok" href="${product.links.tiktok}" target="_blank" rel="noopener">TikTok Shop</a>
          <button class="cart-button" type="button" onclick="addToCart(${product.id})">Add to cart</button>
        </div>
      </article>
    `;
  }).join("");
}

function addToCart(productId) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;

  const cartItems = getCartItems();
  const existingItem = cartItems.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({ id: product.id, quantity: 1 });
  }

  saveCartItems(cartItems);
  toggleCart(true);
}

function updateCartQuantity(productId, quantity) {
  const nextQuantity = Number(quantity);
  const cartItems = getCartItems();
  const existingItem = cartItems.find(item => item.id === Number(productId));
  if (!existingItem) return;

  existingItem.quantity = Math.max(1, nextQuantity || 1);
  saveCartItems(cartItems);
}

function removeFromCart(productId) {
  saveCartItems(getCartItems().filter(item => item.id !== Number(productId)));
}

function getCartProducts() {
  return getCartItems()
    .map(item => {
      const product = products.find(productItem => productItem.id === item.id);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean);
}

function getCartTotal(cartProducts) {
  return cartProducts.reduce((total, product) => total + product.price * product.quantity, 0);
}

function renderCart() {
  const cartCount = document.getElementById("cart-count");
  const cartItemsWrapper = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  if (!cartCount || !cartItemsWrapper || !cartTotal) return;

  const cartProducts = getCartProducts();
  const totalItems = cartProducts.reduce((total, product) => total + product.quantity, 0);
  cartCount.textContent = totalItems;
  cartTotal.textContent = formatMoney(getCartTotal(cartProducts));

  if (cartProducts.length === 0) {
    cartItemsWrapper.innerHTML = "<p class=\"empty-cart\">Your cart is empty.</p>";
    return;
  }

  cartItemsWrapper.innerHTML = cartProducts.map(product => `
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

  const cartProducts = getCartProducts();
  const result = document.getElementById("order-result");
  if (!result) return;

  if (cartProducts.length === 0) {
    result.hidden = false;
    result.innerHTML = "<p>Please add at least one product to the cart before creating an order.</p>";
    return;
  }

  const orderId = `AP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const total = getCartTotal(cartProducts);
  const customerName = document.getElementById("customer-name").value;
  const customerPhone = document.getElementById("customer-phone").value;

  result.hidden = false;
  result.innerHTML = `
    <h3>Demo order created</h3>
    <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
    <p><strong>Customer:</strong> ${escapeHtml(customerName)} (${escapeHtml(customerPhone)})</p>
    <p><strong>Status:</strong> <span class="status pending">Pending Payment</span></p>
    <img src="${getOrderQrUrl(orderId, total)}" alt="Demo QR payment code for ${escapeHtml(orderId)}">
    <p><strong>Amount:</strong> ${formatMoney(total)}</p>
    <p class="small-note">
      Demo only: in a real website, the payment gateway webhook changes this order to
      <strong>Paid</strong> automatically after the QR payment succeeds.
    </p>
  `;
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") toggleCart(false);
});

document.addEventListener("DOMContentLoaded", () => {
  renderBrandButtons();
  renderCatalog();
  renderCart();
});
