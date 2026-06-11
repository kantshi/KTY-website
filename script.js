let selectedBrand = "All";
let currentProduct = null;
let currentIndex = 0;

const QUOTE_KEY = "autoproQuoteItems";

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

function getQuoteItems() {
  try {
    return JSON.parse(localStorage.getItem(QUOTE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveQuoteItems(items) {
  localStorage.setItem(QUOTE_KEY, JSON.stringify(items));
  updateQuoteCount();
  renderQuoteDrawer();
}

function getVehicleLabel(vehicle) {
  return `${vehicle.make} ${vehicle.model} ${vehicle.yearStart}-${vehicle.yearEnd}`;
}

function getProductSearchText(product) {
  return [
    product.name,
    product.sku,
    product.brand,
    product.category,
    product.description,
    ...(product.tags || []),
    ...product.vehicles.map(getVehicleLabel)
  ].join(" ").toLowerCase();
}

function getQrCodeUrl(product) {
  const payload = [
    storeSettings.paymentMerchantName,
    product.sku,
    product.name,
    formatMoney(product.price)
  ].join(" | ");

  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
}

function productSupportsBrand(product, brand) {
  return product.vehicles.some(vehicle => vehicle.make === brand);
}

function getBrandProductCount(brand) {
  return products.filter(product => productSupportsBrand(product, brand)).length;
}

function renderBrandGrid() {
  const wrapper = document.getElementById("brand-grid");
  if (!wrapper) return;

  wrapper.innerHTML = vehicleBrands.map(brand => {
    const count = getBrandProductCount(brand);
    return `
      <button
        type="button"
        class="brand-card ${brand === selectedBrand ? "active" : ""}"
        onclick="filterProducts('${escapeHtml(brand)}')"
      >
        <span>${escapeHtml(brand.slice(0, 2).toUpperCase())}</span>
        <strong>${escapeHtml(brand)}</strong>
        <small>${count} matching part${count === 1 ? "" : "s"}</small>
      </button>
    `;
  }).join("");
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

function populateFitmentSelectors() {
  const yearSelect = document.getElementById("year-filter");
  const makeSelect = document.getElementById("make-filter");
  const modelSelect = document.getElementById("model-filter");
  if (!yearSelect || !makeSelect || !modelSelect) return;

  const years = new Set();
  const makes = new Set();
  const models = new Set();

  vehicleBrands.forEach(make => makes.add(make));

  products.forEach(product => {
    product.vehicles.forEach(vehicle => {
      models.add(vehicle.model);
      for (let year = vehicle.yearStart; year <= vehicle.yearEnd; year += 1) {
        years.add(year);
      }
    });
  });

  [...years].sort((a, b) => b - a).forEach(year => {
    yearSelect.insertAdjacentHTML("beforeend", `<option value="${year}">${year}</option>`);
  });

  [...makes].sort().forEach(make => {
    makeSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(make)}">${escapeHtml(make)}</option>`);
  });

  [...models].sort().forEach(model => {
    modelSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(model)}">${escapeHtml(model)}</option>`);
  });
}

function productMatchesFitment(product) {
  const year = Number(document.getElementById("year-filter")?.value || 0);
  const make = document.getElementById("make-filter")?.value || "";
  const model = document.getElementById("model-filter")?.value || "";

  if (!year && !make && !model) return true;

  return product.vehicles.some(vehicle => {
    const yearMatches = !year || (year >= vehicle.yearStart && year <= vehicle.yearEnd);
    const makeMatches = !make || vehicle.make === make;
    const modelMatches = !model || vehicle.model === model;
    return yearMatches && makeMatches && modelMatches;
  });
}

function productMatchesSelectedBrand(product) {
  return selectedBrand === "All" || productSupportsBrand(product, selectedBrand);
}

function renderProducts(items) {
  const grid = document.getElementById("product-grid");
  const summary = document.getElementById("results-summary");
  if (!grid) return;

  if (summary) {
    const brandLabel = selectedBrand === "All" ? "all brands" : selectedBrand;
    summary.textContent = `${items.length} part${items.length === 1 ? "" : "s"} found for ${brandLabel}`;
  }

  if (items.length === 0) {
    grid.innerHTML = `
      <p class="empty-state">
        No matching parts found. Try a broader keyword or contact us with your VIN for fitment help.
      </p>
    `;
    return;
  }

  grid.innerHTML = items.map(product => `
    <article class="product-card">
      <a href="product.html?id=${product.id}" class="product-image-link" aria-label="View ${escapeHtml(product.name)}">
        <img src="${product.images[0]}" alt="${escapeHtml(product.name)}" loading="lazy">
      </a>
      <div class="product-card-body">
        <span class="badge">${escapeHtml(product.badge)}</span>
        <p class="card-meta">${escapeHtml(product.brand)} | ${escapeHtml(product.category)} | ${escapeHtml(product.sku)}</p>
        <h3><a href="product.html?id=${product.id}">${escapeHtml(product.name)}</a></h3>
        <p class="card-description">${escapeHtml(product.description)}</p>
        <p class="fitment-preview">${escapeHtml(product.vehicles.slice(0, 2).map(getVehicleLabel).join(", "))}</p>
        <div class="card-bottom">
          <strong>${formatMoney(product.price)}</strong>
          <span>${product.stock > 0 ? `${product.stock} in stock` : "Pre-order"}</span>
        </div>
      </div>
      <div class="product-actions">
        <a href="product.html?id=${product.id}" class="secondary-btn compact">Details</a>
        <button class="secondary-btn compact" type="button" onclick="payByQr(${product.id})">QR Pay</button>
        <button class="primary-btn compact" type="button" onclick="addToQuote(${product.id})">Add quote</button>
      </div>
      <div class="marketplace-buttons compact-links">
        <a class="marketplace-btn shopee" href="${product.links.shopee}" target="_blank" rel="noopener">Shopee</a>
        <a class="marketplace-btn tiktok" href="${product.links.tiktok}" target="_blank" rel="noopener">TikTok Shop</a>
      </div>
    </article>
  `).join("");
}

function filterProducts(brand) {
  selectedBrand = brand;
  const makeFilter = document.getElementById("make-filter");
  if (makeFilter && vehicleBrands.includes(brand)) {
    makeFilter.value = brand;
  }
  renderBrandButtons();
  renderBrandGrid();
  applyFilters();
}

function searchProducts() {
  applyFilters();
}

function applyFilters() {
  const searchTerm = document.getElementById("search")?.value.trim().toLowerCase() || "";
  const makeValue = document.getElementById("make-filter")?.value || "";
  let filtered = [...products];

  if (makeValue && vehicleBrands.includes(makeValue) && makeValue !== selectedBrand) {
    selectedBrand = makeValue;
    renderBrandButtons();
    renderBrandGrid();
  }

  filtered = filtered.filter(productMatchesSelectedBrand);

  if (searchTerm) {
    filtered = filtered.filter(product => getProductSearchText(product).includes(searchTerm));
  }

  filtered = filtered.filter(productMatchesFitment);
  renderProducts(filtered);
}

function clearFitment() {
  ["year-filter", "make-filter", "model-filter"].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = "";
  });
  selectedBrand = "All";
  renderBrandButtons();
  renderBrandGrid();
  applyFilters();
}

function addToQuote(productId) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;

  const quoteItems = getQuoteItems();
  if (!quoteItems.includes(product.id)) {
    quoteItems.push(product.id);
    saveQuoteItems(quoteItems);
  }
  toggleQuoteDrawer(true);
}

function removeFromQuote(productId) {
  saveQuoteItems(getQuoteItems().filter(id => id !== Number(productId)));
}

function updateQuoteCount() {
  const quoteCount = document.getElementById("quote-count");
  if (quoteCount) quoteCount.textContent = getQuoteItems().length;
}

function renderQuoteDrawer() {
  const wrapper = document.getElementById("quote-items");
  const whatsappLink = document.getElementById("quote-whatsapp");
  if (!wrapper || !whatsappLink) return;

  const quoteProducts = getQuoteItems()
    .map(id => products.find(product => product.id === id))
    .filter(Boolean);

  if (quoteProducts.length === 0) {
    wrapper.innerHTML = "<p class=\"empty-quote\">Your quote list is empty. Add parts to request fitment and stock confirmation.</p>";
    whatsappLink.href = `https://wa.me/${storeSettings.whatsappNumber}?text=${encodeURIComponent("Hi AutoPro Parts, I need help finding auto parts.")}`;
    return;
  }

  wrapper.innerHTML = quoteProducts.map(product => `
    <div class="quote-item">
      <img src="${product.images[0]}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div>
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.sku)} | ${formatMoney(product.price)}</span>
      </div>
      <button type="button" onclick="removeFromQuote(${product.id})" aria-label="Remove ${escapeHtml(product.name)}">&times;</button>
    </div>
  `).join("");

  const message = [
    "Hi AutoPro Parts, please confirm stock and fitment for:",
    ...quoteProducts.map(product => `- ${product.sku} ${product.name} (${formatMoney(product.price)})`),
    "",
    "My vehicle: [make/model/year/engine]",
    "Delivery area: [city/postcode]"
  ].join("\n");

  whatsappLink.href = `https://wa.me/${storeSettings.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function toggleQuoteDrawer(forceOpen) {
  const drawer = document.getElementById("quote-drawer");
  if (!drawer) return;

  const shouldOpen = typeof forceOpen === "boolean"
    ? forceOpen
    : !drawer.classList.contains("open");

  drawer.classList.toggle("open", shouldOpen);
  drawer.setAttribute("aria-hidden", String(!shouldOpen));
}

function buildQrPaymentMarkup(product) {
  return `
    <div class="qr-layout">
      <img src="${getQrCodeUrl(product)}" alt="QR payment code for ${escapeHtml(product.name)}">
      <div>
        <p><strong>${escapeHtml(product.name)}</strong></p>
        <p>SKU: ${escapeHtml(product.sku)}</p>
        <p>Amount: ${formatMoney(product.price)}</p>
        <p class="fine-print">${escapeHtml(storeSettings.paymentNote)}</p>
        <ol>
          <li>Scan the QR with your banking or e-wallet app.</li>
          <li>Use the SKU as your payment reference.</li>
          <li>Send the receipt and vehicle details through WhatsApp.</li>
        </ol>
      </div>
    </div>
  `;
}

function payByQr(productId) {
  const product = products.find(item => item.id === Number(productId));
  const modal = document.getElementById("qr-modal");
  const modalBody = document.getElementById("qr-modal-body");
  if (!product || !modal || !modalBody) return;

  modalBody.innerHTML = buildQrPaymentMarkup(product);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeQrModal() {
  const modal = document.getElementById("qr-modal");
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function showImage(index) {
  if (!currentProduct) return;

  currentIndex = (index + currentProduct.images.length) % currentProduct.images.length;
  const mainImage = document.getElementById("main-image");
  if (mainImage) {
    mainImage.src = currentProduct.images[currentIndex];
    mainImage.alt = currentProduct.name;
  }

  document.querySelectorAll(".thumbnail-row button").forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === currentIndex);
  });
}

function prevImage() {
  showImage(currentIndex - 1);
}

function nextImage() {
  showImage(currentIndex + 1);
}

function loadProductDetail() {
  const detail = document.getElementById("product-detail");
  if (!detail) return;

  const urlParams = new URLSearchParams(window.location.search);
  const productId = Number(urlParams.get("id"));
  currentProduct = products.find(product => product.id === productId);

  if (!currentProduct) {
    detail.innerHTML = "<p class=\"empty-state\">Product not found. Return to the catalog and choose another part.</p>";
    return;
  }

  document.title = `${currentProduct.name} | ${storeSettings.name}`;
  document.getElementById("breadcrumb-product").textContent = currentProduct.name;
  document.getElementById("product-category").textContent = currentProduct.category;
  document.getElementById("product-name").textContent = currentProduct.name;
  document.getElementById("product-sku").textContent = `${currentProduct.brand} | SKU ${currentProduct.sku}`;
  document.getElementById("product-price").textContent = formatMoney(currentProduct.price);
  document.getElementById("product-description").textContent = currentProduct.description;
  document.getElementById("product-stock").innerHTML = `
    <span>${currentProduct.stock > 0 ? `${currentProduct.stock} in stock` : "Available for pre-order"}</span>
    <span>Warranty: ${escapeHtml(currentProduct.specs.Warranty || "Confirm with seller")}</span>
  `;

  const thumbnailRow = document.getElementById("thumbnail-row");
  thumbnailRow.innerHTML = currentProduct.images.map((image, index) => `
    <button type="button" onclick="showImage(${index})" aria-label="View image ${index + 1}">
      <img src="${image}" alt="${escapeHtml(currentProduct.name)} thumbnail ${index + 1}" loading="lazy">
    </button>
  `).join("");
  showImage(0);

  document.getElementById("vehicle-list").innerHTML = currentProduct.vehicles
    .map(vehicle => `<li>${escapeHtml(getVehicleLabel(vehicle))}</li>`)
    .join("");

  document.getElementById("spec-list").innerHTML = Object.entries(currentProduct.specs)
    .map(([label, value]) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `)
    .join("");

  document.getElementById("shopee-link").href = currentProduct.links.shopee;
  document.getElementById("tiktok-link").href = currentProduct.links.tiktok;
  document.getElementById("detail-quote-button").onclick = () => addToQuote(currentProduct.id);
  document.getElementById("detail-qr-button").onclick = () => payByQr(currentProduct.id);

  const qrPanel = document.getElementById("detail-qr-code");
  if (qrPanel) qrPanel.innerHTML = buildQrPaymentMarkup(currentProduct);
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeQrModal();
    toggleQuoteDrawer(false);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  renderBrandButtons();
  renderBrandGrid();
  populateFitmentSelectors();
  applyFilters();
  updateQuoteCount();
  renderQuoteDrawer();
  loadProductDetail();
});
