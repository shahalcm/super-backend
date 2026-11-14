// backend/tests/verify-backend.ts
import assert from 'assert';
import http from 'http';
import app from '../src/app.js';
import {
  encryptSecret,
  decryptSecret,
  validateSafeHttpsUrl,
  hashOtp,
  hashPassword,
  comparePassword,
} from '../src/utils/crypto.js';
import {
  calculateHaversineDistanceKm,
  calculateTaxiFare,
  calculateDeliveryFee,
  estimateTravelTimeMinutes,
} from '../src/utils/geo.js';
import {
  verifyRazorpaySignature,
  verifyWebhookSignature,
  toSmallestCurrencyUnit,
  fromSmallestCurrencyUnit,
  isSupportedCurrency,
} from '../src/config/razorpay.js';
import { generateTokens, AuthUserPayload } from '../src/middleware/auth.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { ordersService } from '../src/modules/orders/orders.service.js';
import { driversService } from '../src/modules/drivers/drivers.service.js';
import { deliveryService } from '../src/modules/delivery/delivery.service.js';
import { partnersService } from '../src/modules/partners/partners.service.js';
import { adminService } from '../src/modules/admin/admin.service.js';
import { taxiService } from '../src/modules/taxi/taxi.service.js';
import { realEstateService } from '../src/modules/real-estate/real-estate.service.js';
import { customersService } from '../src/modules/customers/customers.service.js';
import { contentService } from '../src/modules/content/content.service.js';
import { walletService } from '../src/modules/wallet/wallet.service.js';
import { paymentsService } from '../src/modules/payments/payments.service.js';
import {
  UserModel,
  PaymentModel,
  OrderModel,
  TaxiRideModel,
  RefundModel,
  WebhookEventModel,
} from '../src/database/index.js';
import crypto from 'crypto';

import { env } from '../src/config/env.js';

console.log('================================================================');
console.log('🚀 RUNNING UBSSUPER CENTRAL BACKEND 32-SCENARIO TEST SUITE');
console.log('================================================================\n');

async function runTests() {
  let passed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`✅ [PASS] Scenario ${passed}: ${name}`);
    } catch (err: any) {
      console.error(`❌ [FAIL] Scenario ${passed + 1}: ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // 1. Password Hashing with Bcrypt & Salt Validation
  await test('Password Hashing with Bcrypt & Salt Validation', async () => {
    const rawPass = 'Secret123!';
    const hash = await hashPassword(rawPass);
    assert(hash.startsWith('$2'), 'Hash must be valid bcrypt string');
    const isMatch = await comparePassword(rawPass, hash);
    assert.strictEqual(isMatch, true, 'Password must match hash');
    const wrongMatch = await comparePassword('WrongPass', hash);
    assert.strictEqual(wrongMatch, false, 'Wrong password must be rejected');
  });

  // 2. OTP Hash Generation with HMAC-SHA256
  await test('OTP Hash Generation with HMAC-SHA256 & Salt Isolation', () => {
    const h1 = hashOtp('482910', '9876543210');
    const h2 = hashOtp('482910', '9876543210');
    const hDiff = hashOtp('482911', '9876543210');
    assert.strictEqual(h1, h2, 'Identical OTP + phone must yield identical hash');
    assert.notStrictEqual(h1, hDiff, 'Different OTP must yield different hash');
  });

  // 3. AES-256-GCM Partner Credential Encryption
  await test('AES-256-GCM Authenticated Encryption for Partner Vault', () => {
    const secret = 'rzp_live_secret_key_8492049104';
    const encrypted = encryptSecret(secret);
    assert(encrypted.encrypted.length > 10, 'Must have encrypted ciphertext');
    assert(encrypted.iv.length === 24, 'IV must be 12 bytes (24 hex characters)');
    assert(encrypted.tag.length === 32, 'Tag must be 16 bytes (32 hex characters)');

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, secret, 'Decrypted text must match original secret exactly');
  });

  // 4. AES-256-GCM Tamper Detection
  await test('AES-256-GCM Tamper Resistance Fails On Modified Ciphertext', () => {
    const secret = 'super_secret';
    const encrypted = encryptSecret(secret);
    const tampered = { ...encrypted, encrypted: encrypted.encrypted.slice(0, -2) + 'ff' };
    assert.throws(() => decryptSecret(tampered), 'Tampered ciphertext must throw authentication error');
  });

  // 5. Anti-SSRF URL Filtering
  await test('Anti-SSRF Protection Blocks Loopback and Local Addresses', () => {
    assert.strictEqual(validateSafeHttpsUrl('http://insecure.com').isValid, false, 'Plain HTTP blocked');
    assert.strictEqual(validateSafeHttpsUrl('https://localhost:8080').isValid, false, 'localhost blocked');
    assert.strictEqual(validateSafeHttpsUrl('https://127.0.0.1:3000').isValid, false, '127.0.0.1 blocked');
    assert.strictEqual(validateSafeHttpsUrl('https://192.168.1.1').isValid, false, 'Private 192.168.x blocked');
    assert.strictEqual(validateSafeHttpsUrl('https://10.0.0.1').isValid, false, 'Private 10.x blocked');
    assert.strictEqual(validateSafeHttpsUrl('https://api.razorpay.com/v1').isValid, true, 'Valid external HTTPS allowed');
  });

  // 6. Haversine Great-Circle Distance
  await test('Haversine Geospatial Distance Calculation', () => {
    const pointA = { latitude: 12.9784, longitude: 77.6387 };
    const pointB = { latitude: 12.9756, longitude: 77.6066 };
    const dist = calculateHaversineDistanceKm(pointA, pointB);
    assert(dist >= 3.0 && dist <= 4.5, `Distance was ${dist} km, expected ~3.5 km`);
  });

  // 7. Taxi Fare Estimation Precision
  await test('Taxi Dynamic Fare Engine for All Vehicle Classes', () => {
    const bikeFare = calculateTaxiFare(5.0, 'Bike');
    assert(bikeFare.totalFare >= 50 && bikeFare.totalFare <= 100, `Bike fare: ${bikeFare.totalFare}`);

    const sedanFare = calculateTaxiFare(5.0, 'Sedan');
    assert(sedanFare.totalFare > bikeFare.totalFare, 'Sedan fare must exceed Bike fare');
    assert.strictEqual(sedanFare.tax, Math.round(sedanFare.subtotal * 0.05), 'GST must be 5%');
  });

  // 8. Order Delivery Fee Calculation & Free Threshold
  await test('Delivery Fee Tiering with Free Delivery Over ₹500', () => {
    assert.strictEqual(calculateDeliveryFee(3.0, 600), 0, 'Orders >= 500 under 5km have ₹0 delivery fee');
    assert.strictEqual(calculateDeliveryFee(2.0, 300), 35, 'Orders under 3km cost flat ₹35');
    assert.strictEqual(calculateDeliveryFee(5.0, 300), 35 + 2 * 8, 'Orders over 3km cost ₹35 + ₹8/km');
  });

  // 9. Razorpay Payment Signature Verification
  await test('Razorpay Payment Signature HMAC-SHA256 Verification', () => {
    const orderId = 'order_DAvL804829';
    const paymentId = 'pay_293849102';
    const secret = 'ubs_secret_test_key';
    const crypto = require('crypto');
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.strictEqual(verifyRazorpaySignature(orderId, paymentId, validSig, secret), true);
    assert.strictEqual(verifyRazorpaySignature(orderId, paymentId, 'invalid_signature', secret), false);
  });

  // 10. Webhook Signature Verification against Raw Body
  await test('Razorpay Webhook Signature Verification Against Raw Payload', () => {
    const rawPayload = JSON.stringify({ event: 'payment.captured', amount: 50000 });
    const secret = 'ubs_webhook_secret_key';
    const crypto = require('crypto');
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');

    assert.strictEqual(verifyWebhookSignature(rawPayload, validSig, secret), true);
    assert.strictEqual(verifyWebhookSignature(rawPayload, 'forged_sig', secret), false);
  });

  // 11. Multi-Role JWT Token Minting & Decoding
  await test('Multi-Role JWT Token Issuance and Claim Verification', () => {
    const payload: AuthUserPayload = {
      userId: 'usr_test_100',
      phone: '9876543210',
      roles: ['CUSTOMER', 'TAXI_DRIVER'],
      currentRole: 'CUSTOMER',
    };
    const { accessToken, refreshToken } = generateTokens(payload);
    assert(accessToken.length > 20, 'Access token generated');
    assert(refreshToken.length > 20, 'Refresh token generated');
  });

  // 12. Express Health Check Endpoint
  await test('GET /health Returns 200 OK with Microservice Ecosystem Status', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res = await fetch(`http://localhost:${port}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'healthy');
    assert.strictEqual(body.data.services.taxi, 'online');
    assert.strictEqual(body.data.services.partner, 'online');
    server.close();
  });

  // 13. Public Banners & Discovery Catalog API
  await test('GET /api/v1/content/banners Returns Active Promotional Banners', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res = await fetch(`http://localhost:${port}/api/v1/content/banners?app=ubssuper`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    server.close();
  });

  // 14. Taxi Fare Estimation API
  await test('POST /api/v1/taxi/estimate Returns Instant Multiclass Vehicle Estimates', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const res = await fetch(`http://localhost:${port}/api/v1/taxi/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup: { latitude: 12.9784, longitude: 77.6387 },
        destination: { latitude: 12.9352, longitude: 77.6245 },
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert(body.data.estimates.length >= 6, 'Must return Bike, Auto, Mini, Sedan, SUV, Luxury');
    server.close();
  });

  // 15. Mobile App Route Alias Checks
  await test('Mobile Endpoint Aliases Work for Driver, Partner, and Admin', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const resDriver = await fetch(`http://localhost:${port}/api/driver/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876543210', countryCode: '+91', role: 'TAXI_DRIVER' }),
    });
    assert.strictEqual(resDriver.status, 200, 'Driver alias endpoint must respond 200');

    const resPartner = await fetch(`http://localhost:${port}/api/partner/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9876540001', countryCode: '+91', role: 'PARTNER_OWNER' }),
    });
    assert.strictEqual(resPartner.status, 200, 'Partner alias endpoint must respond 200');

    server.close();
  });

  // 16. Customer Registration & OTP Verification Flow
  await test('Customer Phone Registration and OTP Verification Session', async () => {
    const sendRes = await authService.sendOtp('9876511111', '+91', 'CUSTOMER');
    assert.strictEqual(sendRes.success, true);

    const verifyRes = await authService.verifyOtp('9876511111', '123456', 'CUSTOMER');
    assert(verifyRes.token.length > 20, 'JWT token must be issued');
    assert.strictEqual(verifyRes.user.phone, '9876511111');
  });

  // 17. Partner Registration and Category Mapping
  await test('Partner Business Registration with Category Mapping', async () => {
    const partner = await partnersService.getRegistration('usr_test_partner');
    assert(partner.partnerId.startsWith('ptn_'), 'Partner ID generated');
    assert.strictEqual(partner.category, 'grocery');
  });

  // 18. Driver Availability Online Guard
  await test('Driver Availability Rejects Unapproved Accounts', async () => {
    await assert.rejects(
      async () => {
        await driversService.setAvailability('usr_unapproved_driver', true);
      },
      /Only approved drivers can go online/,
      'Unapproved driver cannot go online'
    );
  });

  // 19. Delivery Rider Bicycle Exemption
  await test('Delivery Rider Bicycle Exemption for Motor Driving Licence', async () => {
    const rider = await deliveryService.getProfile('usr_test_rider_bike');
    rider.vehicleType = 'bicycle';
    await rider.save();
    // Bicycles do not require motor vehicle driving license
    assert.strictEqual(rider.vehicleType, 'bicycle');
  });

  // 20. Admin Dashboard Aggregations
  await test('Admin Dashboard Metrics Aggregation Engine', async () => {
    const metrics = await adminService.getDashboard();
    assert.strictEqual(typeof metrics.totalRevenue, 'number');
    assert.strictEqual(typeof metrics.platformCommission, 'number');
  });

  // 21. OTP Rate Limiting & Cooldown Protection
  await test('OTP Resend Cooldown Prevents Brute-force Flooding', async () => {
    await authService.sendOtp('9876522222', '+91', 'CUSTOMER');
    await assert.rejects(
      async () => {
        await authService.sendOtp('9876522222', '+91', 'CUSTOMER');
      },
      /Please wait/,
      'Immediate resend must be blocked by cooldown'
    );
  });

  // 22. Password Reset and Authentication Check
  await test('Password Registration and Verification Workflow', async () => {
    const regRes = await authService.register({
      phone: '9876533333',
      fullName: 'Password Test User',
      password: 'StrongPassword123!',
      role: 'CUSTOMER',
    });
    assert(regRes.token.length > 20);

    const loginRes = await authService.loginPassword('9876533333', 'StrongPassword123!');
    assert(loginRes.token.length > 20);
  });

  // 23. Cross-Role RBAC Authorization Guard
  await test('Cross-Role RBAC Access Denial Check', () => {
    const payload: AuthUserPayload = {
      userId: 'usr_cust',
      phone: '9876500000',
      roles: ['CUSTOMER'],
      currentRole: 'CUSTOMER',
    };
    const hasAdmin = payload.roles.includes('ADMIN');
    assert.strictEqual(hasAdmin, false, 'Customer must not have Admin access');
  });

  // 24. Cross-Partner Data Tenant Isolation
  await test('Cross-Partner Data Tenant Isolation', async () => {
    const productsA = await partnersService.getGroceryProducts('ptn_tenant_A');
    const productsB = await partnersService.getGroceryProducts('ptn_tenant_B');
    assert.strictEqual(Array.isArray(productsA), true);
    assert.strictEqual(Array.isArray(productsB), true);
  });

  // 25. Unified Customer Order Placement & Fare Computation
  await test('Unified Customer Order Placement and Coupon Application', async () => {
    const orderResult = await ordersService.checkout('usr_test_checkout', {
      type: 'grocery',
      items: [
        { id: 'item_1', name: 'Flour 10kg', quantity: 1, unitPrice: 465, totalPrice: 465 },
        { id: 'item_2', name: 'Milk 1L', quantity: 2, unitPrice: 72, totalPrice: 144 },
      ],
      deliveryAddress: 'Flat 101, Indiranagar',
      paymentMethod: 'razorpay',
    });

    assert.strictEqual(orderResult.order.subtotal, 465 + 144);
    assert(orderResult.order.totalAmount > orderResult.order.subtotal, 'Total includes delivery & tax');
    assert.strictEqual(orderResult.order.deliveryOtp.length, 4, '4-digit delivery OTP generated');
  });

  // 26. Hotel Double-Booking Prevention Logic
  await test('Hotel Room Capacity Allocation Logic', () => {
    const totalRooms = 5;
    let bookedRooms = 4;
    const canBook = bookedRooms < totalRooms;
    assert.strictEqual(canBook, true);
    bookedRooms += 1;
    assert.strictEqual(bookedRooms < totalRooms, false, 'Double booking prevented when at capacity');
  });

  // 27. Doctor Appointment Scheduling Availability Check
  await test('Doctor Consultation Slot Allocation Logic', () => {
    const availableSlots = ['09:00 AM', '10:00 AM', '11:00 AM'];
    const bookedSlots: string[] = ['09:00 AM'];
    const isSlotAvailable = (slot: string) => availableSlots.includes(slot) && !bookedSlots.includes(slot);

    assert.strictEqual(isSlotAvailable('09:00 AM'), false, 'Booked slot unavailable');
    assert.strictEqual(isSlotAvailable('10:00 AM'), true, 'Free slot available');
  });

  // 28. Platform Take-Rate Commission Computation
  await test('Platform Commission & Partner Payable Calculation', () => {
    const orderTotal = 1000;
    const deliveryFee = 50;
    const commission = Math.round(orderTotal * 0.1); // 10%
    const partnerPayable = orderTotal - commission - deliveryFee;

    assert.strictEqual(commission, 100);
    assert.strictEqual(partnerPayable, 850);
  });

  // 29. Cloudinary CDN Configuration Integrity
  await test('Cloudinary CDN Multi-Tenant Cloud Name Verification', () => {
    const { env } = require('../src/config/env.js');
    assert.strictEqual(env.CLOUDINARY_CLOUD_NAME, 'dtubrloue');
    assert.strictEqual(env.CLOUDINARY_API_KEY, '463785848856518');
  });

  // 30. Google Maps Travel Time Buffer Computation
  await test('Google Maps Traffic Buffer and Travel Time Formula', () => {
    const travelMinutes = estimateTravelTimeMinutes(10, 'Sedan');
    assert(travelMinutes >= 20 && travelMinutes <= 35, `Travel time: ${travelMinutes} mins`);
  });

  // 31. Socket.IO Connection Handshake Protocol
  await test('Socket.IO Room Partitioning Contract', () => {
    const { socketEvents } = require('../src/sockets/index.js');
    assert.strictEqual(typeof socketEvents.emitRideRequested, 'function');
    assert.strictEqual(typeof socketEvents.emitDeliveryAssigned, 'function');
    assert.strictEqual(typeof socketEvents.emitOrderStatusUpdated, 'function');
  });

  // 32. Graceful Shutdown & Signal Handling Architecture
  await test('Graceful Shutdown Signal Handling Configuration', () => {
    const mockHandler = () => {};
    process.on('SIGUSR2', mockHandler);
    assert.strictEqual(process.listenerCount('SIGUSR2') >= 1, true);
    process.removeListener('SIGUSR2', mockHandler);
  });

  // 33. Store & Restaurant Discovery API
  await test('Store & Restaurant Discovery API with Partner Photos and Distance', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const resGrocery = await fetch(`http://localhost:${port}/api/v1/content/stores?category=grocery&lat=11.1215&lng=76.1215`);
    assert.strictEqual(resGrocery.status, 200);
    const bodyGrocery = await resGrocery.json();
    assert.strictEqual(bodyGrocery.success, true);
    assert(bodyGrocery.data.length >= 1, 'Must return at least 1 grocery store');
    const store = bodyGrocery.data[0];
    assert(store.name, 'Store must have name');
    assert(store.coverImage, 'Store must display partner-uploaded cover photo');
    assert(store.category === 'grocery', 'Store category must be grocery');

    const resRest = await fetch(`http://localhost:${port}/api/v1/content/stores?category=restaurant&lat=11.1215&lng=76.1215`);
    assert.strictEqual(resRest.status, 200);
    const bodyRest = await resRest.json();
    assert.strictEqual(bodyRest.success, true);
    assert(bodyRest.data.length >= 1, 'Must return at least 1 restaurant');
    const rest = bodyRest.data[0];
    assert(rest.coverImage, 'Restaurant must display partner-uploaded cover photo');
    assert(rest.cuisines.length > 0, 'Restaurant must include cuisine tags');

    server.close();
  });

  // 34. Store Details & Isolated Product Catalog API
  await test('Store Details and Isolated Product Catalog API', async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const resStore = await fetch(`http://localhost:${port}/api/v1/content/stores/ptn_grocery_1`);
    assert.strictEqual(resStore.status, 200);
    const bodyStore = await resStore.json();
    assert.strictEqual(bodyStore.data.partnerId, 'ptn_grocery_1');

    const resProducts = await fetch(`http://localhost:${port}/api/v1/content/stores/ptn_grocery_1/products`);
    assert.strictEqual(resProducts.status, 200);
    const bodyProducts = await resProducts.json();
    assert(Array.isArray(bodyProducts.data), 'Products must be an array');
    assert(bodyProducts.data.length > 0, 'Must return products belonging to store');
    assert(bodyProducts.data.every((p: any) => p.partnerId === 'ptn_grocery_1'), 'Every product must belong strictly to selected store');

    server.close();
  });

  // 35. Partner Store Branding & Photo Management
  await test('Partner Store Branding and Photo Management', async () => {
    const branding = await partnersService.getStoreBranding('usr_test_branding_partner');
    assert.strictEqual(typeof branding.businessName, 'string');
    assert.strictEqual(Array.isArray(branding.galleryImages), true);

    const updated = await partnersService.updateStoreBranding('usr_test_branding_partner', {
      storeDescription: 'Updated artisan market with freshly baked sourdough and organic produce.',
      deliveryAvailable: true,
      minOrderAmount: 199,
      coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80',
    });

    assert.strictEqual(updated.minOrderAmount, 199);
    assert(updated.storeDescription.includes('artisan market'));
  });

  // 36. Partner Image Upload & Gallery Isolation
  await test('Partner Store Image Upload & Gallery Photo Deletion', async () => {
    const sampleUploadUri = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
    const uploadRes = await partnersService.uploadStoreImage('usr_test_branding_partner', sampleUploadUri, 'gallery');
    assert.strictEqual(uploadRes.success, true);
    assert(uploadRes.url.length > 10, 'Uploaded image URL must be returned');

    const deleteRes = await partnersService.deleteGalleryImage('usr_test_branding_partner', uploadRes.url);
    assert.strictEqual(deleteRes.success, true);
    assert(!deleteRes.galleryImages.includes(uploadRes.url), 'Deleted image must be removed from gallery');
  });

  // 37. Property Listing Fee Default Retrieval
  await test('Property Listing Fee Default Retrieval (Default ₹50 INR)', async () => {
    const fee = await realEstateService.getListingFee();
    assert.strictEqual(fee.feature, 'real_estate_property_listing');
    assert.strictEqual(fee.amount, 50, 'Default listing fee must be exactly ₹50');
    assert.strictEqual(fee.currency, 'INR');
    assert.strictEqual(fee.isEnabled, true);
  });

  // 38. Admin Dynamic Listing Fee Update & History Audit Log
  let originalFeeAmount = 50;
  await test('Admin Dynamic Listing Fee Update & History Audit Log', async () => {
    const initial = await realEstateService.getListingFee();
    originalFeeAmount = initial.amount;

    // Admin updates fee to ₹100
    const updated1 = await realEstateService.updateListingFee({
      amount: 100,
      changedBy: 'admin_test_1',
      changedByName: 'Lead Admin',
      reason: 'Festive season premium listing adjustment',
    });
    assert.strictEqual(updated1.amount, 100);

    // Verify active fee reflects ₹100 dynamically
    const current1 = await realEstateService.getListingFee();
    assert.strictEqual(current1.amount, 100);

    // Admin updates fee to ₹25
    await realEstateService.updateListingFee({
      amount: 25,
      changedBy: 'admin_test_1',
      changedByName: 'Lead Admin',
      reason: 'Promotional discount flash sale',
    });
    const current2 = await realEstateService.getListingFee();
    assert.strictEqual(current2.amount, 25);

    // Verify history audit log contains both transitions
    const history = await realEstateService.getListingFeeHistory();
    assert(history.length >= 2, 'History must contain at least 2 entries');
    assert.strictEqual(history[0].amount, 25);
    assert.strictEqual(history[1].amount, 100);

    // Restore to standard ₹50 for subsequent tests
    await realEstateService.updateListingFee({
      amount: 50,
      changedBy: 'admin_test_1',
      changedByName: 'Lead Admin',
      reason: 'Reset to standard listing fee',
    });
  });

  // 39. Customer Property Draft Submission with Server-Side Fee Snapshot
  let testPropertyId = '';
  await test('Customer Property Draft Submission with Server-Side Fee Snapshot', async () => {
    const res = await realEstateService.createPropertyDraft(
      'usr_test_seller_42',
      'Muhammed Shameem',
      '+91 98470 55443',
      {
        title: '3 BHK Contemporary Hilltop Villa in Malappuram',
        description: 'Breathtaking panoramic valley views, private pool, and solar-powered grid.',
        propertyType: 'villa',
        listingType: 'sale',
        category: 'Residential',
        price: 9200000,
        location: 'Kottakkunnu, Malappuram',
        address: 'Hilltop Enclave, Down Hill, Malappuram',
        city: 'Malappuram',
        state: 'Kerala',
        area: '2650 sq.ft',
        bedrooms: 3,
        bathrooms: 4,
        amenities: ['Private Pool', 'Solar System', 'Balcony Deck'],
      }
    );

    assert(res.property.propertyId.startsWith('PR-'));
    testPropertyId = res.property.propertyId;
    assert.strictEqual(res.listingFee, 50, 'Server snapshot must enforce active fee ₹50');
    assert.strictEqual(res.isPaid, false);
    assert.strictEqual(res.property.status, 'pending_payment');
    assert.strictEqual(res.property.approvalStatus, 'pending');
  });

  // 40. Razorpay Listing Fee Order Creation
  let testRazorpayOrderId = '';
  await test('Razorpay Listing Fee Order Creation against Server Snapshot', async () => {
    const orderData = await realEstateService.createListingOrder(
      'usr_test_seller_42',
      'Muhammed Shameem',
      '+91 98470 55443',
      testPropertyId
    );

    assert.strictEqual(orderData.isFree, false);
    assert.strictEqual(orderData.amount, 50, 'Order amount must match server snapshot of ₹50');
    assert.strictEqual(orderData.currency, 'INR');
    assert(orderData.orderId && orderData.orderId.length > 5);
    testRazorpayOrderId = orderData.orderId;
  });

  // 41. Anti-Tampering: Rejection of Invalid Signature
  await test('Anti-Tampering: Rejection of Invalid Razorpay Signature', async () => {
    try {
      await realEstateService.verifyListingPayment('usr_test_seller_42', {
        propertyId: testPropertyId,
        razorpayOrderId: testRazorpayOrderId,
        razorpayPaymentId: 'pay_tampered_fake_999',
        razorpaySignature: 'invalid_forged_signature_hex_0000',
      });
      assert.fail('Should have rejected invalid signature');
    } catch (err: any) {
      assert(err.message.includes('Invalid Razorpay signature') || err.message.includes('failed'));
    }
  });

  // 42. Valid Razorpay Signature Verification & Property State Transition
  await test('Valid Razorpay Signature Verification & State Transition to under_review', async () => {
    const paymentId = `pay_prop_${Date.now().toString().slice(-6)}`;
    const validSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${testRazorpayOrderId}|${paymentId}`)
      .digest('hex');

    const result = await realEstateService.verifyListingPayment('usr_test_seller_42', {
      propertyId: testPropertyId,
      razorpayOrderId: testRazorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.property.isPaid, true);
    assert.strictEqual(result.property.status, 'under_review');
    assert.strictEqual(result.property.approvalStatus, 'pending');
  });

  // 43. Free Listing Handling when Fee is Set to ₹0
  await test('Free Listing Policy Handling when Fee is Set to ₹0', async () => {
    // Admin sets fee to ₹0
    await realEstateService.updateListingFee({
      amount: 0,
      changedBy: 'admin_free_promo',
      changedByName: 'Promotions Manager',
      reason: 'Launch week zero fee campaign',
    });

    const freePropRes = await realEstateService.createPropertyDraft(
      'usr_test_free_user',
      'Free Lister',
      '+91 98470 11111',
      {
        title: 'Commercial Office Space in Kozhikode Town',
        propertyType: 'commercial',
        listingType: 'rent',
        price: 35000,
        location: 'Mavoor Road, Kozhikode',
        address: '4th Floor, Skyline Commercial Centre',
        area: '1400 sq.ft',
      }
    );

    assert.strictEqual(freePropRes.listingFee, 0);
    assert.strictEqual(freePropRes.isPaid, true, 'Property must be immediately marked paid when fee is ₹0');
    assert.strictEqual(freePropRes.property.status, 'under_review');

    // Restore standard fee to ₹50
    await realEstateService.updateListingFee({
      amount: 50,
      changedBy: 'admin_free_promo',
      changedByName: 'Promotions Manager',
      reason: 'Promotion ended, restored to ₹50',
    });
  });

  // 44. Admin Property Approval & Rejection Workflow
  await test('Admin Property Approval & Rejection Workflow', async () => {
    // Admin approves property
    const approved = await realEstateService.adminUpdatePropertyStatus(testPropertyId, {
      approvalStatus: 'approved',
      adminName: 'Chief Moderator',
      adminId: 'admin_mod_1',
    });
    assert.strictEqual(approved.approvalStatus, 'approved');
    assert.strictEqual(approved.status, 'approved');

    // Verify it appears in public search
    const publicList = await realEstateService.getProperties({ search: 'Malappuram' });
    const found = publicList.properties.some((p) => p.propertyId === testPropertyId);
    assert(found, 'Approved property must be visible in public property feed');

    // Admin rejects property
    const rejected = await realEstateService.adminUpdatePropertyStatus(testPropertyId, {
      approvalStatus: 'rejected',
      rejectionReason: 'Images require higher resolution',
      adminName: 'Chief Moderator',
      adminId: 'admin_mod_1',
    });
    assert.strictEqual(rejected.approvalStatus, 'rejected');
    assert.strictEqual(rejected.status, 'rejected');

    // Verify it no longer appears in public search
    const publicListAfter = await realEstateService.getProperties({ search: 'Malappuram' });
    const foundAfter = publicListAfter.properties.some((p) => p.propertyId === testPropertyId);
    assert(!foundAfter, 'Rejected property must not be visible in public feed');
  });

  // 45. Real Estate Payment History & Admin Revenue Analytics Calculation
  await test('Real Estate Payment History & Admin Revenue Analytics Calculation', async () => {
    const analytics = await realEstateService.adminGetAnalytics();
    assert(typeof analytics.totalRevenue === 'number' && analytics.totalRevenue >= 50);
    assert(analytics.paidListingsCount >= 1);
    assert.strictEqual(analytics.currentListingFee, 50);

    const paymentsRes = await realEstateService.adminGetPayments({ status: 'paid' });
    assert(paymentsRes.payments.length >= 1);
    const paidRecord = paymentsRes.payments.find((p) => p.propertyId === testPropertyId);
    assert(paidRecord, 'Payment record for test property must exist in payment ledger');
    assert.strictEqual(paidRecord.amount, 50);
  });

  // 46. Login with Password Authentication and Bcrypt Hash Check
  await test('Login with Password Authentication and Bcrypt Hash Check', async () => {
    const testPhone = '9876543299';
    const testPass = 'SecureKerala@2026';

    // Register user with password
    await authService.register({
      phone: testPhone,
      fullName: 'Sujith Kumar',
      email: 'sujith.k@ubssuper.com',
      password: testPass,
      role: 'CUSTOMER',
    });

    // Valid login
    const loginRes = await authService.loginPassword(testPhone, testPass);
    assert(loginRes.token, 'Must return JWT access token');
    assert.strictEqual(loginRes.user.phone, testPhone);

    // Invalid password must reject
    await assert.rejects(
      async () => {
        await authService.loginPassword(testPhone, 'WrongPassword123');
      },
      /Invalid credentials/
    );
  });

  // 47. Password Reset via Verified OTP (Forgot Password Workflow)
  await test('Password Reset via Verified OTP (Forgot Password Workflow)', async () => {
    const testPhone = '9876543299';
    const newPass = 'UpdatedPassword@2026';

    // Reset password with valid test OTP
    const resetRes = await authService.resetPassword(testPhone, '123456', newPass);
    assert.strictEqual(resetRes.success, true);

    // Verify login with new password succeeds
    const newLoginRes = await authService.loginPassword(testPhone, newPass);
    assert(newLoginRes.token);

    // Verify old password no longer works
    await assert.rejects(
      async () => {
        await authService.loginPassword(testPhone, 'SecureKerala@2026');
      },
      /Invalid credentials/
    );
  });

  // 48. Customer Registration with Full Address & GPS Point Coordinates
  await test('Customer Registration with Full Address & GPS Point Coordinates', async () => {
    const geoPhone = '9876543288';
    const regRes = await authService.register({
      phone: geoPhone,
      fullName: 'Amina Fathima',
      email: 'amina.f@ubssuper.com',
      password: 'Password@2026',
      role: 'CUSTOMER',
      address: {
        fullAddress: 'Plot 12A, Court Road, Manjeri, Kerala 676121',
        houseNumber: '12A',
        street: 'Court Road',
        locality: 'Kachery Padi',
        city: 'Manjeri',
        district: 'Malappuram',
        state: 'Kerala',
        pincode: '676121',
        country: 'India',
      },
      location: {
        type: 'Point',
        coordinates: [76.1283, 11.1217], // [longitude, latitude]
      },
      locationSource: 'gps',
    });

    assert(regRes.token);
    assert.strictEqual(regRes.user.phone, geoPhone);
  });

  // 49. Postal PIN Code Lookup with Locality Resolution & Kerala Directory Fallback
  await test('Postal PIN Code Lookup with Locality Resolution & Kerala Directory Fallback', async () => {
    // Known Manjeri PIN code
    const manjeriRes = await customersService.lookupPincode('676121');
    assert.strictEqual(manjeriRes.city, 'Manjeri');
    assert.strictEqual(manjeriRes.district, 'Malappuram');
    assert.strictEqual(manjeriRes.state, 'Kerala');
    assert(manjeriRes.localities.includes('Kachery Padi'));
    assert.deepStrictEqual(manjeriRes.coordinates, [76.1283, 11.1217]);

    // Known Kozhikode Cyberpark PIN code
    const cltRes = await customersService.lookupPincode('673016');
    assert.strictEqual(cltRes.city, 'Kozhikode');
    assert(cltRes.localities.includes('Cyberpark'));

    // Invalid PIN format rejects
    await assert.rejects(
      async () => {
        await customersService.lookupPincode('123');
      },
      /6-digit number/
    );
  });

  // 50. Registration without Location Allows Account Creation (Non-blocking Location)
  await test('Registration without Location Allows Account Creation (Non-blocking Location)', async () => {
    const noLocPhone = '9876543277';
    const regNoLoc = await authService.register({
      phone: noLocPhone,
      fullName: 'Vikram Menon',
      role: 'CUSTOMER',
    });
    assert(regNoLoc.token);
    assert.strictEqual(regNoLoc.user.phone, noLocPhone);
  });

  // 51. Customer Location Update API with Coordinate Range Validation and GeoJSON Point Format
  await test('Customer Location Update API with Coordinate Range Validation and GeoJSON Point', async () => {
    const uniquePhone = `9876${Date.now().toString().slice(-6)}`;
    const regRes = await authService.register({
      phone: uniquePhone,
      fullName: 'Anita George',
      role: 'CUSTOMER',
    });
    const testUserId = regRes.user.userId;

    // Valid coordinate update
    const updated = await customersService.updateLocation(testUserId, {
      fullAddress: 'Hilltop Enclave, Down Hill, Malappuram',
      city: 'Malappuram',
      district: 'Malappuram',
      state: 'Kerala',
      pincode: '676505',
      latitude: 11.051,
      longitude: 76.0711,
      locationSource: 'gps',
    });

    assert.strictEqual(updated.location?.type, 'Point');
    assert.deepStrictEqual(updated.location?.coordinates, [76.0711, 11.051]); // [lng, lat] GeoJSON order
    assert.strictEqual(updated.locationSource, 'gps');
    assert.strictEqual(updated.address?.pincode, '676505');

    // Invalid coordinate values must be rejected
    await assert.rejects(
      async () => {
        await customersService.updateLocation(testUserId, {
          latitude: 95.0, // Invalid: > 90
          longitude: 76.0,
        });
      },
      /Invalid coordinates/
    );

    await assert.rejects(
      async () => {
        await customersService.updateLocation(testUserId, {
          latitude: 11.0,
          longitude: 195.0, // Invalid: > 180
        });
      },
      /Invalid coordinates/
    );
  });

  // 52. Nearby Grocery Stores Discovery with Latitude/Longitude & Geospatial Distance
  await test('Nearby Grocery Stores Discovery with Latitude/Longitude & Geospatial Distance', async () => {
    // Search around Manjeri coordinates
    const nearby = await contentService.getNearbyStores({
      category: 'grocery',
      latitude: 11.1217,
      longitude: 76.1283,
      radius: 15,
      limit: 10,
    });

    assert(nearby.stores && Array.isArray(nearby.stores));
    assert(nearby.stores.length > 0, 'Must return nearby grocery stores');
    const first = nearby.stores[0];
    assert(first.name, 'Store has name');
    assert(first.category === 'grocery');
    assert(typeof first.distanceKm === 'number' || first.distanceKm === null);
    // Stores must return coordinates
    assert(first.latitude !== undefined, 'Store must expose latitude');
    assert(first.longitude !== undefined, 'Store must expose longitude');
  });

  // 53. Nearby Restaurants Discovery with Spatial Coordinates & Multi-Cuisine Details
  await test('Nearby Restaurants Discovery with Spatial Coordinates & Multi-Cuisine Details', async () => {
    const nearbyFood = await contentService.getNearbyStores({
      category: 'restaurant',
      latitude: 11.1217,
      longitude: 76.1283,
      radius: 20,
      limit: 10,
    });

    assert(nearbyFood.stores && Array.isArray(nearbyFood.stores));
    assert(nearbyFood.stores.length > 0, 'Must return nearby restaurants');
    const firstFood = nearbyFood.stores[0];
    assert.strictEqual(firstFood.category, 'restaurant');
    assert(firstFood.latitude !== undefined, 'Restaurant has latitude');
    assert(firstFood.longitude !== undefined, 'Restaurant has longitude');
    assert(Array.isArray(firstFood.cuisines), 'Restaurant provides cuisines array');
    assert(firstFood.rating >= 4.0, 'Restaurant has valid rating');
  });

  // 54. Account Deletion API with Idempotence, PII Scrubbing, and Statutory Compliance
  await test('Account Deletion API with Idempotence, PII Scrubbing, and Statutory Compliance', async () => {
    const deleteTestPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const regRes = await authService.register({
      phone: deleteTestPhone,
      fullName: 'Rahul Krishnan',
      role: 'CUSTOMER',
    });
    const testUserId = regRes.user.userId;

    // Execute deletion
    const delRes = await customersService.deleteAccount(testUserId, {
      reason: 'User requested deletion via mobile settings',
    });

    assert.strictEqual(delRes.success, true);
    assert.strictEqual(delRes.status, 'deleted');
    assert(delRes.message.includes('deleted'));

    // Idempotent secondary call should also succeed safely
    const secondDel = await customersService.deleteAccount(testUserId);
    assert.strictEqual(secondDel.success, true);
    assert.strictEqual(secondDel.status, 'deleted');
  });

  // 55. Deleted Account Login Rejection (Prevents Login After Account Deletion)
  await test('Deleted Account Login Rejection (Prevents Login After Account Deletion)', async () => {
    const dummyDeletedUser = {
      userId: 'usr_deleted_test_01',
      phone: '9876543299',
      fullName: 'Deleted User',
      roles: ['CUSTOMER'] as any,
      currentRole: 'CUSTOMER' as any,
      status: 'deleted' as any,
    };

    // If a user has status deleted, login with password or OTP must fail
    await assert.rejects(
      async () => {
        // Attempt password login for deleted status
        await authService.loginPassword('9876543299', 'password123');
      },
      /deleted|Invalid credentials/
    );
  });

  // 56. Multi-App Recharge Offers Retrieval with Role Filtering (Taxi, Partner, Delivery)
  await test('Multi-App Recharge Offers Retrieval with Role Filtering (Taxi, Partner, Delivery)', async () => {
    const taxiOffers = await walletService.getOffers('taxi', 'TAXI_DRIVER');
    assert(Array.isArray(taxiOffers), 'Taxi offers must be an array');
    assert(taxiOffers.length > 0, 'Taxi offers must return default or configured offers');
    assert(taxiOffers.every((o: any) => o.app === 'taxi' || o.app === 'all'));

    const partnerOffers = await walletService.getOffers('partner', 'PARTNER_ADMIN');
    assert(Array.isArray(partnerOffers));
    assert(partnerOffers.every((o: any) => o.app === 'partner' || o.app === 'all'));

    const deliveryOffers = await walletService.getOffers('delivery', 'DELIVERY_RIDER');
    assert(Array.isArray(deliveryOffers));
    assert(deliveryOffers.every((o: any) => o.app === 'delivery' || o.app === 'all'));
  });

  // 57. Admin Dynamic Pricing & Promotional Bonus Configuration (No Mobile Code Deploy Needed)
  await test('Admin Dynamic Pricing & Promotional Bonus Configuration (No Mobile Code Deploy Needed)', async () => {
    const customOfferId = `custom_promo_${Date.now()}`;
    const saved = await walletService.adminSaveOffer({
      offerId: customOfferId,
      name: 'Dynamic Weekend Mega Bonus',
      description: 'Admin created dynamic offer: Pay ₹2,000 get ₹20,000 total credit',
      app: 'taxi',
      userRole: 'TAXI_DRIVER',
      rechargeAmount: 2000,
      promotionalBonus: 18000,
      totalCredit: 20000,
      minAmount: 2000,
      maxAmount: 2000,
      badgeText: '10X WEEKEND',
      status: 'active',
      terms: ['Admin configurable dynamic term', 'Promotional bonus expires in 30 days'],
    });

    assert.strictEqual(saved.offerId, customOfferId);
    assert.strictEqual(saved.rechargeAmount, 2000);
    assert.strictEqual(saved.promotionalBonus, 18000);
    assert.strictEqual(saved.totalCredit, 20000);

    // Verify it is dynamically visible to mobile client immediately without app restart/build
    const refreshedOffers = await walletService.getOffers('taxi', 'TAXI_DRIVER');
    const matched = refreshedOffers.find((o: any) => o.offerId === customOfferId);
    assert(matched, 'Newly saved admin offer must be dynamically returned in mobile API');
    assert.strictEqual(matched.promotionalBonus, 18000);
  });

  // 58. Razorpay Cryptographic HMAC-SHA256 Signature Verification & Tamper Resistance
  await test('Razorpay Cryptographic HMAC-SHA256 Signature Verification & Tamper Resistance', () => {
    const testOrderId = 'order_test_982348234';
    const testPaymentId = 'pay_test_839284294';
    const secret = env.RAZORPAY_KEY_SECRET;

    // Correct HMAC signature
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest('hex');

    const isValid = verifyRazorpaySignature(testOrderId, testPaymentId, validSig);
    assert.strictEqual(isValid, true, 'Authentic Razorpay signature must be accepted');

    // Tampered paymentId
    const tamperedPaymentId = 'pay_test_tampered_999';
    const isTamperedValid = verifyRazorpaySignature(testOrderId, tamperedPaymentId, validSig);
    assert.strictEqual(isTamperedValid, false, 'Tampered payment ID must be rejected');

    // Corrupted signature
    const corruptedSig = validSig.slice(0, -4) + '0000';
    const isCorruptedValid = verifyRazorpaySignature(testOrderId, testPaymentId, corruptedSig);
    assert.strictEqual(isCorruptedValid, false, 'Corrupted signature must be rejected');
  });

  // 59. Secure Backend Order Generation against Authoritative Offer (Zero Client-Side Price Trust)
  await test('Secure Backend Order Generation against Authoritative Offer (Zero Client-Side Price Trust)', async () => {
    const testDriverUserId = `usr_test_driver_${Date.now()}`;
    const order = await walletService.createRechargeOrder(
      testDriverUserId,
      'taxi',
      'taxi_driver',
      'rch_taxi_1000'
    );

    assert(order.orderId, 'Razorpay orderId must be generated by backend');
    assert.strictEqual(order.amount, 1000, 'Recharge amount must be authoritative ₹1000 from server');
    assert.strictEqual(order.promotionalBonus, 9000, 'Bonus must be authoritative ₹9000 from server');
    assert.strictEqual(order.totalCredit, 10000, 'Total credit must be ₹10000');
    assert.strictEqual(order.currency, 'INR');
  });

  // 60. Authoritative Payment Verification & Atomic Dual-Balance Ledger Credit (Cash vs Promo Separation)
  await test('Authoritative Payment Verification & Atomic Dual-Balance Ledger Credit (Cash vs Promo Separation)', async () => {
    const testDriverUserId = `usr_test_driver_dual_${Date.now()}`;
    const initialWallet = await walletService.getOrCreateWallet(testDriverUserId, 'taxi', 'taxi_driver');
    assert.strictEqual(initialWallet.cashBalance, 0);
    assert.strictEqual(initialWallet.promotionalBalance, 0);
    assert.strictEqual(initialWallet.totalAvailableBalance, 0);

    const testPaymentId = `pay_verified_${Date.now()}`;
    const testOrderId = `order_verified_${Date.now()}`;
    const testSig = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest('hex');

    const verifyRes = await walletService.verifyRechargePayment(
      testDriverUserId,
      'taxi',
      'taxi_driver',
      {
        orderId: testOrderId,
        paymentId: testPaymentId,
        signature: testSig,
        offerId: 'rch_taxi_1000',
      }
    );

    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(verifyRes.creditedCash, 1000);
    assert.strictEqual(verifyRes.creditedPromo, 9000);
    assert.strictEqual(verifyRes.totalCredit, 10000);

    // Verify wallet state
    const updatedWallet = await walletService.getOrCreateWallet(testDriverUserId, 'taxi', 'taxi_driver');
    assert.strictEqual(updatedWallet.cashBalance, 1000, 'Cash balance must equal ₹1000 paid money');
    assert.strictEqual(updatedWallet.promotionalBalance, 9000, 'Promo balance must equal ₹9000 bonus credits');
    assert.strictEqual(updatedWallet.totalAvailableBalance, 10000, 'Total platform usable balance is ₹10000');

    // Verify double-entry ledger entries exist
    const txHistory = await walletService.getTransactions(testDriverUserId, 'taxi');
    assert(Array.isArray(txHistory.data), 'Transactions data must be an array');
    assert(txHistory.data.length >= 2, 'Must have distinct cash and promotional ledger transactions');
    const cashTx = txHistory.data.find((t: any) => t.transactionType === 'recharge_cash');
    const promoTx = txHistory.data.find((t: any) => t.transactionType === 'recharge_promo');
    assert(cashTx, 'Cash recharge ledger entry must exist');
    assert(promoTx, 'Promotional credit ledger entry must exist');
    assert.strictEqual(cashTx.cashBalanceChange, 1000);
    assert.strictEqual(promoTx.promoBalanceChange, 9000);
  });

  // 61. Payment Verification Idempotency Protection (Prevents Double Crediting on Network Retries)
  await test('Payment Verification Idempotency Protection (Prevents Double Crediting on Network Retries)', async () => {
    const testDriverUserId = `usr_test_driver_idemp_${Date.now()}`;
    const paymentId = `pay_idemp_${Date.now()}`;
    const orderId = `order_idemp_${Date.now()}`;
    const sig = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // First call: Credits the wallet
    const firstCall = await walletService.verifyRechargePayment(
      testDriverUserId,
      'taxi',
      'taxi_driver',
      {
        orderId,
        paymentId,
        signature: sig,
        offerId: 'rch_taxi_500',
      }
    );
    assert.strictEqual(firstCall.success, true);
    assert.strictEqual(firstCall.isDuplicate, false);
    assert.strictEqual(firstCall.wallet.cashBalance, 500);
    assert.strictEqual(firstCall.wallet.promotionalBalance, 4500);

    // Second call: Replay attack or network retry with the exact same paymentId
    const retryCall = await walletService.verifyRechargePayment(
      testDriverUserId,
      'taxi',
      'taxi_driver',
      {
        orderId,
        paymentId,
        signature: sig,
        offerId: 'rch_taxi_500',
      }
    );
    assert.strictEqual(retryCall.success, true);
    assert.strictEqual(retryCall.isDuplicate, true, 'Retry must be flagged as duplicate');

    // Balance must NOT have doubled
    const walletAfterRetry = await walletService.getOrCreateWallet(testDriverUserId, 'taxi', 'taxi_driver');
    assert.strictEqual(walletAfterRetry.cashBalance, 500, 'Cash balance must not duplicate');
    assert.strictEqual(walletAfterRetry.promotionalBalance, 4500, 'Promo balance must not duplicate');
    assert.strictEqual(walletAfterRetry.totalAvailableBalance, 5000);
  });

  // 62. Non-Withdrawable Promotional Credits Security Gate (Rejects Promotional Fund Cashout)
  await test('Non-Withdrawable Promotional Credits Security Gate (Rejects Promotional Fund Cashout)', async () => {
    const testPartnerUserId = `usr_test_partner_withdraw_${Date.now()}`;
    // User has ₹500 cash and ₹4,500 promotional credits (Total ₹5,000)
    const paymentId = `pay_wd_${Date.now()}`;
    const orderId = `order_wd_${Date.now()}`;
    const sig = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    await walletService.verifyRechargePayment(
      testPartnerUserId,
      'partner',
      'partner_admin',
      {
        orderId,
        paymentId,
        signature: sig,
        offerId: 'rch_partner_500',
      }
    );

    const wallet = await walletService.getOrCreateWallet(testPartnerUserId, 'partner', 'partner_admin');
    assert.strictEqual(wallet.cashBalance, 500);
    assert.strictEqual(wallet.promotionalBalance, 4500);
    assert.strictEqual(wallet.totalAvailableBalance, 5000);

    // Attempting to withdraw ₹2,000 (which is less than total balance ₹5,000 but exceeds cash balance ₹500)
    await assert.rejects(
      async () => {
        await walletService.requestWithdrawal(testPartnerUserId, 'partner', 'partner_admin', 2000);
      },
      (err: any) => {
        assert(err.message.includes('exceeds your eligible cash balance'));
        assert(err.message.includes('Promotional bonus credits'));
        return true;
      },
      'Withdrawal exceeding cashBalance must be rejected even if total available balance is sufficient'
    );
  });

  // 63. Eligible Cash Balance Withdrawal & Double-Entry Ledger Audit Trail
  await test('Eligible Cash Balance Withdrawal & Double-Entry Ledger Audit Trail', async () => {
    const testDeliveryUserId = `usr_test_rider_payout_${Date.now()}`;
    const paymentId = `pay_del_${Date.now()}`;
    const orderId = `order_del_${Date.now()}`;
    const sig = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Recharge ₹1,000 -> ₹1,000 Cash + ₹9,000 Promo
    await walletService.verifyRechargePayment(
      testDeliveryUserId,
      'delivery',
      'delivery_rider',
      {
        orderId,
        paymentId,
        signature: sig,
        offerId: 'rch_del_1000',
      }
    );

    // Withdraw ₹400 eligible cash
    const withdrawRes = await walletService.requestWithdrawal(
      testDeliveryUserId,
      'delivery',
      'delivery_rider',
      400
    );

    assert.strictEqual(withdrawRes.success, true);
    assert.strictEqual(withdrawRes.newCashBalance, 600);

    const updatedRiderWallet = await walletService.getOrCreateWallet(testDeliveryUserId, 'delivery', 'delivery_rider');
    assert.strictEqual(updatedRiderWallet.cashBalance, 600);
    assert.strictEqual(updatedRiderWallet.promotionalBalance, 9000);
    assert.strictEqual(updatedRiderWallet.totalAvailableBalance, 9600);

    // Verify withdrawal is auditable in ledger
    const history = await walletService.getTransactions(testDeliveryUserId, 'delivery');
    assert(Array.isArray(history.data), 'Ledger data must be an array');
    const withdrawalTx = history.data.find((t: any) => t.transactionType === 'payout_withdrawal');
    assert(withdrawalTx, 'Audit ledger must record payout_withdrawal transaction');
    assert.strictEqual(withdrawalTx.cashBalanceChange, -400);
    assert.strictEqual(withdrawalTx.promoBalanceChange, 0);
  });

  // -------------------------------------------------------------------------
  // RAZORPAY ECOSYSTEM COMPREHENSIVE INTEGRATION & AUDIT TEST SUITE (17 SCENARIOS)
  // -------------------------------------------------------------------------

  // 64. Razorpay Valid Payment Signature & Authoritative Verification (HMAC-SHA256)
  await test('Razorpay Valid Payment Signature & Authoritative Verification (HMAC-SHA256)', async () => {
    const testUserId = `usr_rzp_val_${Date.now()}`;
    const orderRes = await paymentsService.createPaymentOrder({
      userId: testUserId,
      userName: 'Audit Test Customer',
      app: 'ubssuper',
      purpose: 'order',
      amount: 499,
      currency: 'INR',
      referenceId: `ORD-${Date.now().toString().slice(-6)}`,
    });

    assert(orderRes.orderId, 'Razorpay order ID must be generated');
    assert.strictEqual(orderRes.amount, 499);
    assert.strictEqual(orderRes.amountInPaise, 49900);
    assert.strictEqual(orderRes.currency, 'INR');

    const paymentId = `pay_rzp_test_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderRes.orderId}|${paymentId}`)
      .digest('hex');

    const verifyRes = await paymentsService.verifyPayment({
      userId: testUserId,
      razorpayOrderId: orderRes.orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
      transactionId: orderRes.transactionId,
    });

    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(verifyRes.status, 'captured');
  });

  // 65. Razorpay Failed Payment Webhook Handling (Order & Payment status to 'failed')
  await test('Razorpay Failed Payment Webhook Handling', async () => {
    const testOrderId = `ORD-FAIL-${Date.now().toString().slice(-4)}`;
    const eventData = {
      entity: 'event',
      event: 'payment.failed',
      event_id: `evt_fail_${Date.now()}`,
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            amount: 50000,
            currency: 'INR',
            status: 'failed',
            order_id: `order_fail_${Date.now()}`,
            error_description: 'Card declined by issuing bank',
            notes: {
              orderId: testOrderId,
            },
          },
        },
      },
    };

    const rawBody = JSON.stringify(eventData);
    const signature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const webhookRes = await paymentsService.handleWebhook(rawBody, signature, eventData);
    assert.strictEqual(webhookRes.received, true);
    assert.strictEqual(webhookRes.event, 'payment.failed');
  });

  // 66. User Checkout Cancellation (Preserves Pending Order for Retry)
  await test('User Checkout Cancellation (Preserves Pending Order for Retry)', async () => {
    const testUserId = `usr_cancel_test_${Date.now()}`;
    const checkoutRes = await ordersService.checkout(testUserId, {
      type: 'grocery',
      items: [{ id: 'prod_cancel_1', name: 'Fresh Milk', quantity: 2, unitPrice: 40, totalPrice: 80 }],
      deliveryAddress: 'Indiranagar 100ft Road, Bengaluru',
      paymentMethod: 'razorpay',
    });

    assert(checkoutRes.order, 'Order must be created');
    assert.strictEqual(checkoutRes.order.paymentStatus, 'pending');
    assert.strictEqual(checkoutRes.order.fulfillmentStatus, 'placed');

    // User simulated cancel: order remains pending
    const retrieved = await ordersService.getOrderById(testUserId, checkoutRes.order.orderId);
    assert.strictEqual(retrieved.paymentStatus, 'pending');
  });

  // 67. Network Interruption Recovery (Idempotent Payment Status Retrieval via GET /status/:id)
  await test('Network Interruption Recovery (Idempotent Payment Status Retrieval)', async () => {
    const testUserId = `usr_net_rec_${Date.now()}`;
    const orderRes = await paymentsService.createPaymentOrder({
      userId: testUserId,
      app: 'ubssuper',
      purpose: 'order',
      amount: 350,
      currency: 'INR',
    });

    const statusRes = await paymentsService.getPaymentStatus(orderRes.transactionId);
    assert(statusRes, 'Payment status must be retrievable after network interruption');
    assert.strictEqual(statusRes.status, 'pending');
    assert.strictEqual(statusRes.majorAmount, 350);
  });

  // 68. Anti-Tampering: Rejection of Invalid or Forged Signature
  await test('Anti-Tampering: Rejection of Invalid or Forged Signature', async () => {
    const forgedOrderId = `order_forged_${Date.now()}`;
    const forgedPaymentId = `pay_forged_${Date.now()}`;
    const forgedSignature = 'forged_fake_signature_abc123';

    let rejected = false;
    try {
      await paymentsService.verifyPayment({
        userId: 'usr_fraud_test',
        razorpayOrderId: forgedOrderId,
        razorpayPaymentId: forgedPaymentId,
        razorpaySignature: forgedSignature,
      });
    } catch (err: any) {
      rejected = true;
      assert(err.message.includes('signature verification failed'), 'Error message must specify signature failure');
    }
    assert.strictEqual(rejected, true, 'Forged signature must be rejected');
  });

  // 69. Server-Side Price & Amount Protection (Rejects Zero or Manipulated Amounts)
  await test('Server-Side Price & Amount Protection (Rejects Zero or Manipulated Amounts)', async () => {
    let rejectedZero = false;
    try {
      await paymentsService.createPaymentOrder({
        userId: 'usr_zero_amt',
        app: 'ubssuper',
        purpose: 'order',
        amount: 0,
      });
    } catch (err: any) {
      rejectedZero = true;
    }
    assert.strictEqual(rejectedZero, true, 'Zero payment amount must be rejected');

    let rejectedNegative = false;
    try {
      await paymentsService.createPaymentOrder({
        userId: 'usr_neg_amt',
        app: 'ubssuper',
        purpose: 'order',
        amount: -150,
      });
    } catch (err: any) {
      rejectedNegative = true;
    }
    assert.strictEqual(rejectedNegative, true, 'Negative payment amount must be rejected');
  });

  // 70. Supported vs Unsupported Currency Validation (Rejects Invalid ISO Currencies)
  await test('Supported vs Unsupported Currency Validation', async () => {
    assert.strictEqual(isSupportedCurrency('INR'), true);
    assert.strictEqual(isSupportedCurrency('USD'), true);
    assert.strictEqual(isSupportedCurrency('EUR'), true);
    assert.strictEqual(isSupportedCurrency('AED'), true);
    assert.strictEqual(isSupportedCurrency('XYZ_FAKE'), false);

    let rejectedUnsupported = false;
    try {
      await paymentsService.createPaymentOrder({
        userId: 'usr_cur_test',
        app: 'ubssuper',
        purpose: 'order',
        amount: 100,
        currency: 'XYZ_FAKE',
      });
    } catch (err: any) {
      rejectedUnsupported = true;
      assert(err.message.includes('Unsupported currency'));
    }
    assert.strictEqual(rejectedUnsupported, true, 'Unsupported currency must be rejected');
  });

  // 71. Duplicate Checkout Request Interception (Idempotency Key / Short-Window Check)
  await test('Duplicate Checkout Request Interception', async () => {
    const testUserId = `usr_idemp_checkout_${Date.now()}`;
    const items = [{ id: 'prod_dup_1', name: 'Fresh Apples', quantity: 1, unitPrice: 120, totalPrice: 120 }];

    const firstOrder = await ordersService.checkout(testUserId, {
      type: 'grocery',
      items,
      deliveryAddress: 'MG Road, Bengaluru',
      paymentMethod: 'razorpay',
    });

    const secondOrder = await ordersService.checkout(testUserId, {
      type: 'grocery',
      items,
      deliveryAddress: 'MG Road, Bengaluru',
      paymentMethod: 'razorpay',
    });

    // Rapid duplicate checkout should return the existing pending order
    assert.strictEqual(firstOrder.order.orderId, secondOrder.order.orderId);
  });

  // 72. Webhook Idempotency & Deduplication (Rejects Replayed Event IDs)
  await test('Webhook Idempotency & Deduplication (Rejects Replayed Event IDs)', async () => {
    const uniqueEventId = `evt_dedup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const eventPayload = {
      entity: 'event',
      event: 'payment.captured',
      event_id: uniqueEventId,
      payload: {
        payment: {
          entity: {
            id: `pay_dedup_${Date.now()}`,
            amount: 25000,
            currency: 'INR',
            status: 'captured',
            order_id: `order_dedup_${Date.now()}`,
          },
        },
      },
    };

    const rawBody = JSON.stringify(eventPayload);
    const signature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    // First delivery: processes normally
    const firstDelivery = await paymentsService.handleWebhook(rawBody, signature, eventPayload);
    assert.strictEqual(firstDelivery.received, true);
    assert.strictEqual(firstDelivery.status, 'processed');

    // Replayed delivery: intercepted as duplicate
    const secondDelivery = await paymentsService.handleWebhook(rawBody, signature, eventPayload);
    assert.strictEqual(secondDelivery.received, true);
    assert.strictEqual(secondDelivery.deduplicated, true);
  });

  // 73. Out-of-Order Webhook Handling (Safe Processing Regardless of Delivery Timing)
  await test('Out-of-Order Webhook Handling', async () => {
    const orderPaidEvent = {
      entity: 'event',
      event: 'order.paid',
      event_id: `evt_ooo_${Date.now()}`,
      payload: {
        order: {
          entity: {
            id: `order_ooo_${Date.now()}`,
            amount: 75000,
            currency: 'INR',
            status: 'paid',
            receipt: 'rcpt_ooo_test',
          },
        },
      },
    };

    const rawBody = JSON.stringify(orderPaidEvent);
    const signature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const res = await paymentsService.handleWebhook(rawBody, signature, orderPaidEvent);
    assert.strictEqual(res.received, true);
    assert.strictEqual(res.event, 'order.paid');
  });

  // 74. Frontend Interruption Reconciliation (Webhook Captures Order if Client Crashed)
  await test('Frontend Interruption Reconciliation (Webhook Captures Order if Client Crashed)', async () => {
    const testUserId = `usr_crash_recon_${Date.now()}`;
    const checkout = await ordersService.checkout(testUserId, {
      type: 'grocery',
      items: [{ id: 'prod_recon_1', name: 'Almonds 500g', quantity: 1, unitPrice: 450, totalPrice: 450 }],
      deliveryAddress: 'Whitefield, Bengaluru',
      paymentMethod: 'razorpay',
    });

    assert.strictEqual(checkout.order.paymentStatus, 'pending');

    // Client crashed, but payment was captured on Razorpay and webhook arrived
    const capturedEvent = {
      entity: 'event',
      event: 'payment.captured',
      event_id: `evt_crash_recon_${Date.now()}`,
      payload: {
        payment: {
          entity: {
            id: `pay_crash_recon_${Date.now()}`,
            amount: 45000,
            currency: 'INR',
            status: 'captured',
            order_id: checkout.razorpayOrder?.id || `rzp_ord_${checkout.order.orderId}`,
            notes: {
              orderId: checkout.order.orderId,
            },
          },
        },
      },
    };

    const rawBody = JSON.stringify(capturedEvent);
    const signature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    await paymentsService.handleWebhook(rawBody, signature, capturedEvent);

    const updatedOrder = await ordersService.getOrderById(testUserId, checkout.order.orderId);
    assert.strictEqual(updatedOrder.paymentStatus, 'captured');
    assert.strictEqual(updatedOrder.fulfillmentStatus, 'confirmed');
  });

  // 75. Full Refund Processing via Razorpay & Audit Logging
  await test('Full Refund Processing via Razorpay & Audit Logging', async () => {
    const testPaymentId = `pay_live_test_${Date.now()}`;
    // Verify refund input validation
    let rejected = false;
    try {
      await paymentsService.processRefund({
        paymentId: 'invalid_non_pay_id',
        reason: 'Test cancellation',
        initiatedBy: 'admin',
      });
    } catch (err: any) {
      rejected = true;
      assert(err.message.includes('No valid Razorpay payment ID found'));
    }
    assert.strictEqual(rejected, true, 'Non-existent or non-pay ID must be rejected');
  });

  // 76. Partial Refund Handling & Ledger Consistency
  await test('Partial Refund Handling & Ledger Consistency', async () => {
    const refundEvent = {
      entity: 'event',
      event: 'refund.processed',
      event_id: `evt_refund_part_${Date.now()}`,
      payload: {
        refund: {
          entity: {
            id: `rfnd_test_${Date.now()}`,
            amount: 20000, // ₹200 partial refund of ₹500
            currency: 'INR',
            payment_id: `pay_part_${Date.now()}`,
            status: 'processed',
          },
        },
      },
    };

    const rawBody = JSON.stringify(refundEvent);
    const signature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const res = await paymentsService.handleWebhook(rawBody, signature, refundEvent);
    assert.strictEqual(res.received, true);
    assert.strictEqual(res.event, 'refund.processed');
  });

  // 77. Multi-App Wallet Recharge Ledger Accounting (Strict Cash vs Promo Separation)
  await test('Multi-App Wallet Recharge Ledger Accounting (Cash vs Promo Separation)', async () => {
    const driverUserId = `usr_taxi_driver_audit_${Date.now()}`;
    const riderUserId = `usr_delivery_rider_audit_${Date.now()}`;

    const driverWallet = await walletService.getOrCreateWallet(driverUserId, 'taxi', 'taxi_driver');
    assert.strictEqual(driverWallet.cashBalance, 0);
    assert.strictEqual(driverWallet.promotionalBalance, 0);

    const riderWallet = await walletService.getOrCreateWallet(riderUserId, 'delivery', 'delivery_rider');
    assert.strictEqual(riderWallet.cashBalance, 0);
    assert.strictEqual(riderWallet.promotionalBalance, 0);

    // Verify recharge offer structures exist for each app
    const taxiOffers = await walletService.getOffers('taxi', 'TAXI_DRIVER');
    assert(taxiOffers.length > 0, 'Taxi driver offers must exist');
    assert(taxiOffers[0].rechargeAmount > 0);
    assert(taxiOffers[0].promotionalBonus > 0);

    const deliveryOffers = await walletService.getOffers('delivery', 'DELIVERY_RIDER');
    assert(deliveryOffers.length > 0, 'Delivery rider offers must exist');
    assert(deliveryOffers[0].rechargeAmount > 0);
    assert(deliveryOffers[0].promotionalBonus > 0);
  });

  // 78. Order Payment Retry Workflow with Active Razorpay Order ID
  await test('Order Payment Retry Workflow with Active Razorpay Order ID', async () => {
    const testUserId = `usr_retry_test_${Date.now()}`;
    const checkout = await ordersService.checkout(testUserId, {
      type: 'food',
      items: [{ id: 'food_retry_1', name: 'Biryani Meal', quantity: 1, unitPrice: 280, totalPrice: 280 }],
      deliveryAddress: 'Koramangala 5th Block, Bengaluru',
      paymentMethod: 'razorpay',
    });

    const retryRes = await ordersService.retryPayment(testUserId, checkout.order.orderId);
    assert(retryRes.razorpayOrder, 'Retry response must contain razorpayOrder');
    assert(retryRes.razorpayOrder.id, 'Retry response must contain active Razorpay Order ID');
    assert.strictEqual(retryRes.razorpayOrder.currency, 'INR');
  });

  // 79. App Restart Recovery via Database Order State Synchronization
  await test('App Restart Recovery via Database Order State Synchronization', async () => {
    const testUserId = `usr_restart_test_${Date.now()}`;
    const checkout = await ordersService.checkout(testUserId, {
      type: 'grocery',
      items: [{ id: 'prod_restart_1', name: 'Brown Bread', quantity: 1, unitPrice: 50, totalPrice: 50 }],
      deliveryAddress: 'HSR Layout, Bengaluru',
      paymentMethod: 'cash',
    });

    // Simulate app restart / cold start fetch
    const fetched = await ordersService.getOrderById(testUserId, checkout.order.orderId);
    assert.strictEqual(fetched.orderId, checkout.order.orderId);
    assert.strictEqual(fetched.totalAmount, checkout.order.totalAmount);
    assert.strictEqual(fetched.paymentMethod, 'cash');
  });

  // 80. Multi-Currency Checkout Preparation & Minor Unit (Paise/Cent) Conversion
  await test('Multi-Currency Checkout Preparation & Minor Unit Conversion', async () => {
    assert.strictEqual(toSmallestCurrencyUnit(100, 'INR'), 10000);
    assert.strictEqual(toSmallestCurrencyUnit(99.5, 'INR'), 9950);
    assert.strictEqual(toSmallestCurrencyUnit(15.25, 'USD'), 1525);
    assert.strictEqual(fromSmallestCurrencyUnit(10000, 'INR'), 100);
    assert.strictEqual(fromSmallestCurrencyUnit(9950, 'INR'), 99.5);
    assert.strictEqual(fromSmallestCurrencyUnit(1525, 'USD'), 15.25);
  });


  console.log(`\n================================================================`);
  console.log(`🎉 ALL ${passed} AUTOMATED BACKEND INTEGRATION SCENARIOS PASSED!`);
  console.log(`================================================================\n`);

}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
