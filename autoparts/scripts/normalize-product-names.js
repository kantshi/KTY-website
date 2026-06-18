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
const PRODUCT_NAME_PREFIX = "ท่อยางอากาศ";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".heic", ".heif"]);
const SPECIFIC_MARKETPLACE_LINKS = {
  "TT-622": {
    shopee: "https://shopee.co.th/%E0%B8%97%E0%B9%88%E0%B8%AD%E0%B8%A2%E0%B8%B2%E0%B8%87%E0%B8%AD%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A8-Toyota-1KZ-i.1501857.4141616903?extraParams=%7B%22display_model_id%22%3A60242574024%2C%22model_selection_logic%22%3A3%7D&sp_atk=8cfa3694-d704-4c81-afb3-4e66f7426e23&xptdk=8cfa3694-d704-4c81-afb3-4e66f7426e23"
  },
  "TT-661": {
    tiktok: "https://shop.tiktok.com/th/pdp/1735426849839548309?source=product_detail&enter_method=feed_list_more_from&first_entrance=unknown&first_entrance_position=feed_list_more_from&first_entrance_tt_scene=share"
  }
};

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
const imagesDir = path.join(autopartsDir, "images");

if (!fs.existsSync(productsPath)) {
  console.error(`products.js not found at ${productsPath}`);
  process.exit(1);
}

const { brands: existingBrands, products } = readProductsFile(productsPath);
const imageFiles = loadImageFiles(imagesDir);
let updatedCount = 0;

const normalizedProducts = products.map((product) => {
  if (!product || !product.sku) return product;
  const inferredBrand = inferBrandFromSku(product.sku) || product.brand || "Toyota";
  const normalizedName = normalizeProductName(product.name, inferredBrand);
  const normalizedDescription = formatDescription(normalizedName, product.sku);
  const specificLinks = getSpecificMarketplaceLinks(product.sku);
  const normalizedShopeeUrl = resolveShopeeUrl(specificLinks.shopee || product.shopee);
  const normalizedTikTokUrl = resolveTikTokUrl(specificLinks.tiktok || product.tiktok);
  const syncedImages = resolveProductImages(product.sku, product.images, imageFiles);

  const changed = (
    product.brand !== inferredBrand ||
    product.name !== normalizedName ||
    product.description !== normalizedDescription ||
    !areSameImages(product.images, syncedImages) ||
    (product.shopee || "") !== normalizedShopeeUrl ||
    (product.tiktok || "") !== normalizedTikTokUrl
  );
  if (changed) updatedCount += 1;

  return {
    ...product,
    brand: inferredBrand,
    name: normalizedName,
    description: normalizedDescription,
    images: syncedImages,
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

function getSpecificMarketplaceLinks(sku) {
  const key = String(sku || "").trim().toUpperCase();
  return SPECIFIC_MARKETPLACE_LINKS[key] || {};
}

function loadImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));
}

function resolveProductImages(sku, existingImages, imageFiles) {
  const matched = matchImagesForSku(sku, imageFiles).map((file) => `images/${file}`);
  if (matched.length > 0) return matched;
  if (!Array.isArray(existingImages)) return [];
  return existingImages
    .filter((value) => typeof value === "string")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function matchImagesForSku(sku, imageFiles) {
  const skuLower = String(sku || "").trim().toLowerCase();
  if (!skuLower) return [];

  const matches = imageFiles.filter((file) => {
    const basename = path.parse(file).name.toLowerCase();
    return (
      basename === skuLower ||
      basename.startsWith(`${skuLower}_`) ||
      new RegExp(`^${escapeRegExp(skuLower)}-\\d+(?:_|$)`).test(basename)
    );
  });

  matches.sort((a, b) => compareImageNamesForSku(skuLower, a, b));
  return matches;
}

function compareImageNamesForSku(skuLower, fileA, fileB) {
  const nameA = path.parse(fileA).name.toLowerCase();
  const nameB = path.parse(fileB).name.toLowerCase();
  return imageRank(skuLower, nameA) - imageRank(skuLower, nameB) || nameA.localeCompare(nameB, undefined, { numeric: true });
}

function imageRank(skuLower, name) {
  if (name === skuLower) return 0;
  if (name.endsWith("_m")) return 2;
  return 1;
}

function areSameImages(currentImages, nextImages) {
  const current = Array.isArray(currentImages) ? currentImages.map((value) => String(value || "")) : [];
  const next = Array.isArray(nextImages) ? nextImages.map((value) => String(value || "")) : [];
  if (current.length !== next.length) return false;
  return current.every((value, index) => value === next[index]);
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
  if (host === "shop.tiktok.com") return pathname.includes("/pdp/");
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
