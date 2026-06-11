const storeSettings = {
  name: "AutoPro Parts",
  currency: "MYR",
  currencyLabel: "RM",
  whatsappNumber: "60123456789",
  paymentMerchantName: "AUTOPRO PARTS SDN BHD",
  paymentNote: "Replace this demo QR with your real bank or e-wallet merchant QR."
};

const products = [
  {
    id: 1,
    sku: "AP-BRK-TOY-001",
    name: "Ceramic Front Brake Pad Set",
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
    sku: "AP-FLT-HON-002",
    name: "Premium Engine Oil Filter",
    price: 32,
    category: "Filters",
    brand: "MANN-FILTER",
    stock: 42,
    badge: "Workshop pack",
    description: "High-filtration spin-on oil filter designed to protect engines during city traffic and highway runs.",
    images: [
      "https://images.unsplash.com/photo-1635784069294-70e20d488e7d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Honda", model: "City", yearStart: 2014, yearEnd: 2023 },
      { make: "Honda", model: "Civic", yearStart: 2016, yearEnd: 2021 }
    ],
    specs: {
      Type: "Spin-on filter",
      Thread: "M20 x 1.5",
      Warranty: "6 months",
      "Service interval": "Up to 10,000 km"
    },
    tags: ["oil filter", "service", "honda", "city", "civic"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=honda%20city%20oil%20filter",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 3,
    sku: "AP-IGN-PER-003",
    name: "Iridium Spark Plug Set",
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
      { make: "Perodua", model: "Myvi", yearStart: 2018, yearEnd: 2024 },
      { make: "Perodua", model: "Bezza", yearStart: 2016, yearEnd: 2024 }
    ],
    specs: {
      Quantity: "4 plugs",
      Electrode: "Iridium",
      Gap: "0.8 mm",
      Warranty: "12 months"
    },
    tags: ["spark plug", "iridium", "perodua", "myvi", "bezza"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=iridium%20spark%20plug%20myvi",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 4,
    sku: "AP-LGT-PRO-004",
    name: "LED Headlamp Bulb Pair H7",
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
      { make: "Proton", model: "Saga", yearStart: 2016, yearEnd: 2024 },
      { make: "Proton", model: "Persona", yearStart: 2016, yearEnd: 2022 }
    ],
    specs: {
      Fitment: "H7",
      Color: "6000K cool white",
      Voltage: "12V",
      Warranty: "12 months"
    },
    tags: ["headlamp", "led", "h7", "proton", "saga"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=h7%20led%20headlamp%20bulb",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 5,
    sku: "AP-BAT-UNI-005",
    name: "Maintenance-Free Car Battery NS60",
    price: 285,
    category: "Electrical",
    brand: "Century",
    stock: 9,
    badge: "Pickup today",
    description: "NS60 maintenance-free battery suitable for many compact sedans and hatchbacks.",
    images: [
      "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=900&q=80"
    ],
    vehicles: [
      { make: "Toyota", model: "Vios", yearStart: 2014, yearEnd: 2022 },
      { make: "Honda", model: "City", yearStart: 2014, yearEnd: 2023 },
      { make: "Perodua", model: "Myvi", yearStart: 2018, yearEnd: 2024 }
    ],
    specs: {
      Size: "NS60",
      Voltage: "12V",
      Capacity: "45Ah",
      Warranty: "18 months"
    },
    tags: ["battery", "ns60", "electrical", "toyota", "honda", "perodua"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=ns60%20maintenance%20free%20battery",
      tiktok: "https://shop.tiktok.com/"
    }
  },
  {
    id: 6,
    sku: "AP-SUS-UNI-006",
    name: "Front Shock Absorber Pair",
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
      { make: "Toyota", model: "Vios", yearStart: 2014, yearEnd: 2022 }
    ],
    specs: {
      Position: "Front left and right",
      Type: "Gas charged",
      Warranty: "12 months",
      Includes: "2 shock absorbers"
    },
    tags: ["shock absorber", "suspension", "nissan", "almera", "toyota"],
    links: {
      shopee: "https://shopee.com.my/search?keyword=front%20shock%20absorber%20pair",
      tiktok: "https://shop.tiktok.com/"
    }
  }
];
