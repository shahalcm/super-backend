// backend/tests/test-universal-account.ts
import assert from 'assert';
import { authService } from '../src/modules/auth/auth.service.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';

async function main() {
  console.log('🔄 Connecting to Database...');
  await connectDatabase();

  const testPhone = '9999999999';
  const testOtp = '123456';

  console.log(`\n1️⃣ Testing sendOtp for ${testPhone}...`);
  const sendRes = await authService.sendOtp(testPhone, '+91', 'CUSTOMER');
  assert.strictEqual(sendRes.success, true, 'sendOtp must succeed');
  assert.strictEqual(sendRes.testOtp, testOtp, 'sendOtp must return testOtp 123456');
  console.log('   ✅ sendOtp succeeded:', sendRes.message);

  console.log(`\n2️⃣ Testing verifyOtp for UBS Super (Customer App)...`);
  const custRes = await authService.verifyOtp(testPhone, testOtp, 'CUSTOMER');
  assert.strictEqual(custRes.user.phone, testPhone);
  assert(custRes.token.length > 20, 'Token generated');
  assert(custRes.user.roles.includes('CUSTOMER'), 'User has CUSTOMER role');
  console.log('   ✅ Customer App Authenticated successfully! User ID:', custRes.user.id);

  console.log(`\n3️⃣ Testing verifyOtp for UBS Super Taxi (Driver App)...`);
  const taxiRes = await authService.verifyOtp(testPhone, testOtp, 'TAXI_DRIVER');
  assert.strictEqual(taxiRes.driver.applicationStatus, 'approved', 'Driver must be approved');
  assert.strictEqual(taxiRes.driver.status, 'approved', 'Driver status must be approved');
  assert.strictEqual(taxiRes.driver.isOnline, true, 'Driver is online');
  assert(taxiRes.driver.vehicleModel.length > 0, 'Driver has vehicle model');
  console.log(`   ✅ Taxi Driver App Authenticated successfully! Vehicle: ${taxiRes.driver.vehicleModel} (${taxiRes.driver.registrationNumber}), Status: ${taxiRes.driver.applicationStatus}`);

  console.log(`\n4️⃣ Testing verifyOtp for UBS Partner (Merchant App)...`);
  const partnerRes = await authService.verifyOtp(testPhone, testOtp, 'PARTNER_OWNER');
  assert.strictEqual(partnerRes.partner.status, 'approved', 'Partner must be approved');
  assert.strictEqual(partnerRes.partner.applicationStatus, 'approved', 'Partner app status must be approved');
  assert.strictEqual(partnerRes.partner.category, 'grocery', 'Partner category must be grocery');
  console.log(`   ✅ Partner App Authenticated successfully! Business: ${partnerRes.partner.businessName}, Category: ${partnerRes.partner.category}`);

  console.log(`\n5️⃣ Testing verifyOtp for UBS Delivery (Rider App)...`);
  const deliveryRes = await authService.verifyOtp(testPhone, testOtp, 'DELIVERY_RIDER');
  assert.strictEqual(deliveryRes.rider.status, 'approved', 'Rider status must be approved');
  assert(deliveryRes.rider.totalCompletedDeliveries >= 0, 'Rider deliveries present');
  console.log(`   ✅ Delivery Rider App Authenticated successfully! Rider Status: ${deliveryRes.rider.status}, Zone: ${deliveryRes.rider.currentZone}`);

  console.log('\n======================================================');
  console.log('🎉 ALL 4 ECOSYSTEM APPS VERIFIED WITH TEST ACCOUNT!');
  console.log(`   📞 Phone: ${testPhone}`);
  console.log(`   🔑 OTP:   ${testOtp}`);
  console.log('======================================================\n');

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

