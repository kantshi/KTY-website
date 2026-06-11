// app.js — catalog rendering, brand filtering and search

let selectedBrand = "All";

function renderBrandFilters() {
  const wrap = document.getElementById("brand-filters");
  if (!wrap) return;
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
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
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
  let filtered = products;

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
  renderProducts(filtered);
}

document.addEventListener("DOMContentLoaded", () => {
  // Allow ?brand=Toyota deep links from the homepage brand grid
  const params = new URLSearchParams(window.location.search);
  const brandParam = params.get("brand");
  if (brandParam && BRANDS.includes(brandParam)) {
    selectedBrand = brandParam;
  }
  renderBrandFilters();
  applyFilters();
});
