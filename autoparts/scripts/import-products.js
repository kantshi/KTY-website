#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const readXlsxFile = require("read-excel-file/node");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".heic", ".heif"]);

const options = parseArgs(process.argv.slice(2));
const autopartsDir = path.resolve(__dirname, "..");
const sourcePath = options.source ? path.resolve(process.cwd(), options.source) : "";
const productsPath = path.resolve(process.cwd(), options.output || path.join(autopartsDir, "products.js"));
const imagesDir = path.resolve(process.cwd(), options.imagesDir || path.join(autopartsDir, "images"));
const defaultBrand = options.brand || "AutoParts";
const defaultPart = options.part || "Auto Part";
const defaultStock = Number.isFinite(Number(options.stock)) ? Number(options.stock) : 50;
const defaultDescription = options.description || "Quality auto part from KTY Auto Part.";

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
    fail("No valid rows found. Make sure column A has SKU and column B has product name.");
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

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const sku = String(row[0] || "").trim();
    if (!sku) continue;
    if (i === 0 && /^sku$/i.test(sku)) continue;

    const name = String(row[1] || "").trim();
    const price = parsePrice(row[8]);
    const shopee = String(row[9] || "").trim();
    const tiktok = String(row[10] || "").trim();

    if (!name) {
      console.warn(`Skipping row ${i + 1}: missing product name in column B.`);
      continue;
    }
    if (!Number.isFinite(price)) {
      console.warn(`Skipping row ${i + 1}: invalid price in column I.`);
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
    const merged = {
      ...base,
      id: existing ? existing.id : ++maxId,
      name: row.name,
      brand: base.brand || defaults.brand,
      part: base.part || defaults.part,
      price: row.price,
      sku: row.sku,
      stock: Number.isFinite(Number(base.stock)) ? Number(base.stock) : defaults.stock,
      description: base.description || defaults.description,
      images: matchedImages.length > 0 ? matchedImages : (Array.isArray(base.images) ? base.images : []),
      shopee: row.shopee,
      tiktok: row.tiktok
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
  const brandSet = new Set();
  for (const brand of existingBrands || []) {
    if (brand) brandSet.add(String(brand));
  }
  for (const product of products) {
    if (product && product.brand) brandSet.add(String(product.brand));
  }
  if (brandSet.size === 0) brandSet.add(fallbackBrand);
  return Array.from(brandSet);
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
