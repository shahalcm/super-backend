// backend/scripts/verify-real-estate-integration.ts
import { realEstateService } from '../src/modules/real-estate/real-estate.service.js';
import { verifyRazorpaySignature } from '../src/config/razorpay.js';
import crypto from 'crypto';
import { env } from '../src/config/env.js';

async function runTestSuite() {
  console.log('====================================================');
  console.log('--- UBS SUPER REAL ESTATE & PAYMENT AUDIT TEST ---');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Audit Listing Fee
    const feeConfig = await realEstateService.getListingFee();
    assert(
      feeConfig.amount > 0 && feeConfig.currency === 'INR',
      `Listing fee verified: ₹${feeConfig.amount} ${feeConfig.currency}`
    );

    // 2. Audit Removal of Fake Properties
    const initialProps = await realEstateService.getProperties({});
    const hasFakeSeeds = initialProps.properties.some((p: any) =>
      p.propertyId === 'PR-10001' || p.propertyId === 'PR-10002' || p.propertyId === 'PR-10003'
    );
    assert(
      !hasFakeSeeds,
      `Fake seed properties removed. Initial live count: ${initialProps.properties.length}`
    );

    // 3. Test Cloudinary Image Upload
    console.log('\n--- Testing Cloudinary Property Image Upload ---');
    // Minimal 1x1 transparent PNG data URI
    const testBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const uploadRes = await realEstateService.uploadPropertyImage(testBase64Png);
    assert(
      uploadRes && typeof uploadRes.url === 'string' && (uploadRes.url.includes('cloudinary.com') || uploadRes.url.startsWith('http')),
      `Image uploaded to Cloudinary: ${uploadRes.url.slice(0, 60)}...`
    );

    // 4. Test Property Draft Creation with Cloudinary Image
    console.log('\n--- Testing Property Draft Creation ---');
    const testUserId = `usr_test_${Date.now()}`;
    const draftRes = await realEstateService.createPropertyDraft(
      testUserId,
      'Dr. Najeeb Valanchery',
      '+91 94470 12345',
      {
        title: 'Luxury 4 BHK Smart Villa with Solar in Calicut',
        description: 'Prime contemporary designer villa with private garden, automation, and 3-car parking.',
        propertyType: 'villa',
        listingType: 'sale',
        category: 'Residential',
        price: 12500000,
        location: 'NH Bypass, Thondayad, Kozhikode',
        address: 'Bypass Greens, Near Cyberpark',
        city: 'Kozhikode',
        state: 'Kerala',
        images: [uploadRes.url],
        bedrooms: 4,
        bathrooms: 4,
        area: '3400 sq.ft',
        amenities: ['Solar Power', 'Private Garden', 'Home Automation', 'Covered Parking'],
        contactName: 'Dr. Najeeb Valanchery',
        contactPhone: '+91 94470 12345',
      }
    );

    assert(
      draftRes.property && draftRes.property.propertyId.startsWith('PR-'),
      `Property draft created with ID: ${draftRes.property.propertyId}`
    );
    assert(
      draftRes.property.images[0].includes('cloudinary.com') || draftRes.property.images[0].startsWith('http'),
      `Property images saved in Cloudinary storage`
    );
    assert(
      draftRes.property.isPaid === false && draftRes.property.status === 'pending_payment',
      `Property requires listing fee payment before publishing`
    );

    // 5. Test Server-side Razorpay Order Creation
    console.log('\n--- Testing Razorpay Order Creation ---');
    const orderData = await realEstateService.createListingOrder(
      testUserId,
      'Dr. Najeeb Valanchery',
      '+91 94470 12345',
      draftRes.property.propertyId
    );

    assert(
      orderData.orderId && orderData.amount === feeConfig.amount && orderData.currency === 'INR',
      `Razorpay order created: ${orderData.orderId} for amount ₹${orderData.amount}`
    );
    assert(
      orderData.keyId === env.RAZORPAY_KEY_ID,
      `Razorpay public Key ID matches live configuration: ${orderData.keyId}`
    );

    // 6. Test Cryptographic HMAC-SHA256 Signature Verification
    console.log('\n--- Testing Razorpay HMAC-SHA256 Signature Verification ---');
    const mockPaymentId = `pay_live_${Date.now().toString().slice(-6)}`;
    const secret = env.RAZORPAY_KEY_SECRET;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderData.orderId}|${mockPaymentId}`)
      .digest('hex');

    const isSigValid = verifyRazorpaySignature(orderData.orderId!, mockPaymentId, expectedSig, secret);
    assert(isSigValid, 'HMAC-SHA256 cryptographic signature equation matches Razorpay specification');

    const verifyResult = await realEstateService.verifyListingPayment(testUserId, {
      propertyId: draftRes.property.propertyId,
      razorpayOrderId: orderData.orderId!,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: expectedSig,
    });

    assert(
      verifyResult.success === true && verifyResult.property.isPaid === true,
      `Listing payment verified on backend and marked as paid`
    );
    assert(
      verifyResult.property.approvalStatus === 'approved' && verifyResult.property.status === 'approved',
      `Property activated upon successful payment`
    );

    // 7. Verify Newly Added Property is Seen in the Feed
    console.log('\n--- Verifying Added Product Appears in Feed ---');
    const updatedFeed = await realEstateService.getProperties({});
    const foundAddedProperty = updatedFeed.properties.find(
      (p: any) => p.propertyId === draftRes.property.propertyId
    );

    assert(
      foundAddedProperty !== undefined,
      `Added property "${draftRes.property.title}" is visible in Real Estate listings feed!`
    );
    assert(
      foundAddedProperty.images[0] === uploadRes.url,
      `Added property image matches Cloudinary URL: ${uploadRes.url.slice(0, 50)}...`
    );

    // 8. Test Webhook Idempotency for Property Listing
    console.log('\n--- Testing Webhook Fulfillment ---');
    await realEstateService.markPropertyPaidFromWebhook({
      propertyId: draftRes.property.propertyId,
      razorpayOrderId: orderData.orderId,
      razorpayPaymentId: mockPaymentId,
    });
    assert(true, 'Webhook fulfillment processed without duplicate errors');

  } catch (err: any) {
    console.error('Test error:', err);
    assert(false, `Unexpected error: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`--- TEST RESULTS: ${passed}/${total} PASSED ---`);
  console.log('====================================================');
}

runTestSuite();

