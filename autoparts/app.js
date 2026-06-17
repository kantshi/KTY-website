// app.js — catalog rendering, brand filtering and search

let selectedBrand = "All";
const PLACEHOLDER_IMAGE = "images/product-placeholder.svg";

function getPrimaryImage(product) {
  if (!product || !Array.isArray(product.images)) return "";
  return (product.images.find(Boolean) || "").trim();
}

function productHasImage(product) {
  return Boolean(getPrimaryImage(product));
}

function compareProducts(a, b) {
  const aMissing = productHasImage(a) ? 0 : 1;
  const bMissing = productHasImage(b) ? 0 : 1;
  if (aMissing !== bMissing) return aMissing - bMissing;

  const brandCompare = (a.brand || "").localeCompare(b.brand || "", undefined, { sensitivity: "base" });
  if (brandCompare !== 0) return brandCompare;

  return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });
}

function sortProducts(items) {
  return [...items].sort(compareProducts);
}

function getCardImage(product) {
  return productHasImage(product) ? getPrimaryImage(product) : PLACEHOLDER_IMAGE;
}

function renderBrandCountBadge() {
  const badge = document.getElementById("brand-count-eyebrow");
  if (!badge || typeof BRANDS === "undefined" || !Array.isArray(BRANDS)) return;
  const count = BRANDS.length;
  const noun = count === 1 ? "brand" : "brands";
  badge.textContent = `⚙ Parts for ${count} major ${noun}`;
}

function renderBrandFilters() {
  const wrap = document.getElementById("brand-filters");
  if (!wrap || typeof BRANDS === "undefined" || !Array.isArray(BRANDS)) return;
  const all = ["All", ...BRANDS];
  wrap.innerHTML = all.map(b =>
    `<button class="${b === selectedBrand ? "active" : ""}" onclick="filterBrand('${b}', this)">${b}</button>`
  ).join("");
}

function renderProducts(items) {
  const grid = document.getElementById("product-grid");
  const count = document.getElementById("result-count");
  grid.innerHTML = "";
  if (count) count.textContent = `${items.length} part${items.length === 1 ? "" : "s"}`;

  if (items.length === 0) {
    grid.innerHTML = '<p class="empty-state">No parts found. Try another brand or search term.</p>';
    return;
  }

  items.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    const lowStock = p.stock <= 8 ? `<span class="stock-pill low">Only ${p.stock} left</span>` : "";
    card.innerHTML = `
      <a class="product-thumb" href="product.html?id=${p.id}">
        <span class="product-tag">${p.brand}</span>
        <img src="${getCardImage(p)}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'">
      </a>
      <div class="product-body">
        <span class="product-part">${p.part}</span>
        <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
        ${lowStock}
        <p class="product-price">${formatPrice(p.price)}</p>
        <div class="card-actions">
          <a class="btn btn-ghost" href="product.html?id=${p.id}">Details</a>
          <button class="btn btn-primary" onclick="addToCart(${p.id})">Add to cart</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterBrand(brand, btn) {
  selectedBrand = brand;
  document.querySelectorAll("#brand-filters button").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  applyFilters();
}

function searchProducts() {
  applyFilters();
}

function applyFilters() {
  const searchInput = document.getElementById("search");
  const term = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const source = (typeof products !== "undefined" && Array.isArray(products)) ? products : [];
  let filtered = source;

  if (selectedBrand !== "All") {
    filtered = filtered.filter(p => p.brand === selectedBrand);
  }
  if (term) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.part.toLowerCase().includes(term) ||
      p.brand.toLowerCase().includes(term)
    );
  }
  renderProducts(sortProducts(filtered));
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof products === "undefined" || !Array.isArray(products)) {
    const grid = document.getElementById("product-grid");
    const count = document.getElementById("result-count");
    if (grid) {
      grid.innerHTML = '<p class="empty-state">Catalog failed to load. Please refresh this page.</p>';
    }
    if (count) count.textContent = "0 parts";
    return;
  }

  renderBrandCountBadge();
  // Allow ?brand=Toyota deep links from the homepage brand grid
  const params = new URLSearchParams(window.location.search);
  const brandParam = params.get("brand");
  if (brandParam && typeof BRANDS !== "undefined" && Array.isArray(BRANDS) && BRANDS.includes(brandParam)) {
    selectedBrand = brandParam;
  }
  renderBrandFilters();
  applyFilters();
});
