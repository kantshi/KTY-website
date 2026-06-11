const storeSettings = {
  name: "AutoPro Parts",
  currency: "MYR",
  currencyLabel: "RM",
  whatsappNumber: "60123456789",
  paymentMerchantName: "AUTOPRO PARTS SDN BHD",
  paymentNote: "Replace this demo QR with your real bank or e-wallet merchant QR."
};

const vehicleBrands = [
  "Toyota",
  "Nissan",
  "Mazda",
  "Isuzu",
  "Mitsubishi",
  "Hino",
  "Suzuki",
  "Ford",
  "Chevrolet",
  "Honda"
];

const products = [
  {
    id: 1,
    sku: "AP-BRK-TOY-001",
    name: "Toyota Ceramic Front Brake Pad Set",
    price: 128,
    category: "Brakes",
    brand: "Bendix",
    stock: 18,
    badge: "Best seller",
    description: "Low-dust ceramic brake pad set for quiet daily driving and reliable stopping power.",
    images: [
      "https://images.unsplash.com/photo-1600705722908-bab8bfbee606?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Toyota", model: "Vios", yearStart: 2014, yearEnd: 2022 },
      { make: "Toyota", model: "Yaris", yearStart: 2017, yearEnd: 2022 }
    ],
    specs: {
      Position: "Front axle",
      Material: "Ceramic compound",
      Warranty: "12 months",
      "OEM reference": "04465-0Dxxx"
    },
    tags: ["brake", "pads", "ceramic", "toyota", "vios"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=ceramic%20front%20brake%20pad%20toyota%20vios",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 2,
    sku: "AP-SUS-NIS-002",
    name: "Nissan Front Shock Absorber Pair",
    price: 358,
    category: "Suspension",
    brand: "KYB",
    stock: 11,
    badge: "Comfort ride",
    description: "Gas-charged front shock absorber pair that restores ride control and reduces nose dive.",
    images: [
      "https://images.unsplash.com/photo-1632823471565-1ecdf5c63f66?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Nissan", model: "Almera", yearStart: 2013, yearEnd: 2020 },
      { make: "Nissan", model: "Navara", yearStart: 2015, yearEnd: 2023 }
    ],
    specs: {
      Position: "Front left and right",
      Type: "Gas charged",
      Warranty: "12 months",
      Includes: "2 shock absorbers"
    },
    tags: ["shock absorber", "suspension", "nissan", "almera", "navara"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=nissan%20front%20shock%20absorber",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 3,
    sku: "AP-FLT-MAZ-003",
    name: "Mazda Premium Engine Oil Filter",
    price: 36,
    category: "Filters",
    brand: "MANN-FILTER",
    stock: 36,
    badge: "Service item",
    description: "High-filtration spin-on oil filter for Skyactiv petrol engines and regular service packages.",
    images: [
      "https://images.unsplash.com/photo-1635784069294-70e20d488e7d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Mazda", model: "Mazda 2", yearStart: 2015, yearEnd: 2023 },
      { make: "Mazda", model: "Mazda 3", yearStart: 2014, yearEnd: 2023 }
    ],
    specs: {
      Type: "Spin-on filter",
      Thread: "M20 x 1.5",
      Warranty: "6 months",
      "Service interval": "Up to 10,000 km"
    },
    tags: ["oil filter", "service", "mazda", "mazda 2", "mazda 3"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=mazda%20oil%20filter",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 4,
    sku: "AP-DSL-ISU-004",
    name: "Isuzu Diesel Fuel Filter",
    price: 86,
    category: "Filters",
    brand: "Denso",
    stock: 28,
    badge: "Diesel protection",
    description: "Water-separating diesel fuel filter designed to protect common-rail injectors.",
    images: [
      "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Isuzu", model: "D-Max", yearStart: 2012, yearEnd: 2023 },
      { make: "Isuzu", model: "MU-X", yearStart: 2015, yearEnd: 2023 }
    ],
    specs: {
      Type: "Diesel fuel filter",
      Function: "Water separation",
      "OEM reference": "8-98159-693-x",
      Warranty: "12 months"
    },
    tags: ["fuel filter", "diesel", "isuzu", "d-max", "mu-x"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=isuzu%20dmax%20fuel%20filter",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 5,
    sku: "AP-BRK-MIT-005",
    name: "Mitsubishi Rear Brake Shoe Set",
    price: 118,
    category: "Brakes",
    brand: "Akebono",
    stock: 17,
    badge: "OEM style",
    description: "Rear drum brake shoe set for dependable stopping power on compact Mitsubishi models.",
    images: [
      "https://images.unsplash.com/photo-1600705722908-bab8bfbee606?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Mitsubishi", model: "Attrage", yearStart: 2014, yearEnd: 2022 },
      { make: "Mitsubishi", model: "Triton", yearStart: 2015, yearEnd: 2023 }
    ],
    specs: {
      Position: "Rear axle",
      Type: "Brake shoe",
      Warranty: "12 months",
      Includes: "Left and right shoe set"
    },
    tags: ["brake shoe", "mitsubishi", "attrage", "triton"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=mitsubishi%20rear%20brake%20shoe",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 6,
    sku: "AP-HVY-HIN-006",
    name: "Hino Heavy-Duty Air Filter",
    price: 145,
    category: "Filters",
    brand: "Sakura",
    stock: 22,
    badge: "Truck ready",
    description: "High-flow air filter for commercial trucks that protects engines in dusty routes.",
    images: [
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Hino", model: "300 Series", yearStart: 2012, yearEnd: 2024 },
      { make: "Hino", model: "500 Series", yearStart: 2010, yearEnd: 2024 }
    ],
    specs: {
      Type: "Panel air filter",
      Application: "Light and medium duty truck",
      Warranty: "6 months",
      "Service interval": "Inspect every 10,000 km"
    },
    tags: ["air filter", "truck", "hino", "300 series", "500 series"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=hino%20air%20filter",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 7,
    sku: "AP-IGN-SUZ-007",
    name: "Suzuki Iridium Spark Plug Set",
    price: 168,
    category: "Engine",
    brand: "NGK",
    stock: 25,
    badge: "Fuel saver",
    description: "Four-piece iridium spark plug set for easier cold starts, smoother idle, and better combustion.",
    images: [
      "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Suzuki", model: "Swift", yearStart: 2012, yearEnd: 2022 },
      { make: "Suzuki", model: "Jimny", yearStart: 2019, yearEnd: 2024 }
    ],
    specs: {
      Quantity: "4 plugs",
      Electrode: "Iridium",
      Gap: "0.8 mm",
      Warranty: "12 months"
    },
    tags: ["spark plug", "iridium", "suzuki", "swift", "jimny"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=suzuki%20iridium%20spark%20plug",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 8,
    sku: "AP-BEL-FOR-008",
    name: "Ford Serpentine Drive Belt",
    price: 96,
    category: "Engine",
    brand: "Gates",
    stock: 19,
    badge: "Quiet running",
    description: "Multi-rib drive belt built for stable alternator, water pump, and accessory operation.",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Ford", model: "Ranger", yearStart: 2012, yearEnd: 2022 },
      { make: "Ford", model: "Everest", yearStart: 2015, yearEnd: 2022 }
    ],
    specs: {
      Type: "Serpentine belt",
      Ribs: "6PK",
      Warranty: "12 months",
      "Fitment note": "Confirm engine code before purchase"
    },
    tags: ["belt", "serpentine", "ford", "ranger", "everest"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=ford%20ranger%20drive%20belt",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 9,
    sku: "AP-LGT-CHE-009",
    name: "Chevrolet LED Headlamp Bulb Pair H7",
    price: 198,
    category: "Lighting",
    brand: "Philips",
    stock: 14,
    badge: "Bright upgrade",
    description: "Plug-and-play H7 LED bulb pair with focused beam pattern for better night visibility.",
    images: [
      "https://images.unsplash.com/photo-1597766353939-8a6c2bb85f38?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Chevrolet", model: "Cruze", yearStart: 2010, yearEnd: 2016 },
      { make: "Chevrolet", model: "Colorado", yearStart: 2012, yearEnd: 2020 }
    ],
    specs: {
      Fitment: "H7",
      Color: "6000K cool white",
      Voltage: "12V",
      Warranty: "12 months"
    },
    tags: ["headlamp", "led", "h7", "chevrolet", "cruze", "colorado"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=chevrolet%20h7%20led%20headlamp",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 10,
    sku: "AP-FLT-HON-010",
    name: "Honda Cabin Air Filter",
    price: 42,
    category: "Filters",
    brand: "Bosch",
    stock: 44,
    badge: "Fresh cabin",
    description: "Activated-carbon cabin filter that helps reduce dust, pollen, and traffic odors.",
    images: [
      "https://images.unsplash.com/photo-1635784069294-70e20d488e7d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Honda", model: "City", yearStart: 2014, yearEnd: 2023 },
      { make: "Honda", model: "Civic", yearStart: 2016, yearEnd: 2021 }
    ],
    specs: {
      Type: "Cabin filter",
      Material: "Activated carbon",
      Warranty: "6 months",
      "Service interval": "Replace every 12 months"
    },
    tags: ["cabin filter", "honda", "city", "civic"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=honda%20cabin%20air%20filter",
      tiktok: "https://shop.tiktok.com/"
    }
  }
];
