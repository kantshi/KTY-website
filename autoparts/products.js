// products.js — Auto parts catalog data
// Currency: Thai Baht
// Each product is categorised by car BRAND and includes a gallery of images,
// price, and direct links to Shopee and TikTok Shop.

const BRANDS = [
  "Toyota", "Mazda", "Isuzu", "Honda", "Mitsubishi",
  "Nissan", "Suzuki", "Chevrolet", "Hino"
];

const IMG = "images/";

const products = [
  {
    id: 1,
    name: "ท่อยางอากาศ Toyota MIGHTY-X (LN85)",
    brand: "Toyota",
    part: "Air Hose",
    price: 225.00,
    sku: "TT-601",
    stock: 50,
    description: "***สินค้าที่ได้รับ จะเป็นของใหม่ทั้งหมด*** ท่อยางอากาศ Toyota MIGHTY-X (LN85) / โตโยต้า ไมตี้เอ็กซ์ แอลเอ็น85 (รหัส : TT-601) -  ท่ออากาศรถยนต์ ใช้ต่อเข้าไอดี  -  สินค้าทำจากยางคุณภาพดี ผลิตในประเทศไทย",
    images: [IMG + "TT-601.png", IMG + "TT-601_m.png"],
    shopee: "https://shopee.co.th/%E0%B8%97%E0%B9%88%E0%B8%AD%E0%B8%A2%E0%B8%B2%E0%B8%87%E0%B8%AD%E0%B8%B2%E0%B8%81%E0%B8%B2%E0%B8%A8-Toyota-MIGHTY-X-(LN85)-%E0%B9%82%E0%B8%95%E0%B9%82%E0%B8%A2%E0%B8%95%E0%B9%89%E0%B8%B2-%E0%B9%84%E0%B8%A1%E0%B8%95%E0%B8%B5%E0%B9%89%E0%B9%80%E0%B8%AD%E0%B9%87%E0%B8%81%E0%B8%8B%E0%B9%8C-%E0%B9%81%E0%B8%AD%E0%B8%A5%E0%B9%80%E0%B8%AD%E0%B9%87%E0%B8%9985-i.1501857.7440695772?extraParams=%7B%22display_model_id%22%3A40176048895%2C%22model_selection_logic%22%3A3%7D&sp_atk=f42bb182-1310-40ba-a627-33a5bcbbb686&xptdk=f42bb182-1310-40ba-a627-33a5bcbbb686",
    tiktok: "https://vt.tiktok.com/ZS9jNHRaDcSfa-u147Q/"
  }

  // ===== HOW TO ADD A PRODUCT =====
  // Copy the block above (from { to }), paste it below this line after adding
  // a comma, then change the values. Each product needs a UNIQUE id.
  // - price: a number only (no symbol), e.g. 225.00
  // - images: put your photo files in the images/ folder, then list them here
  //   e.g. images: [IMG + "TT-602.png", IMG + "TT-602_2.png"]
  // - specs (optional): specs: { Label: "Value", Label2: "Value2" }
  // - shopee / tiktok: paste your full product links
];
