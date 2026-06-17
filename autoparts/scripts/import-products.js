#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const readXlsxFile = require("read-excel-file/node");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".heic", ".heif"]);
const DEFAULT_DESCRIPTION_TEMPLATE = [
  "***สินค้าที่ได้รับ จะเป็นของใหม่ทั้งหมด***",
  "",
  "{name}",
  "(รหัส : {sku})",
  "",
  "- ท่ออากาศรถยนต์ ใช้ต่อเข้าไอดี",
  "- สินค้าทำจากยางคุณภาพดี ผลิตในประเทศไทย"
].join("\n");
const THAI_AIR_HOSE_PREFIXES = ["ท่ออากาศ", "ท่อยางอากาศ"];
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

const options = parseArgs(process.argv.slice(2));
const autopartsDir = path.resolve(__dirname, "..");
const sourcePath = options.source ? path.resolve(process.cwd(), options.source) : "";
const productsPath = path.resolve(process.cwd(), options.output || path.join(autopartsDir, "products.js"));
const imagesDir = path.resolve(process.cwd(), options.imagesDir || path.join(autopartsDir, "images"));
const defaultBrand = options.brand || "Toyota";
const defaultPart = options.part || "Air Hose";
const defaultStock = Number.isFinite(Number(options.stock)) ? Number(options.stock) : 50;
const defaultDescription = options.description || DEFAULT_DESCRIPTION_TEMPLATE;

if (!sourcePath) {
  fail("Missing required --source argument. Example: npm run import:products -- --source \"products.xlsx\"");
}
if (!fs.existsSync(sourcePath)) {
  fail(`Source file not found: ${sourcePath}`);
}
if (!fs.existsSync(productsPath)) {
  fail(`products.js file not found: ${productsPath}`);
}
if (!fs.existsSync(imagesDir)) {
  fail(`Images directory not found: ${imagesDir}`);
}

run().catch((error) => {
  fail(error.message);
});

async function run() {
  const rows = await readRowsFromSource(sourcePath, options.sheet);
  const importRows = toImportRows(rows);
  if (importRows.length === 0) {
    fail("No valid rows found. Check SKU/name/price columns in your file.");
  }

  const imageFiles = fs.readdirSync(imagesDir)
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()));

  const { brands: existingBrands, products: existingProducts } = readProductsFile(productsPath);
  const mergeResult = mergeProducts({
    importRows,
    existingProducts,
    imageFiles,
    defaults: {
      brand: defaultBrand,
      part: defaultPart,
      stock: defaultStock,
      description: defaultDescription
    }
  });

  const mergedProducts = mergeResult.products;
  const mergedBrands = buildBrandList(existingBrands, mergedProducts, defaultBrand);
  const output = buildProductsJs(mergedBrands, mergedProducts);

  if (options.dryRun) {
    console.log("Dry run complete.");
    printSummary(mergeResult);
    return;
  }

  fs.writeFileSync(productsPath, output, "utf8");
  printSummary(mergeResult);
  console.log(`Updated: ${productsPath}`);
}

async function readRowsFromSource(filePath, sheet) {
  if (path.extname(filePath).toLowerCase() === ".csv") {
    const csv = fs.readFileSync(filePath, "utf8");
    return parseCsv(csv);
  }
  const sheetOption = sheet ? (Number.isFinite(Number(sheet)) ? Number(sheet) : sheet) : 1;
  return readXlsxFile(filePath, { sheet: sheetOption });
}

function toImportRows(rows) {
  const results = [];
  const mapping = detectColumnMapping(rows);
  const startAt = mapping.headerRowIndex >= 0 ? mapping.headerRowIndex + 1 : 0;

  for (let i = startAt; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const sku = String(row[mapping.sku] || "").trim();
    if (!sku) continue;

    const name = String(row[mapping.name] || "").trim();
    const price = parsePrice(row[mapping.price]);
    const shopee = String(row[mapping.shopee] || "").trim();
    const tiktok = String(row[mapping.tiktok] || "").trim();

    if (!name) {
      console.warn(`Skipping row ${i + 1}: missing product name.`);
      continue;
    }
    if (!Number.isFinite(price)) {
      console.warn(`Skipping row ${i + 1}: invalid price.`);
      continue;
    }

    results.push({
      sku,
      name,
      price,
      shopee,
      tiktok,
      rowNumber: i + 1
    });
  }

  return results;
}

function detectColumnMapping(rows) {
  const fallback = {
    sku: 0,
    name: 1,
    price: 8,
    shopee: 9,
    tiktok: 10,
    headerRowIndex: -1
  };

  const keyMatchers = {
    sku: ["sku", "website sku", "website_sku"],
    name: ["name", "product name", "ชื่อสินค้า"],
    price: ["price", "ราคาขาย", "selling price"],
    shopee: ["shopee"],
    tiktok: ["tiktok", "tik tok"]
  };

  const scanRows = rows.slice(0, 5);
  for (let rowIndex = 0; rowIndex < scanRows.length; rowIndex += 1) {
    const row = scanRows[rowIndex] || [];
    const found = { headerRowIndex: rowIndex };

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const normalized = normalizeHeader(row[colIndex]);
      if (!normalized) continue;
      for (const [key, aliases] of Object.entries(keyMatchers)) {
        if (found[key] !== undefined) continue;
        if (aliases.some((alias) => normalized === normalizeHeader(alias))) {
          found[key] = colIndex;
        }
      }
    }

    const hasCore = found.sku !== undefined && found.name !== undefined && found.price !== undefined;
    if (hasCore) {
      return {
        sku: found.sku,
        name: found.name,
        price: found.price,
        shopee: found.shopee ?? fallback.shopee,
        tiktok: found.tiktok ?? fallback.tiktok,
        headerRowIndex: found.headerRowIndex
      };
    }
  }

  return fallback;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, " ");
}

function mergeProducts({ importRows, existingProducts, imageFiles, defaults }) {
  const existingBySku = new Map();
  for (const product of existingProducts) {
    if (!product || !product.sku) continue;
    existingBySku.set(String(product.sku).toUpperCase(), product);
  }

  let maxId = existingProducts.reduce((max, product) => {
    const id = Number(product.id);
    return Number.isFinite(id) ? Math.max(max, id) : max;
  }, 0);

  const updatesBySku = new Map();
  const missingImages = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const row of importRows) {
    const skuKey = row.sku.toUpperCase();
    const existing = existingBySku.get(skuKey);
    const matchedImages = matchImagesForSku(row.sku, imageFiles).map((file) => `images/${file}`);
    if (matchedImages.length === 0) {
      missingImages.push(row.sku);
    }

    const base = existing ? { ...existing } : {};
    const inferredBrand = base.brand || inferBrandFromSku(row.sku) || defaults.brand;
    const normalizedName = normalizeProductName(row.name, inferredBrand);
    const merged = {
      ...base,
      id: existing ? existing.id : ++maxId,
      name: normalizedName,
      brand: inferredBrand,
      part: base.part || defaults.part,
      price: row.price,
      sku: row.sku,
      stock: Number.isFinite(Number(base.stock)) ? Number(base.stock) : defaults.stock,
      description: formatDescription(normalizedName, row.sku, defaults.description),
      images: matchedImages.length > 0 ? matchedImages : (Array.isArray(base.images) ? base.images : []),
      shopee: row.shopee || base.shopee || SHOPEE_SHOP_URL,
      tiktok: row.tiktok || base.tiktok || TIKTOK_PROFILE_URL
    };

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }

    updatesBySku.set(skuKey, merged);
  }

  const mergedProducts = [];
  for (const product of existingProducts) {
    const skuKey = product.sku ? String(product.sku).toUpperCase() : "";
    if (skuKey && updatesBySku.has(skuKey)) {
      mergedProducts.push(updatesBySku.get(skuKey));
      updatesBySku.delete(skuKey);
    } else {
      mergedProducts.push(product);
    }
  }
  for (const product of updatesBySku.values()) {
    mergedProducts.push(product);
  }

  return {
    products: mergedProducts,
    createdCount,
    updatedCount,
    importedCount: importRows.length,
    missingImages
  };
}

function matchImagesForSku(sku, imageFiles) {
  const skuLower = String(sku).toLowerCase();
  const matches = imageFiles.filter((file) => {
    const basename = path.parse(file).name.toLowerCase();
    return basename === skuLower || basename.startsWith(`${skuLower}_`);
  });

  matches.sort((a, b) => compareImageNamesForSku(skuLower, a, b));
  return matches;
}

function compareImageNamesForSku(skuLower, fileA, fileB) {
  const a = path.parse(fileA).name.toLowerCase();
  const b = path.parse(fileB).name.toLowerCase();
  return imageRank(skuLower, a) - imageRank(skuLower, b) || a.localeCompare(b, undefined, { numeric: true });
}

function imageRank(skuLower, name) {
  if (name === skuLower) return 0;
  if (name.endsWith("_m")) return 2;
  return 1;
}

function inferBrandFromSku(sku) {
  const prefix = String(sku || "").split("-")[0].toUpperCase();
  return BRAND_FROM_PREFIX[prefix] || "";
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

function formatDescription(name, sku, template) {
  return String(template || DEFAULT_DESCRIPTION_TEMPLATE)
    .replace(/\{name\}/g, String(name || "").trim())
    .replace(/\{sku\}/g, String(sku || "").trim());
}

function readProductsFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const context = { result: null };
  vm.createContext(context);
  vm.runInContext(`${source}\nresult = { BRANDS, products };`, context, { timeout: 1000 });

  const brands = Array.isArray(context.result && context.result.BRANDS) ? context.result.BRANDS : [];
  const products = Array.isArray(context.result && context.result.products) ? context.result.products : [];
  return { brands, products };
}

function buildBrandList(existingBrands, products, fallbackBrand) {
  const allowed = new Set(BRAND_TABS);
  const hasAnyAllowed = products.some((product) => product && allowed.has(String(product.brand || "")));
  if (!hasAnyAllowed && fallbackBrand) return [fallbackBrand];
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
    const rendered = renderValue(key, product[key]);
    lines.push(`    ${key}: ${rendered},`);
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
  if (Array.isArray(value) || (value && typeof value === "object")) {
    return JSON.stringify(value);
  }
  return JSON.stringify(value ?? null);
}

function parsePrice(rawValue) {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) return rawValue;
  const value = String(rawValue || "").trim();
  if (!value) return NaN;
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/,/g, "");
  return Number(normalized);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "dry-run") {
      result.dryRun = true;
      continue;
    }
    result[key] = argv[i + 1];
    i += 1;
  }
  return result;
}

function printSummary(summary) {
  console.log(`Imported rows: ${summary.importedCount}`);
  console.log(`Updated products: ${summary.updatedCount}`);
  console.log(`Created products: ${summary.createdCount}`);
  if (summary.missingImages.length > 0) {
    console.log(`Missing images for SKUs: ${summary.missingImages.join(", ")}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
