#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const BRAND_FROM_PREFIX = {
  TT: "Toyota",
  NS: "Nissan",
  KI: "Kia",
  MS: "Mitsubishi",
  IZ: "Isuzu",
  HN: "Hino",
  HD: "Honda",
  SK: "Suzuki",
  CR: "Chevrolet",
  MD: "Mazda",
  FO: "Ford"
};
const BRAND_TABS = [
  "Toyota",
  "Nissan",
  "Mitsubishi",
  "Kia",
  "Suzuki",
  "Chevrolet",
  "Ford",
  "Hino",
  "Honda",
  "Isuzu",
  "Mazda"
];
const SHOPEE_SHOP_URL = "https://shopee.co.th/shop/1501857";
const TIKTOK_PROFILE_URL = "https://www.tiktok.com/@kty.autopart";
const PRODUCT_NAME_PREFIX = "ท่อยางอากาศ";

const DESCRIPTION_TEMPLATE = [
  "***สินค้าที่ได้รับ จะเป็นของใหม่ทั้งหมด***",
  "",
  "{name}",
  "(รหัส : {sku})",
  "",
  "- ท่ออากาศรถยนต์ ใช้ต่อเข้าไอดี",
  "- สินค้าทำจากยางคุณภาพดี ผลิตในประเทศไทย"
].join("\n");
const THAI_AIR_HOSE_PREFIXES = ["ท่ออากาศ", "ท่อยางอากาศ"];

const autopartsDir = path.resolve(__dirname, "..");
const productsPath = path.join(autopartsDir, "products.js");

if (!fs.existsSync(productsPath)) {
  console.error(`products.js not found at ${productsPath}`);
  process.exit(1);
}

const { brands: existingBrands, products } = readProductsFile(productsPath);
let updatedCount = 0;

const normalizedProducts = products.map((product) => {
  if (!product || !product.sku) return product;
  const inferredBrand = inferBrandFromSku(product.sku) || product.brand || "Toyota";
  const normalizedName = normalizeProductName(product.name, inferredBrand);
  const normalizedDescription = formatDescription(normalizedName, product.sku);
  const normalizedShopeeUrl = resolveShopeeUrl(product.shopee);
  const normalizedTikTokUrl = resolveTikTokUrl(product.tiktok);

  const changed = (
    product.brand !== inferredBrand ||
    product.name !== normalizedName ||
    product.description !== normalizedDescription ||
    (product.shopee || "") !== normalizedShopeeUrl ||
    (product.tiktok || "") !== normalizedTikTokUrl
  );
  if (changed) updatedCount += 1;

  return {
    ...product,
    brand: inferredBrand,
    name: normalizedName,
    description: normalizedDescription,
    shopee: normalizedShopeeUrl,
    tiktok: normalizedTikTokUrl
  };
});

const mergedBrands = buildBrandList(existingBrands, normalizedProducts);
const output = buildProductsJs(mergedBrands, normalizedProducts);
fs.writeFileSync(productsPath, output, "utf8");

console.log(`Normalized products: ${updatedCount}`);
console.log(`Updated file: ${productsPath}`);

function inferBrandFromSku(sku) {
  const prefix = String(sku || "").split("-")[0].toUpperCase();
  return BRAND_FROM_PREFIX[prefix] || "";
}

function normalizeMarketplaceUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function isSpecificShopeeUrl(url) {
  const normalized = normalizeMarketplaceUrl(url);
  if (!normalized) return false;
  if (!/^https?:\/\//i.test(normalized)) return false;
  const lower = normalized.toLowerCase();
  if (!lower.includes("shopee.co.th")) return false;
  return lower.includes("i.1501857.") || lower.includes("/product/1501857/");
}

function isSpecificTikTokUrl(url) {
  const normalized = normalizeMarketplaceUrl(url);
  if (!normalized) return false;
  if (!/^https?:\/\//i.test(normalized)) return false;
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch (_error) {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  if (host === "vt.tiktok.com") return true;
  if (!host.includes("tiktok.com")) return false;
  if (!pathname.includes("@kty.autopart")) return false;
  return pathname.includes("/product/") || pathname.includes("/shop/product/") || pathname.includes("/view/product/");
}

function resolveShopeeUrl(url) {
  if (isSpecificShopeeUrl(url)) return String(url).trim();
  return "";
}

function resolveTikTokUrl(url) {
  if (isSpecificTikTokUrl(url)) return String(url).trim();
  return "";
}

function normalizeProductName(name, brand) {
  const rawName = String(name || "").trim();
  const cleanBrand = String(brand || "").trim();
  if (!cleanBrand) return rawName;

  const prefix = PRODUCT_NAME_PREFIX;
  let remainder = stripThaiPrefix(rawName);

  for (const knownBrand of Object.values(BRAND_FROM_PREFIX)) {
    const brandRegex = new RegExp(`^${escapeRegExp(knownBrand)}\\b\\s*`, "i");
    remainder = remainder.replace(brandRegex, "").trim();
  }
  remainder = stripThaiPrefix(remainder);

  if (!remainder) {
    return `${prefix} ${cleanBrand}`.trim();
  }
  return `${prefix} ${cleanBrand} ${remainder}`.replace(/\s+/g, " ").trim();
}

function formatDescription(name, sku) {
  return DESCRIPTION_TEMPLATE
    .replace(/\{name\}/g, String(name || "").trim())
    .replace(/\{sku\}/g, String(sku || "").trim());
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripThaiPrefix(value) {
  let text = String(value || "").trim();
  for (const thaiPrefix of THAI_AIR_HOSE_PREFIXES) {
    if (text.startsWith(thaiPrefix)) {
      text = text.slice(thaiPrefix.length).trim();
      break;
    }
  }
  return text;
}

function readProductsFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const context = { result: null };
  vm.createContext(context);
  vm.runInContext(`${source}\nresult = { BRANDS, products };`, context, { timeout: 1000 });
  return {
    brands: Array.isArray(context.result && context.result.BRANDS) ? context.result.BRANDS : [],
    products: Array.isArray(context.result && context.result.products) ? context.result.products : []
  };
}

function buildBrandList(existingBrands, products) {
  const allowed = new Set(BRAND_TABS);
  const hasAnyAllowed = products.some((product) => product && allowed.has(String(product.brand || "")));
  if (!hasAnyAllowed) {
    return existingBrands && existingBrands.length > 0 ? existingBrands : ["Toyota"];
  }
  return BRAND_TABS.slice();
}

function buildProductsJs(brands, products) {
  const brandText = brands.map((brand) => `  ${JSON.stringify(brand)}`).join(",\n");
  const productText = products.map((product) => serializeProduct(product)).join(",\n");

  return `// products.js - Auto parts catalog data
// Generated by scripts/import-products.js (A=SKU, B=Name, I=Price, J=Shopee, K=TikTok)

const BRANDS = [
${brandText}
];

const IMG = "images/";

const products = [
${productText}
];
`;
}

function serializeProduct(product) {
  const orderedKeys = ["id", "name", "brand", "part", "price", "sku", "stock", "description", "images", "shopee", "tiktok"];
  const extraKeys = Object.keys(product || {}).filter((key) => !orderedKeys.includes(key));
  const keys = [...orderedKeys, ...extraKeys];

  const lines = ["  {"];
  for (const key of keys) {
    if (!(key in product)) continue;
    lines.push(`    ${key}: ${renderValue(key, product[key])},`);
  }
  lines.push("  }");
  return lines.join("\n");
}

function renderValue(key, value) {
  if (key === "price") {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : "0.00";
  }
  if (key === "images" && Array.isArray(value)) {
    const imageEntries = value.map((imagePath) => {
      if (typeof imagePath !== "string") return JSON.stringify(imagePath);
      if (imagePath.startsWith("images/")) {
        return `IMG + ${JSON.stringify(imagePath.slice("images/".length))}`;
      }
      return JSON.stringify(imagePath);
    });
    return `[${imageEntries.join(", ")}]`;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  return JSON.stringify(value ?? null);
}
