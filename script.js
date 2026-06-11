let selectedCategory = "All"; // track current category

// Render Products in Grid
function renderProducts(items) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = '<p class="empty-state">No products found. Try a different search or category.</p>';
    return;
  }
  items.forEach(p => {
    const card = document.createElement('a');
    card.className = 'product-card';
    card.href = `product.html?id=${p.id}`;
    card.innerHTML = `
      <div class="product-thumb">
        <span class="product-tag">${p.category}</span>
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy"
             onerror="this.style.display='none'">
      </div>
      <div class="product-body">
        <h3>${p.name}</h3>
        <p class="product-price">$${p.price.toFixed(2)}</p>
        <span class="btn btn-primary btn-block">View Details &rarr;</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Filter by Category
function filterProducts(category, btnElement) {
  selectedCategory = category;
  applyFilters();

  const buttons = document.querySelectorAll('.categories button');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
}

// Search Products within selected category
function searchProducts() {
  applyFilters();
}

// Combined filter: category + search
function applyFilters() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  let filtered = products; // products from products.js

  if (selectedCategory !== "All") {
    filtered = filtered.filter(p => p.category === selectedCategory);
  }

  if (searchTerm) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
  }

  renderProducts(filtered);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderProducts(products);
});
