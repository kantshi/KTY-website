let selectedCategory = "All"; // track current category

// Render Products in Grid
function renderProducts(items) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center;">No products found.</p>';
    return;
  }
  items.forEach(p => {
    grid.innerHTML += `
      <div class="product-card">
        <img src="${p.images[0]}" alt="${p.name}">
        <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
        <p>$${p.price.toFixed(2)}</p>
        <a href="${p.link}" target="_blank" class="buy-btn">Buy Now</a>
      </div>
    `;
  });
}

// Filter by Category
function filterProducts(category, btnElement) {
    selectedCategory = category;
    applyFilters();
  
    // Remove active class from all buttons
    const buttons = document.querySelectorAll('.categories button');
    buttons.forEach(btn => btn.classList.remove('active'));
  
    // Add active class to the clicked button
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

  // Category filter
  if (selectedCategory !== "All") {
    filtered = filtered.filter(p => p.category === selectedCategory);
  }

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
  }

  renderProducts(filtered);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderProducts(products); // show all products on load
});
