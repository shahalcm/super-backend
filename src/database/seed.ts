// src/database/seed.ts
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import {
  UserModel,
  CustomerProfileModel,
  TaxiDriverModel,
  DeliveryRiderModel,
  PartnerBusinessModel,
  GroceryProductModel,
  HotelRoomModel,
  ClinicDoctorModel,
  BannerModel,
  PromotionModel,
  EcosystemAppConfigModel,
  CommissionRuleModel,
  SubscriptionPlanModel,
  PropertyModel,
  PropertyListingFeeModel,
} from './index.js';
import { hashPassword } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

export async function seedDatabase() {
  await connectDatabase();
  logger.info('🌱 Starting UBSSuper Ecosystem Database Seeding...');

  // 1. Ecosystem App Configurations
  const apps = [
    {
      appId: 'ubssuper',
      name: 'UBSSuper Main Consumer App',
      version: '2.4.1',
      minSupportedVersion: '2.1.0',
      status: 'active',
      maintenanceNotice: 'All systems operational.',
      enabledFeatures: {
        grocery: true,
        food: true,
        taxi_booking: true,
        hotel_reservations: true,
        doctor_appointments: true,
        logistics: true,
        in_app_wallet: true,
        razorpay_checkout: true,
      },
      supportedRegions: ['All India', 'Karnataka', 'Maharashtra', 'Delhi-NCR'],
    },
    {
      appId: 'taxi',
      name: 'UBSSuper Taxi & Rides',
      version: '1.9.0',
      minSupportedVersion: '1.7.0',
      status: 'active',
      maintenanceNotice: 'Smooth dispatch running.',
      enabledFeatures: {
        instant_booking: true,
        scheduled_rides: true,
        auto_dispatch: true,
        surge_pricing: false,
        cash_payments: true,
        driver_heatmaps: true,
      },
      supportedRegions: ['All India', 'Bengaluru', 'Mumbai', 'Delhi-NCR'],
    },
    {
      appId: 'delivery',
      name: 'UBS Delivery Partner App',
      version: '1.5.2',
      minSupportedVersion: '1.4.0',
      status: 'active',
      maintenanceNotice: 'Quick pickup routing enabled.',
      enabledFeatures: {
        instant_order_broadcast: true,
        photo_proof_delivery: true,
        multi_drop_routing: false,
        cash_collection: true,
      },
      supportedRegions: ['All India', 'Bengaluru'],
    },
    {
      appId: 'partner',
      name: 'UBS Partner Business Console',
      version: '2.1.0',
      minSupportedVersion: '2.0.0',
      status: 'active',
      maintenanceNotice: 'Merchant settlements on schedule.',
      enabledFeatures: {
        catalog_management: true,
        instant_order_notifications: true,
        hotel_room_reservations: true,
        clinic_doctor_schedules: true,
        razorpay_custom_keys: true,
      },
      supportedRegions: ['All India'],
    },
  ];

  for (const a of apps) {
    await EcosystemAppConfigModel.findOneAndUpdate({ appId: a.appId }, { $set: a }, { upsert: true });
  }

  // 2. Universal Master Test Account (Works in UBS Super, Taxi, Partner, and Delivery)
  const adminPassword = await hashPassword('AdminPass2026!');
  const masterUser = await UserModel.findOneAndUpdate(
    { phone: '9999999999' },
    {
      userId: 'usr_super_admin',
      phone: '9999999999',
      email: 'admin@ubssuper.com',
      fullName: 'Devansh Sharma (Universal Master Test Account)',
      passwordHash: adminPassword,
      roles: ['CUSTOMER', 'TAXI_DRIVER', 'DELIVERY_RIDER', 'PARTNER_OWNER', 'ADMIN', 'SUPER_ADMIN'],
      currentRole: 'CUSTOMER',
      partnerBusinessId: 'ptn_master_9999',
      taxiDriverProfileId: 'drv_master_9999',
      deliveryRiderProfileId: 'rdr_master_9999',
      location: { type: 'Point', coordinates: [77.6387, 12.9784] },
      status: 'active',
    },
    { upsert: true, new: true }
  );

  // Master Customer Profile
  await CustomerProfileModel.findOneAndUpdate(
    { userId: masterUser.userId },
    {
      userId: masterUser.userId,
      walletBalance: 2500,
      savedAddresses: [
        {
          id: 'addr_master_home_1',
          label: 'Home',
          addressLine: 'Plot 101, 12th Main Road, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          location: { type: 'Point', coordinates: [77.6387, 12.9784] },
          isDefault: true,
        },
      ],
    },
    { upsert: true }
  );

  // Master Taxi Driver Profile (Approved & Active)
  await TaxiDriverModel.findOneAndUpdate(
    { driverId: 'drv_master_9999' },
    {
      driverId: 'drv_master_9999',
      userId: masterUser.userId,
      fullName: 'Devansh Sharma (Test Driver)',
      phone: '9999999999',
      vehicleType: 'Sedan',
      vehicleModel: 'Toyota Innova Crysta',
      registrationNumber: 'KA-01-MJ-9999',
      status: 'approved',
      isOnline: true,
      isBusy: false,
      rating: 4.98,
      totalRides: 450,
      totalEarnings: 84200,
      commissionPaid: 12630,
      outstandingPayout: 6400,
      currentLocation: {
        type: 'Point',
        coordinates: [77.6387, 12.9784],
        heading: 0,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  // Master Partner Business Profile (Approved Grocery Flagship)
  await PartnerBusinessModel.findOneAndUpdate(
    { partnerId: 'ptn_master_9999' },
    {
      partnerId: 'ptn_master_9999',
      userId: masterUser.userId,
      businessName: 'UBS Supermart & Gourmet Flagship',
      legalName: 'UBS Supermart Retail India Pvt Ltd',
      category: 'grocery',
      ownerName: 'Devansh Sharma',
      ownerPhone: '9999999999',
      ownerEmail: 'partner@ubssuper.com',
      status: 'approved',
      registrationFee: { amount: 999, currency: 'INR', isPaid: true },
      rating: 4.95,
      totalOrders: 1820,
      totalRevenue: 520000,
      deliveryFee: 0,
      minOrderAmount: 199,
      estimatedDeliveryMinutes: 20,
      deliveryAvailable: true,
      operatingHours: { openTime: '07:00', closeTime: '23:00', isOpen: true },
      address: 'Plot 101, 12th Main Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560038',
      location: { type: 'Point', coordinates: [77.6387, 12.9784] },
    },
    { upsert: true }
  );

  // Master Delivery Rider Profile (Approved & Active)
  await DeliveryRiderModel.findOneAndUpdate(
    { riderId: 'rdr_master_9999' },
    {
      riderId: 'rdr_master_9999',
      userId: masterUser.userId,
      fullName: 'Devansh Sharma (Test Rider)',
      phone: '9999999999',
      vehicleType: 'motorcycle',
      status: 'approved',
      isOnline: true,
      rating: 4.96,
      totalDeliveries: 380,
      currentZone: 'Indiranagar, Bengaluru',
      currentLocation: {
        type: 'Point',
        coordinates: [77.6387, 12.9784],
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  // 3. Sample Customer
  const custUser = await UserModel.findOneAndUpdate(
    { phone: '9876543210' },
    {
      userId: 'usr_customer_demo',
      phone: '9876543210',
      email: 'customer@ubssuper.com',
      fullName: 'Anas Rahmaan',
      roles: ['CUSTOMER', 'TAXI_DRIVER', 'DELIVERY_RIDER', 'PARTNER_OWNER'],
      currentRole: 'CUSTOMER',
      partnerBusinessId: 'ptn_grocery_1',
      taxiDriverProfileId: 'drv_ramesh_1',
      deliveryRiderProfileId: 'rdr_vikram_1',
      location: { type: 'Point', coordinates: [77.6387, 12.9784] },
      status: 'active',
    },
    { upsert: true, new: true }
  );

  await CustomerProfileModel.findOneAndUpdate(
    { userId: custUser.userId },
    {
      userId: custUser.userId,
      walletBalance: 750,
      savedAddresses: [
        {
          id: 'addr_home_1',
          label: 'Home',
          addressLine: 'Flat 402, Green Glen Heights, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          location: { type: 'Point', coordinates: [77.6387, 12.9784] },
          isDefault: true,
        },
      ],
    },
    { upsert: true }
  );

  // 4. Sample Grocery Partner
  const partnerUser = await UserModel.findOneAndUpdate(
    { phone: '9876540001' },
    {
      userId: 'usr_partner_grocery',
      phone: '9876540001',
      email: 'freshbasket@ubspartner.com',
      fullName: 'Rajesh Varma',
      roles: ['PARTNER_OWNER'],
      currentRole: 'PARTNER_OWNER',
      partnerBusinessId: 'ptn_grocery_1',
      status: 'active',
    },
    { upsert: true, new: true }
  );

  await PartnerBusinessModel.findOneAndUpdate(
    { partnerId: 'ptn_grocery_1' },
    {
      partnerId: 'ptn_grocery_1',
      userId: partnerUser.userId,
      businessName: 'FreshBasket Supermarket Flagship',
      legalName: 'Varma Supermarkets Pvt Ltd',
      category: 'grocery',
      ownerName: 'Rajesh Varma',
      ownerPhone: '9876540001',
      ownerEmail: 'finance@freshbasket.com',
      status: 'approved',
      registrationFee: { amount: 999, currency: 'INR', isPaid: true },
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
      totalOrders: 1420,
      totalRevenue: 382400,
      deliveryFee: 0,
      minOrderAmount: 199,
      estimatedDeliveryMinutes: 20,
      deliveryAvailable: true,
      operatingHours: { openTime: '08:00', closeTime: '22:30', isOpen: true },
      address: 'Plot 42, 12th Main Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560038',
      location: { type: 'Point', coordinates: [77.6387, 12.9784] },
    },
    { upsert: true }
  );

  // Restaurant Partner: Malabar Kitchen
  await PartnerBusinessModel.findOneAndUpdate(
    { partnerId: 'r1' },
    {
      partnerId: 'r1',
      userId: 'usr_partner_restaurant_1',
      businessName: 'Malabar Kitchen',
      legalName: 'Malabar Culinary Heritage Pvt Ltd',
      category: 'restaurant',
      ownerName: 'Chef Mujeeb Rahman',
      ownerPhone: '9876540006',
      ownerEmail: 'orders@malabarkitchen.com',
      status: 'approved',
      registrationFee: { amount: 999, currency: 'INR', isPaid: true },
      logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
      galleryImages: [
        'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
      ],
      storeDescription: 'Legendary Malabar dum biriyani, soft layered parottas, Kozhikodan chicken curry, and fresh seafood delicacies.',
      cuisines: ['Biriyani', 'Malabar', 'South Indian', 'Kerala Seafood'],
      rating: 4.82,
      totalOrders: 3120,
      totalRevenue: 642000,
      deliveryFee: 25,
      minOrderAmount: 199,
      estimatedDeliveryMinutes: 30,
      deliveryAvailable: true,
      operatingHours: { openTime: '11:00', closeTime: '23:00', isOpen: true },
      address: 'Court Road, Civil Station Junction',
      city: 'Manjeri',
      state: 'Kerala',
      country: 'India',
      postalCode: '676121',
      location: { type: 'Point', coordinates: [76.1234, 11.1245] },
    },
    { upsert: true }
  );

  // 5. Grocery Products & Dishes
  const products = [
    {
      productId: 'prod_atta_10k',
      partnerId: 'ptn_grocery_1',
      name: 'Aashirvaad Superior MP Sharbati Atta 10kg',
      brand: 'Aashirvaad',
      category: 'Flour & Grains',
      sku: 'AASH-SHAR-10KG',
      sellingPrice: 465,
      mrp: 520,
      stockQuantity: 42,
      lowStockThreshold: 10,
      unit: '10 kg',
      images: ['https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80'],
      inStock: true,
      isFeatured: true,
      isVeg: true,
      discountPercentage: 11,
      rating: 4.9,
      ratingCount: 180,
    },
    {
      productId: 'prod_milk_1l',
      partnerId: 'ptn_grocery_1',
      name: 'Amul Taaza Homogenised Toned Milk 1L',
      brand: 'Amul',
      category: 'Dairy & Eggs',
      sku: 'AMUL-TZ-1L',
      sellingPrice: 72,
      mrp: 75,
      stockQuantity: 58,
      lowStockThreshold: 15,
      unit: '1 L',
      images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80'],
      inStock: true,
      isFeatured: true,
      isVeg: true,
      discountPercentage: 4,
      rating: 4.8,
      ratingCount: 240,
    },
    {
      productId: 'prod_oil_1l',
      partnerId: 'ptn_grocery_1',
      name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
      brand: 'Fortune',
      category: 'Cooking Essentials',
      sku: 'FORT-SUN-1L',
      sellingPrice: 135,
      mrp: 155,
      stockQuantity: 84,
      lowStockThreshold: 20,
      unit: '1 L',
      images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80'],
      inStock: true,
      isFeatured: false,
      isVeg: true,
      discountPercentage: 13,
      rating: 4.7,
      ratingCount: 95,
    },
    {
      productId: 'dish_m1',
      partnerId: 'r1',
      name: 'Special Malabar Dum Chicken Biriyani',
      brand: 'Malabar Kitchen',
      category: 'Biriyani Specials',
      sku: 'MK-DUM-BIRIYANI',
      sellingPrice: 240,
      mrp: 280,
      stockQuantity: 100,
      lowStockThreshold: 10,
      unit: '1 Portion',
      images: ['https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80'],
      inStock: true,
      isFeatured: true,
      isVeg: false,
      discountPercentage: 14,
      rating: 4.9,
      ratingCount: 520,
    },
  ];

  for (const p of products) {
    await GroceryProductModel.findOneAndUpdate({ productId: p.productId }, { $set: p }, { upsert: true });
  }

  // 6. Taxi Driver
  const driverUser = await UserModel.findOneAndUpdate(
    { phone: '9876540002' },
    {
      userId: 'usr_driver_taxi',
      phone: '9876540002',
      email: 'driver@ubstaxi.com',
      fullName: 'Ramesh Gowda',
      roles: ['TAXI_DRIVER'],
      currentRole: 'TAXI_DRIVER',
      taxiDriverProfileId: 'drv_ramesh_1',
      status: 'active',
    },
    { upsert: true, new: true }
  );

  await TaxiDriverModel.findOneAndUpdate(
    { driverId: 'drv_ramesh_1' },
    {
      driverId: 'drv_ramesh_1',
      userId: driverUser.userId,
      fullName: 'Ramesh Gowda',
      phone: '9876540002',
      vehicleType: 'Sedan',
      vehicleModel: 'Maruti Suzuki Dzire',
      registrationNumber: 'KA-04-E-4819',
      status: 'approved',
      isOnline: true,
      isBusy: false,
      currentLocation: {
        type: 'Point',
        coordinates: [77.6387, 12.9784],
        heading: 90,
        updatedAt: new Date(),
      },
      rating: 4.92,
      totalRides: 420,
      totalEarnings: 84200,
      commissionPaid: 12630,
      outstandingPayout: 6400,
    },
    { upsert: true }
  );

  // 7. Delivery Rider
  const riderUser = await UserModel.findOneAndUpdate(
    { phone: '9876540003' },
    {
      userId: 'usr_rider_delivery',
      phone: '9876540003',
      email: 'rider@ubsdelivery.com',
      fullName: 'Vikram Singh',
      roles: ['DELIVERY_RIDER'],
      currentRole: 'DELIVERY_RIDER',
      deliveryRiderProfileId: 'rdr_vikram_1',
      status: 'active',
    },
    { upsert: true, new: true }
  );

  await DeliveryRiderModel.findOneAndUpdate(
    { riderId: 'rdr_vikram_1' },
    {
      riderId: 'rdr_vikram_1',
      userId: riderUser.userId,
      fullName: 'Vikram Singh',
      phone: '9876540003',
      vehicleType: 'motorcycle',
      registrationNumber: 'KA-04-2018-0091244',
      status: 'approved',
      isOnline: true,
      isBusy: false,
      currentLocation: {
        type: 'Point',
        coordinates: [77.64, 12.975],
        updatedAt: new Date(),
      },
      rating: 4.88,
      totalDeliveries: 142,
      totalEarnings: 12400,
      outstandingPayout: 2100,
    },
    { upsert: true }
  );

  // 8. Banners & Promotions
  const banners = [
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

  for (const b of banners) {
    await BannerModel.findOneAndUpdate({ bannerId: b.bannerId }, { $set: b }, { upsert: true });
  }

  const coupons = [
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
    {
      code: 'UBSTAXI50',
      title: '₹50 OFF on Taxi Rides',
      app: 'taxi',
      discountType: 'flat',
      discountValue: 50,
      minOrderValue: 150,
      validUntil: new Date('2027-12-31'),
      isActive: true,
    },
  ];

  for (const c of coupons) {
    await PromotionModel.findOneAndUpdate({ code: c.code }, { $set: c }, { upsert: true });
  }

  // 10. Real Estate Property Listing Fee & Sample Properties
  await PropertyListingFeeModel.findOneAndUpdate(
    { feature: 'real_estate_property_listing' },
    {
      $set: {
        feature: 'real_estate_property_listing',
        amount: 50,
        currency: 'INR',
        isEnabled: true,
        updatedByName: 'Super Admin',
      },
      $setOnInsert: {
        history: [
          {
            amount: 50,
            currency: 'INR',
            isEnabled: true,
            changedBy: 'admin_initial_seed',
            changedByName: 'Super Admin',
            changedAt: new Date(),
            reason: 'Default ₹50 dynamic listing fee per property',
          },
        ],
      },
    },
    { upsert: true }
  );

  const sampleProperties = [
    {
      propertyId: 'PR-10001',
      title: '3 BHK Modern Luxury Villa in Manjeri',
      description: 'Architect-designed luxury villa with modular kitchen, private lawn, solar power, and 2 covered car parks.',
      propertyType: 'villa',
      listingType: 'sale',
      category: 'Residential',
      price: 8500000,
      location: 'Calicut Road, Manjeri, Malappuram',
      address: 'Plot 14, Green Valley Enclave, Calicut Road',
      city: 'Manjeri',
      state: 'Kerala',
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      ],
      bedrooms: 3,
      bathrooms: 3,
      area: '2400 sq.ft',
      amenities: ['Private Garden', 'Solar Power', 'Covered Parking', 'Borewell & KWA Water', '24x7 Security'],
      contactName: 'Niyas Rahman',
      contactPhone: '+91 98765 43210',
      postedBy: 'Verified Builder',
      userId: 'usr_manjeri_owner_1',
      userName: 'Niyas Rahman',
      listingFeeAmount: 50,
      isPaid: true,
      paymentId: 'PLP-10001',
      status: 'approved',
      approvalStatus: 'approved',
      featured: true,
      paidAt: new Date('2026-10-15'),
      reviewedAt: new Date('2026-10-15'),
      reviewedBy: 'Super Admin',
    },
    {
      propertyId: 'PR-10002',
      title: '2 BHK Waterfront Apartment in Kochi',
      description: 'Spectacular lake-view premium apartment on Marine Drive with balcony sunset views and clubhouse amenities.',
      propertyType: 'apartment',
      listingType: 'rent',
      category: 'Residential',
      price: 24000,
      location: 'Marine Drive, Ernakulam, Kochi',
      address: 'Floor 11, Bayview Towers, Marine Drive',
      city: 'Kochi',
      state: 'Kerala',
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      ],
      bedrooms: 2,
      bathrooms: 2,
      area: '1250 sq.ft',
      amenities: ['Swimming Pool', 'Gym & Clubhouse', 'High-Speed Elevators', 'Piped Gas', 'Covered Parking'],
      contactName: 'Anil Kumar',
      contactPhone: '+91 98460 11223',
      postedBy: 'Direct Owner',
      userId: 'usr_kochi_owner_2',
      userName: 'Anil Kumar',
      listingFeeAmount: 50,
      isPaid: true,
      paymentId: 'PLP-10002',
      status: 'approved',
      approvalStatus: 'approved',
      featured: true,
      paidAt: new Date('2026-10-20'),
      reviewedAt: new Date('2026-10-20'),
      reviewedBy: 'Super Admin',
    },
    {
      propertyId: 'PR-10003',
      title: '4 BHK Traditional Malabar Manor in Kozhikode',
      description: 'Heritage architectural estate with teak wood carvings, central courtyard (Nadumuttam), and 50-cent land area.',
      propertyType: 'house',
      listingType: 'sale',
      category: 'Residential',
      price: 14500000,
      location: 'Kottuli, Kozhikode',
      address: 'Manor Estate, Near Kottooli Wetland, Kozhikode',
      city: 'Kozhikode',
      state: 'Kerala',
      images: [
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
      ],
      bedrooms: 4,
      bathrooms: 4,
      area: '3800 sq.ft',
      amenities: ['Traditional Courtyard', 'Outhouse', 'Fruit Orchard', 'Well Water', 'Gated Compound'],
      contactName: 'Faizal Kozhikode',
      contactPhone: '+91 94471 99887',
      postedBy: 'Direct Owner',
      userId: 'usr_calicut_owner_3',
      userName: 'Faizal Kozhikode',
      listingFeeAmount: 50,
      isPaid: true,
      paymentId: 'PLP-10003',
      status: 'approved',
      approvalStatus: 'approved',
      featured: false,
      paidAt: new Date('2026-10-28'),
      reviewedAt: new Date('2026-10-28'),
      reviewedBy: 'Super Admin',
    },
  ];

  try {
    await PropertyModel.collection.dropIndex('location_2dsphere');
  } catch {}

  for (const p of sampleProperties) {
    try {
      await PropertyModel.findOneAndUpdate({ propertyId: p.propertyId }, { $set: p }, { upsert: true });
    } catch (e: any) {
      logger.warn({ err: e.message }, `Property seed skip for ${p.propertyId}`);
    }
  }

  logger.info('✅ UBSSuper Ecosystem database seeding completed successfully!');
  await disconnectDatabase();
}

// Allow direct CLI execution
if (process.argv[1]?.includes('seed')) {
  seedDatabase().catch((err) => {
    logger.error({ err }, 'Seeding failed');
    process.exit(1);
  });
}
