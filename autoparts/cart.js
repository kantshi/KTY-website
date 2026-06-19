// cart.js — shared shopping cart (localStorage based)

const CART_KEY = "autoparts_cart";
const CURRENCY = "฿"; // Thai Baht
const CART_IMAGE_BASE = (() => {
  if (typeof window === "undefined" || !window.location) return "images/";
  if (typeof window.__KTY_IMAGE_BASE__ === "string" && window.__KTY_IMAGE_BASE__) {
    return window.__KTY_IMAGE_BASE__;
  }
  const pathname = String(window.location.pathname || "");
  const marker = "/autoparts/";
  const index = pathname.toLowerCase().indexOf(marker);
  if (index >= 0) {
    return `${pathname.slice(0, index)}${marker}images/`;
  }
  return "/autoparts/images/";
})();
const CART_PLACEHOLDER_IMAGE = `${CART_IMAGE_BASE}product-placeholder.svg`;

function resolveCartImagePath(imagePath) {
  const rawPath = String(imagePath || "").trim();
  if (!rawPath) return CART_PLACEHOLDER_IMAGE;
  if (/^(?:https?:)?\/\//i.test(rawPath) || rawPath.startsWith("data:") || rawPath.startsWith("/")) {
    return rawPath;
  }
  if (rawPath.startsWith("images/")) {
    return `${CART_IMAGE_BASE}${rawPath.slice("images/".length)}`;
  }
  return rawPath;
}

function formatPrice(value) {
  return CURRENCY + Number(value).toFixed(2);
}

function getCart() {
  try {
    const storedCart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    return storedCart.map(item => ({
      ...item,
      image: resolveCartImagePath(item.image)
    }));
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function addToCart(productId, qty = 1) {
  const product = (typeof products !== "undefined")
    ? products.find(p => p.id === productId)
    : null;
  if (!product) return;

  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      sku: product.sku || "",
      price: product.price,
      image: (Array.isArray(product.images) && product.images[0]) ? resolveCartImagePath(product.images[0]) : CART_PLACEHOLDER_IMAGE,
      qty: qty
    });
  }
  saveCart(cart);
  showToast(`${product.name} added to cart`);
}

function updateQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}

function removeFromCart(productId) {
  let cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
}

function updateCartCount() {
  const count = cartCount();
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "grid" : "none";
  });
}

// Lightweight toast notification
function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

document.addEventListener("DOMContentLoaded", updateCartCount);
