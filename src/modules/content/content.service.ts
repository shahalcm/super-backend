// src/modules/content/content.service.ts
import mongoose from 'mongoose';
import {
  BannerModel,
  PromotionModel,
  EcosystemAppConfigModel,
  GroceryProductModel,
  PartnerBusinessModel,
  HotelRoomModel,
  ClinicDoctorModel,
} from '../../database/index.js';
import { calculateHaversineDistanceKm } from '../../utils/geo.js';

const defaultBanners = [
  {
    bannerId: 'bnr_super_welcome',
    app: 'ubssuper',
    title: 'Get 20% OFF Your First Grocery Order',
    subtitle: 'Use code SUPERWELCOME at checkout',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    targetCategory: 'grocery',
    displayOrder: 1,
    isActive: true,
  },
  {
    bannerId: 'bnr_taxi_fast',
    app: 'ubssuper',
    title: 'Fastest Cabs in Bengaluru',
    subtitle: 'Verified drivers at zero cancellation surge',
    imageUrl: 'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?auto=format&fit=crop&w=800&q=80',
    targetScreen: 'taxi',
    displayOrder: 2,
    isActive: true,
  },
];

const defaultPromotions = [
  {
    code: 'SUPERWELCOME',
    title: 'Welcome Discount ₹100 Flat OFF',
    app: 'ubssuper',
    discountType: 'flat',
    discountValue: 100,
    minOrderValue: 299,
    validUntil: new Date('2027-12-31'),
    isActive: true,
  },
];

const DEFAULT_GROCERY_STORES = [
  {
    partnerId: 'ptn_grocery_1',
    businessName: 'FreshBasket Supermarket Flagship',
    legalName: 'Varma Supermarkets Pvt Ltd',
    category: 'grocery',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=600&q=80',
    ],
    storeDescription: 'Premier flagship supermarket stocking farm-fresh produce, dairy, bakery, organic staples, and international imports.',
    cuisines: ['Supermarket', 'Organic Mart', 'Daily Fresh', 'Bakery'],
    rating: 4.88,
    ratingCount: 340,
    deliveryFee: 0,
    minOrderAmount: 199,
    estimatedDeliveryMinutes: 20,
    operatingHours: { openTime: '08:00', closeTime: '22:30', isOpen: true },
    deliveryAvailable: true,
    address: 'Plot 42, 12th Main Road, Indiranagar',
    city: 'Bengaluru',
    ownerPhone: '9876540001',
    location: { type: 'Point', coordinates: [77.6387, 12.9784] },
  },
  {
    partnerId: 'ptn_grocery_2',
    businessName: 'Green Leaf Organic Mart',
    legalName: 'Green Leaf Bio-Retail Pvt Ltd',
    category: 'grocery',
    logo: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1543083477-4f785aeafaa9?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1543083477-4f785aeafaa9?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=600&q=80',
    ],
    storeDescription: 'Certified 100% natural, pesticide-free harvest, heritage rice, cold-pressed artisanal oils, and chemical-free pantry essentials.',
    cuisines: ['100% Organic', 'Farm Fresh', 'Cold-Pressed', 'Gourmet'],
    rating: 4.92,
    ratingCount: 215,
    deliveryFee: 25,
    minOrderAmount: 249,
    estimatedDeliveryMinutes: 25,
    operatingHours: { openTime: '08:30', closeTime: '21:30', isOpen: true },
    deliveryAvailable: true,
    address: 'Shop 14, Calicut Road, Near Bus Terminal',
    city: 'Manjeri',
    ownerPhone: '9876540004',
    location: { type: 'Point', coordinates: [76.1215, 11.1215] },
  },
  {
    partnerId: 'ptn_grocery_3',
    businessName: 'Express Daily Convenience Mart',
    legalName: 'Daily Convenience Retail LLP',
    category: 'grocery',
    logo: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
    ],
    storeDescription: 'Ultra-fast neighborhood convenience store for quick top-ups: milk, breads, chips, cold sodas, and emergency daily staples.',
    cuisines: ['Express Mart', 'Snacks & Drinks', 'Dairy & Bakery'],
    rating: 4.74,
    ratingCount: 180,
    deliveryFee: 20,
    minOrderAmount: 99,
    estimatedDeliveryMinutes: 15,
    operatingHours: { openTime: '07:00', closeTime: '23:30', isOpen: true },
    deliveryAvailable: true,
    address: 'Kinfra Industrial Road, Down Hill',
    city: 'Malappuram',
    ownerPhone: '9876540005',
    location: { type: 'Point', coordinates: [76.0711, 11.0732] },
  },
];

const DEFAULT_RESTAURANTS = [
  {
    partnerId: 'r1',
    businessName: 'Malabar Kitchen',
    legalName: 'Malabar Culinary Heritage Pvt Ltd',
    category: 'restaurant',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80',
    ],
    storeDescription: 'Legendary Malabar dum biriyani, soft layered parottas, Kozhikodan chicken curry, and fresh seafood delicacies cooked with authentic heritage spices.',
    cuisines: ['Biriyani', 'Malabar', 'South Indian', 'Kerala Seafood'],
    rating: 4.82,
    ratingCount: 520,
    deliveryFee: 25,
    minOrderAmount: 199,
    estimatedDeliveryMinutes: 30,
    operatingHours: { openTime: '11:00', closeTime: '23:00', isOpen: true },
    deliveryAvailable: true,
    address: 'Court Road, Civil Station Junction',
    city: 'Manjeri',
    ownerPhone: '9876540006',
    location: { type: 'Point', coordinates: [76.1234, 11.1245] },
  },
  {
    partnerId: 'r2',
    businessName: 'Nahdi Mandi Arabian Restaurant',
    legalName: 'Nahdi Arabian Hospitality LLC',
    category: 'restaurant',
    logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
    ],
    storeDescription: 'Sizzling charcoal grilled Al Faham, traditional pit-cooked Yemeni Mutton Mandi, garlic toum, and gourmet Arabian platters.',
    cuisines: ['Arabian', 'Mandi', 'Charcoal Grill', 'Shawarma'],
    rating: 4.75,
    ratingCount: 410,
    deliveryFee: 30,
    minOrderAmount: 299,
    estimatedDeliveryMinutes: 35,
    operatingHours: { openTime: '12:00', closeTime: '00:00', isOpen: true },
    deliveryAvailable: true,
    address: 'Near Jubilee Mission, By-Pass Road',
    city: 'Manjeri',
    ownerPhone: '9876540007',
    location: { type: 'Point', coordinates: [76.1189, 11.1278] },
  },
  {
    partnerId: 'r3',
    businessName: 'Burger Hub & Smokehouse',
    legalName: 'Urban Grillhouse & Cafe LLP',
    category: 'restaurant',
    logo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    ],
    storeDescription: 'Artisan brioche smash burgers, loaded molten cheese fries, crispy peri peri wings, and thick monster milkshakes.',
    cuisines: ['Burgers', 'Fast Food', 'Beverages', 'American'],
    rating: 4.65,
    ratingCount: 290,
    deliveryFee: 20,
    minOrderAmount: 149,
    estimatedDeliveryMinutes: 25,
    operatingHours: { openTime: '13:00', closeTime: '23:30', isOpen: true },
    deliveryAvailable: true,
    address: 'Seethi Haji Complex, Central Junction',
    city: 'Manjeri',
    ownerPhone: '9876540008',
    location: { type: 'Point', coordinates: [76.1267, 11.1198] },
  },
  {
    partnerId: 'r4',
    businessName: 'Pizza Palace & Italian Trattoria',
    legalName: 'Palace Bakes & Trattoria Pvt Ltd',
    category: 'restaurant',
    logo: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=200&q=80',
    coverImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    ],
    storeDescription: 'Handcrafted wood-fired sourdough pizzas, creamy penne alfredo, stuffed cheesy garlic loaves, and tiramisu.',
    cuisines: ['Pizza', 'Italian', 'Pasta', 'Desserts'],
    rating: 4.68,
    ratingCount: 310,
    deliveryFee: 25,
    minOrderAmount: 249,
    estimatedDeliveryMinutes: 30,
    operatingHours: { openTime: '11:30', closeTime: '23:00', isOpen: true },
    deliveryAvailable: true,
    address: 'Opposite Royal Mall, Calicut Road',
    city: 'Manjeri',
    ownerPhone: '9876540009',
    location: { type: 'Point', coordinates: [76.1205, 11.1221] },
  },
];

const DEFAULT_STORE_PRODUCTS: Record<string, any[]> = {
  ptn_grocery_1: [
    {
      id: 'prod_atta_10k',
      productId: 'prod_atta_10k',
      partnerId: 'ptn_grocery_1',
      name: 'Aashirvaad Superior MP Sharbati Atta 10kg',
      category: 'Staples & Grains',
      price: 465,
      sellingPrice: 465,
      originalPrice: 520,
      mrp: 520,
      unit: '10 kg',
      image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80',
      description: '100% pure Sharbati whole wheat grains harvested from Madhya Pradesh for ultra-soft, fluffy rotis.',
      inStock: true,
      rating: 4.9,
      discountPercentage: 11,
      isBestSeller: true,
    },
    {
      id: 'prod_milk_1l',
      productId: 'prod_milk_1l',
      partnerId: 'ptn_grocery_1',
      name: 'Amul Taaza Homogenised Toned Milk 1L',
      category: 'Dairy & Eggs',
      price: 72,
      sellingPrice: 72,
      originalPrice: 75,
      mrp: 75,
      unit: '1 L',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
      description: 'Freshly packed homogenized pasteurized toned milk with balanced calcium and nutrients.',
      inStock: true,
      rating: 4.8,
      discountPercentage: 4,
      isBestSeller: true,
    },
    {
      id: 'prod_oil_1l',
      productId: 'prod_oil_1l',
      partnerId: 'ptn_grocery_1',
      name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
      category: 'Oils & Spices',
      price: 135,
      sellingPrice: 135,
      originalPrice: 155,
      mrp: 155,
      unit: '1 L',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
      description: 'Light, healthy cooking oil enriched with Vitamins A & D.',
      inStock: true,
      rating: 4.7,
      discountPercentage: 13,
      isBestSeller: false,
    },
    {
      id: 'prod_banana_1k',
      productId: 'prod_banana_1k',
      partnerId: 'ptn_grocery_1',
      name: 'Fresh Robusta Golden Bananas',
      category: 'Fruits & Veggies',
      price: 48,
      sellingPrice: 48,
      originalPrice: 60,
      mrp: 60,
      unit: '1 kg',
      image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80',
      description: 'Sweet, energy-rich naturally ripened golden robusta bananas.',
      inStock: true,
      rating: 4.8,
      discountPercentage: 20,
      isBestSeller: true,
    },
    {
      id: 'prod_bread_brown',
      productId: 'prod_bread_brown',
      partnerId: 'ptn_grocery_1',
      name: 'Modern 100% Whole Wheat Brown Bread',
      category: 'Bakery',
      price: 45,
      sellingPrice: 45,
      originalPrice: 50,
      mrp: 50,
      unit: '400g',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
      description: 'Fiber-rich whole wheat baked bread with no added maida.',
      inStock: true,
      rating: 4.7,
      discountPercentage: 10,
      isBestSeller: false,
    },
    {
      id: 'prod_eggs_12',
      productId: 'prod_eggs_12',
      partnerId: 'ptn_grocery_1',
      name: 'Farm Fresh White Eggs Pack of 12',
      category: 'Dairy & Eggs',
      price: 78,
      sellingPrice: 78,
      originalPrice: 90,
      mrp: 90,
      unit: '12 pcs',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80',
      description: 'Carefully sorted, protein-rich farm eggs with thick yellow yolks.',
      inStock: true,
      rating: 4.9,
      discountPercentage: 13,
      isBestSeller: true,
    },
  ],
  ptn_grocery_2: [
    {
      id: 'prod_org_veg_basket',
      productId: 'prod_org_veg_basket',
      partnerId: 'ptn_grocery_2',
      name: 'Organic Morning Harvest Vegetable Basket',
      category: 'Fruits & Veggies',
      price: 249,
      sellingPrice: 249,
      originalPrice: 299,
      mrp: 299,
      unit: '3 kg box',
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80',
      description: 'Handpicked daily harvest: organic tomatoes, carrots, spinach, potatoes, and cucumbers.',
      inStock: true,
      rating: 4.95,
      discountPercentage: 17,
      isBestSeller: true,
      isOrganic: true,
    },
    {
      id: 'prod_org_coconut_oil',
      productId: 'prod_org_coconut_oil',
      partnerId: 'ptn_grocery_2',
      name: 'Cold-Pressed Virgin Coconut Oil 500ml',
      category: 'Oils & Spices',
      price: 285,
      sellingPrice: 285,
      originalPrice: 320,
      mrp: 320,
      unit: '500 ml',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80',
      description: 'Wood-churned traditional Kerala coconut oil from fresh mature copras.',
      inStock: true,
      rating: 4.9,
      discountPercentage: 11,
      isBestSeller: true,
      isOrganic: true,
    },
    {
      id: 'prod_org_honey',
      productId: 'prod_org_honey',
      partnerId: 'ptn_grocery_2',
      name: 'Raw Wild Forest Honey 500g',
      category: 'Snacks & Munchies',
      price: 340,
      sellingPrice: 340,
      originalPrice: 390,
      mrp: 390,
      unit: '500g',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80',
      description: 'Unprocessed pure multi-flower honey ethically harvested from Western Ghats apiaries.',
      inStock: true,
      rating: 4.9,
      discountPercentage: 12,
      isOrganic: true,
    },
  ],
  r1: [
    {
      id: 'dish_m1',
      restaurantId: 'r1',
      partnerId: 'r1',
      name: 'Special Malabar Dum Chicken Biriyani',
      category: 'Biriyani Specials',
      price: 240,
      sellingPrice: 240,
      originalPrice: 280,
      mrp: 280,
      unit: '1 Portion',
      image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80',
      description: 'Fragrant Kaima rice steamed with tender chicken pieces, caramelized onions, cashews, and aromatic spices. Served with raita, pickle, and date chutney.',
      inStock: true,
      isVeg: false,
      isBestseller: true,
      rating: 4.9,
    },
    {
      id: 'dish_m2',
      restaurantId: 'r1',
      partnerId: 'r1',
      name: 'Kerala Layered Flaky Parotta (3 Pcs)',
      category: 'Curries & Parotta',
      price: 60,
      sellingPrice: 60,
      originalPrice: 75,
      mrp: 75,
      unit: '3 Pcs',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
      description: 'Crisp on the outside, soft and flaky layered parottas made traditional style.',
      inStock: true,
      isVeg: true,
      isBestseller: true,
      rating: 4.8,
    },
    {
      id: 'dish_m3',
      restaurantId: 'r1',
      partnerId: 'r1',
      name: 'Nadan Chicken Roast Masala',
      category: 'Curries & Parotta',
      price: 220,
      sellingPrice: 220,
      originalPrice: 250,
      mrp: 250,
      unit: '1 Portion',
      image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80',
      description: 'Succulent chicken slow-roasted with shallots, curry leaves, and crushed peppercorns in rich brown gravy.',
      inStock: true,
      isVeg: false,
      isBestseller: true,
      rating: 4.8,
    },
    {
      id: 'dish_m4',
      restaurantId: 'r1',
      partnerId: 'r1',
      name: 'Sulaimani Spiced Black Tea',
      category: 'Beverages & Desserts',
      price: 25,
      sellingPrice: 25,
      originalPrice: 30,
      mrp: 30,
      unit: '1 Glass',
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80',
      description: 'Traditional Malabar spiced tea infused with cardamom, mint, and fresh lemon juice.',
      inStock: true,
      isVeg: true,
      isBestseller: false,
      rating: 4.7,
    },
  ],
  r2: [
    {
      id: 'dish_mandi_1',
      restaurantId: 'r2',
      partnerId: 'r2',
      name: 'Authentic Yemeni Chicken Mandi',
      category: 'Arabian Charcoal',
      price: 290,
      sellingPrice: 290,
      originalPrice: 340,
      mrp: 340,
      unit: 'Quarter Plate',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
      description: 'Slow pit-cooked tender chicken over aromatic spiced long-grain basmati rice. Served with tomato salsa and garlic toum.',
      inStock: true,
      isVeg: false,
      isBestseller: true,
      rating: 4.9,
    },
    {
      id: 'dish_alfaham_1',
      restaurantId: 'r2',
      partnerId: 'r2',
      name: 'Pepper Charcoal Al Faham',
      category: 'Arabian Charcoal',
      price: 210,
      sellingPrice: 210,
      originalPrice: 240,
      mrp: 240,
      unit: 'Half Chicken',
      image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=400&q=80',
      description: 'Chicken marinated in crushed black peppercorns and Middle Eastern spices, grilled over natural wood charcoal.',
      inStock: true,
      isVeg: false,
      isBestseller: true,
      rating: 4.8,
    },
  ],
};

export class ContentService {
  async getBanners(app = 'ubssuper') {
    if (mongoose.connection.readyState === 1) {
      try {
        const banners = await BannerModel.find({
          app: { $in: [app, 'all'] },
          isActive: true,
        }).sort({ displayOrder: 1 });
        if (banners && banners.length > 0) return banners;
      } catch {
        // Fallback to default
      }
    }
    return defaultBanners.filter((b) => b.app === app || b.app === 'all');
  }

  async getPromotions(app = 'all') {
    if (mongoose.connection.readyState === 1) {
      try {
        const promotions = await PromotionModel.find({
          app: { $in: [app, 'all'] },
          isActive: true,
          validUntil: { $gte: new Date() },
        }).sort({ createdAt: -1 });
        if (promotions && promotions.length > 0) return promotions;
      } catch {
        // Fallback
      }
    }
    return defaultPromotions;
  }

  async getEcosystemStatus() {
    if (mongoose.connection.readyState === 1) {
      try {
        const apps = await EcosystemAppConfigModel.find();
        if (apps && apps.length > 0) return apps;
      } catch {
        // Fallback
      }
    }
    return [
      { appId: 'ubssuper', status: 'active', version: '2.4.1' },
      { appId: 'taxi', status: 'active', version: '1.9.0' },
      { appId: 'delivery', status: 'active', version: '1.5.2' },
      { appId: 'partner', status: 'active', version: '2.1.0' },
    ];
  }

  async getCategories() {
    return [
      { id: 'grocery', name: 'Daily Grocery', slug: 'grocery', icon: 'shopping-basket', isActive: true },
      { id: 'food', name: 'Food Delivery', slug: 'food', icon: 'utensils', isActive: true },
      { id: 'taxi', name: 'Super Taxi', slug: 'taxi', icon: 'car', isActive: true },
      { id: 'hotel', name: 'Hotel Bookings', slug: 'hotel', icon: 'hotel', isActive: true },
      { id: 'clinic', name: 'Doctor & Clinics', slug: 'clinic', icon: 'stethoscope', isActive: true },
      { id: 'logistics', name: 'Parcel & Logistics', slug: 'logistics', icon: 'truck', isActive: true },
    ];
  }

  // --- Store & Restaurant Discovery ---
  async getStores(options: {
    category?: string;
    lat?: number;
    lng?: number;
    search?: string;
    sort?: string;
    cuisine?: string;
    isOpen?: boolean;
    deliveryAvailable?: boolean;
  }) {
    const requestedCat = options.category === 'food' ? 'restaurant' : options.category;
    let list: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const filter: any = {
          status: { $in: ['approved', 'active'] },
        };
        if (requestedCat && requestedCat !== 'all') {
          filter.category = requestedCat;
        }

        const dbPartners = await PartnerBusinessModel.find(filter).lean();
        if (dbPartners && dbPartners.length > 0) {
          list = dbPartners;
        }
      } catch {
        // Fallback
      }
    }

    if (list.length === 0) {
      if (requestedCat === 'restaurant') {
        list = [...DEFAULT_RESTAURANTS];
      } else if (requestedCat === 'grocery') {
        list = [...DEFAULT_GROCERY_STORES];
      } else {
        list = [...DEFAULT_GROCERY_STORES, ...DEFAULT_RESTAURANTS];
      }
    }

    // Customer Coordinates
    const customerCoords =
      options.lat && options.lng
        ? { latitude: Number(options.lat), longitude: Number(options.lng) }
        : null;

    // Map & Enrich Stores
    let stores = list.map((p) => {
      let distKm: number | null = null;
      if (customerCoords && p.location?.coordinates && p.location.coordinates.length === 2) {
        distKm = calculateHaversineDistanceKm(customerCoords, {
          longitude: p.location.coordinates[0],
          latitude: p.location.coordinates[1],
        });
      }

      const defaultCover =
        p.category === 'restaurant'
          ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80';

      const defaultLogo =
        p.category === 'restaurant'
          ? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80'
          : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80';

      const coverImg = p.coverImage || (p as any).bannerImage || defaultCover;
      const logoImg = p.logo || (p as any).logoUrl || defaultLogo;
      const cuisines =
        p.cuisines && p.cuisines.length > 0
          ? p.cuisines
          : p.category === 'restaurant'
          ? ['Malabar', 'Biriyani', 'Grill']
          : ['Supermarket', 'Daily Essentials', 'Organic Mart'];

      const minDeliveryMinutes = p.estimatedDeliveryMinutes || 20;

      return {
        id: p.partnerId || p._id?.toString() || p.id,
        partnerId: p.partnerId || p._id?.toString() || p.id,
        name: p.businessName || (p as any).name,
        legalName: p.legalName,
        category: p.category,
        logo: logoImg,
        coverImage: coverImg,
        image: coverImg, // backwards compatibility
        galleryImages: p.galleryImages && p.galleryImages.length > 0 ? p.galleryImages : [coverImg],
        storeDescription: p.storeDescription || (p as any).description || '',
        cuisines,
        rating: p.rating || 4.8,
        ratingCount: (p as any).ratingCount || 150,
        distance: distKm !== null ? `${distKm.toFixed(1)} km` : undefined,
        distanceKm: distKm,
        deliveryTime: `${minDeliveryMinutes}-${minDeliveryMinutes + 10} mins`,
        deliveryFee: p.deliveryFee !== undefined ? p.deliveryFee : distKm && distKm < 3 ? 0 : 25,
        minOrderAmount: p.minOrderAmount || 149,
        isOpen: p.operatingHours?.isOpen !== false,
        deliveryAvailable: p.deliveryAvailable !== false,
        operatingHours: p.operatingHours || { openTime: '08:30', closeTime: '22:30', isOpen: true },
        address: p.address || 'Emerald Heights, Manjeri',
        city: p.city || 'Manjeri',
        ownerPhone: p.ownerPhone,
        location: p.location || (p.latitude && p.longitude ? { type: 'Point', coordinates: [Number(p.longitude), Number(p.latitude)] } : undefined),
        latitude: p.location?.coordinates?.[1] ?? (p as any).latitude ?? (p.location?.coordinates ? p.location.coordinates[1] : undefined),
        longitude: p.location?.coordinates?.[0] ?? (p as any).longitude ?? (p.location?.coordinates ? p.location.coordinates[0] : undefined),
      };
    });

    // Apply Search Filter
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      stores = stores.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.storeDescription.toLowerCase().includes(q) ||
          s.cuisines.some((c: string) => c.toLowerCase().includes(q)) ||
          s.city.toLowerCase().includes(q)
      );
    }

    // Apply Cuisine / Category Pill Filter
    if (options.cuisine && options.cuisine !== 'All') {
      const cui = options.cuisine.toLowerCase();
      stores = stores.filter((s) => s.cuisines.some((c: string) => c.toLowerCase().includes(cui)));
    }

    // Filter Open / Delivery
    if (options.isOpen === true) {
      stores = stores.filter((s) => s.isOpen);
    }
    if (options.deliveryAvailable === true) {
      stores = stores.filter((s) => s.deliveryAvailable);
    }

    // Apply Sorting
    if (options.sort === 'distance' && customerCoords) {
      stores.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else if (options.sort === 'rating') {
      stores.sort((a, b) => b.rating - a.rating);
    } else if (options.sort === 'deliveryTime') {
      stores.sort((a, b) => {
        const aMins = parseInt(a.deliveryTime, 10) || 30;
        const bMins = parseInt(b.deliveryTime, 10) || 30;
        return aMins - bMins;
      });
    } else if (options.sort === 'minOrder') {
      stores.sort((a, b) => a.minOrderAmount - b.minOrderAmount);
    }

    return stores;
  }

  async getNearbyStores(options: {
    category?: string;
    latitude: number;
    longitude: number;
    radius?: number;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const lat = Number(options.latitude);
    const lng = Number(options.longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180');
    }

    const radiusKm = Math.max(1, Math.min(100, Number(options.radius) || 15));
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(options.limit) || 20));
    const requestedCategory = options.category === 'food' ? 'restaurant' : options.category;

    // Call getStores which computes Haversine distance, enriches data, and falls back to seeds if DB is empty
    const allEnriched = await this.getStores({
      category: requestedCategory,
      lat,
      lng,
      search: options.search,
      sort: 'distance',
    });

    // Filter by radius if stores have coordinates
    let filtered = allEnriched.filter((s) => s.distanceKm === null || s.distanceKm <= radiusKm);
    if (filtered.length === 0 && allEnriched.length > 0) {
      // Graceful fallback: return closest available stores so customer always sees options
      filtered = allEnriched;
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedStores = filtered.slice(startIndex, startIndex + limit);

    return {
      stores: paginatedStores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      searchCenter: {
        latitude: lat,
        longitude: lng,
        radiusKm,
      },
    };
  }

  async getStoreById(storeId: string, lat?: number, lng?: number) {
    const stores = await this.getStores({ lat, lng });
    const found = stores.find((s) => s.id === storeId || s.partnerId === storeId);
    if (found) return found;

    // Check directly in database if not in top query
    if (mongoose.connection.readyState === 1) {
      const dbPartner = await PartnerBusinessModel.findOne({ partnerId: storeId }).lean();
      if (dbPartner) {
        const enriched = await this.getStores({ category: dbPartner.category, lat, lng });
        return enriched.find((s) => s.id === storeId || s.partnerId === storeId) || dbPartner;
      }
    }

    // Fallback search across defaults
    const fallbackAll = [...DEFAULT_GROCERY_STORES, ...DEFAULT_RESTAURANTS];
    const fb = fallbackAll.find((s) => s.partnerId === storeId);
    if (fb) {
      const enriched = await this.getStores({ category: fb.category, lat, lng });
      return enriched.find((s) => s.id === storeId) || fb;
    }

    return null;
  }

  async getStoreProducts(storeId: string, category?: string, search?: string) {
    let products: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = { partnerId: storeId, inStock: true };
        if (category && category !== 'All') {
          query.category = category;
        }
        if (search && search.trim()) {
          query.name = { $regex: search.trim(), $options: 'i' };
        }
        const dbItems = await GroceryProductModel.find(query).sort({ isFeatured: -1, createdAt: -1 }).lean();
        if (dbItems && dbItems.length > 0) {
          products = dbItems.map((p) => ({
            id: p.productId || p._id?.toString(),
            productId: p.productId || p._id?.toString(),
            partnerId: p.partnerId,
            name: p.name,
            brand: p.brand,
            category: p.category,
            price: p.sellingPrice,
            sellingPrice: p.sellingPrice,
            originalPrice: p.mrp || p.sellingPrice,
            mrp: p.mrp || p.sellingPrice,
            unit: p.unit || '1 unit',
            image: p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
            description: p.description || '',
            inStock: p.inStock,
            isFeatured: p.isFeatured,
            isVeg: p.isVeg !== false,
            discountPercentage: p.discountPercentage || 0,
            rating: p.rating || 4.8,
            ratingCount: p.ratingCount || 120,
          }));
        }
      } catch {
        // Fallback
      }
    }

    // Fallback store products
    if (products.length === 0) {
      const preset = DEFAULT_STORE_PRODUCTS[storeId] || DEFAULT_STORE_PRODUCTS['ptn_grocery_1'] || [];
      products = preset.map((p) => ({
        ...p,
        partnerId: storeId,
      }));
    }

    // In-memory filter if needed
    if (category && category !== 'All') {
      products = products.filter((p) => p.category === category);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    return products;
  }

  async getGroceryCatalog(category?: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        const filter: any = { inStock: true };
        if (category && category !== 'All') {
          filter.category = category;
        }
        return await GroceryProductModel.find(filter).sort({ isFeatured: -1, createdAt: -1 });
      } catch {
        // Fallback
      }
    }
    return [];
  }

  async getNearbyPartners(category?: string, lat?: number, lng?: number) {
    return this.getStores({ category, lat, lng });
  }

  async getHotels() {
    if (mongoose.connection.readyState === 1) {
      try {
        return await HotelRoomModel.find({ isAvailable: true }).limit(20);
      } catch {
        // Fallback
      }
    }
    return [];
  }

  async getDoctors() {
    if (mongoose.connection.readyState === 1) {
      try {
        return await ClinicDoctorModel.find({ isAvailable: true }).limit(20);
      } catch {
        // Fallback
      }
    }
    return [];
  }
}

export const contentService = new ContentService();
