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

  // 2. Platform Admins
  const adminPassword = await hashPassword('AdminPass2026!');
  await UserModel.findOneAndUpdate(
    { phone: '9999999999' },
    {
      userId: 'usr_super_admin',
      phone: '9999999999',
      email: 'admin@ubssuper.com',
      fullName: 'Devansh Sharma (Chief Administrator)',
      passwordHash: adminPassword,
      roles: ['ADMIN', 'SUPER_ADMIN'],
      currentRole: 'SUPER_ADMIN',
      status: 'active',
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
      roles: ['CUSTOMER'],
      currentRole: 'CUSTOMER',
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
      address: 'Plot 42, 12th Main Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560038',
      location: { type: 'Point', coordinates: [77.6387, 12.9784] },
      rating: 4.88,
      totalOrders: 1420,
      totalRevenue: 382400,
    },
    { upsert: true }
  );

  // 5. Grocery Products
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
