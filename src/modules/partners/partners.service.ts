// src/modules/partners/partners.service.ts
import { v4 as uuidv4 } from 'uuid';
import {
  PartnerBusinessModel,
  PartnerIntegrationModel,
  GroceryProductModel,
  HotelRoomModel,
  ClinicDoctorModel,
  OrderModel,
  UserModel,
} from '../../database/index.js';
import { platformRazorpay, verifyRazorpaySignature } from '../../config/razorpay.js';
import { encryptSecret, decryptSecret, maskSecret } from '../../utils/crypto.js';

import mongoose from 'mongoose';

const memoryPartnerStore = new Map<string, any>();

export class PartnersService {
  async getRegistration(userId: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        let partner = await PartnerBusinessModel.findOne({ userId });
        if (!partner) {
          const user = await UserModel.findOne({ userId });
          partner = await PartnerBusinessModel.create({
            partnerId: `ptn_${uuidv4().slice(0, 8)}`,
            userId,
            businessName: `${user?.fullName || 'Partner'}'s Business`,
            legalName: `${user?.fullName || 'Partner'} Trading Pvt Ltd`,
            category: 'grocery',
            ownerName: user?.fullName || 'Partner Owner',
            ownerPhone: user?.phone || '9876543210',
            ownerEmail: user?.email || 'owner@ubspartner.com',
            address: '100ft Road, Indiranagar',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560038',
            status: 'draft',
          });
        }
        return partner;
      } catch {
        // Fallback to memory store
      }
    }

    if (!memoryPartnerStore.has(userId)) {
      memoryPartnerStore.set(userId, {
        partnerId: `ptn_${uuidv4().slice(0, 8)}`,
        userId,
        businessName: "Test Partner's Business",
        legalName: 'Test Partner Trading Pvt Ltd',
        category: 'grocery',
        ownerName: 'Test Partner Owner',
        ownerPhone: '9876540001',
        ownerEmail: 'owner@ubspartner.com',
        address: '100ft Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        status: 'draft',
        registrationFee: { isPaid: false, amount: 999, currency: 'INR' },
        save: async function () {
          return this;
        },
      });
    }
    return memoryPartnerStore.get(userId);
  }

  async updateRegistration(userId: string, data: any) {
    const partner = await PartnerBusinessModel.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, upsert: true }
    );
    return partner;
  }

  async submitRegistration(userId: string) {
    const partner = await PartnerBusinessModel.findOne({ userId });
    if (!partner) throw new Error('Partner registration record not found');

    if (!partner.registrationFee.isPaid) {
      throw new Error('Registration onboarding fee payment must be completed before submission.');
    }

    partner.status = 'submitted';
    await partner.save();
    return partner;
  }

  async createRegistrationFeeOrder(userId: string) {
    const partner = await PartnerBusinessModel.findOne({ userId });
    if (!partner) throw new Error('Partner not found');

    const amountInPaise = partner.registrationFee.amount * 100; // e.g. 999 * 100 = 99900 paise

    let orderId = `order_${uuidv4().slice(0, 14)}`;

    try {
      const rzpOrder = await platformRazorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_reg_${partner.partnerId}`,
        notes: {
          partnerId: partner.partnerId,
          type: 'PARTNER_REGISTRATION_FEE',
        },
      });
      orderId = rzpOrder.id;
    } catch {
      // In dev mode when offline or using test credentials, keep generated orderId
    }

    partner.registrationFee.orderId = orderId;
    await partner.save();

    return {
      orderId,
      amount: partner.registrationFee.amount,
      currency: partner.registrationFee.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id',
      businessName: partner.businessName,
    };
  }

  async verifyRegistrationFeePayment(userId: string, data: { orderId: string; paymentId: string; signature: string }) {
    const partner = await PartnerBusinessModel.findOne({ userId });
    if (!partner) throw new Error('Partner not found');

    // Verify cryptographic HMAC signature
    const isValid = verifyRazorpaySignature(data.orderId, data.paymentId, data.signature);

    // In dev mode allow test signatures
    if (!isValid && process.env.NODE_ENV === 'production') {
      throw new Error('Cryptographic payment signature verification failed.');
    }

    partner.registrationFee.isPaid = true;
    partner.registrationFee.paymentId = data.paymentId;
    partner.registrationFee.paidAt = new Date();
    await partner.save();

    return {
      success: true,
      message: 'Registration onboarding fee verified successfully',
      partner,
    };
  }

  async getDashboardSummary(userId: string) {
    const partner = await PartnerBusinessModel.findOne({ userId });
    if (!partner) throw new Error('Partner not found');

    const totalOrders = await OrderModel.countDocuments({ partnerId: partner.partnerId });
    const pendingOrders = await OrderModel.countDocuments({
      partnerId: partner.partnerId,
      fulfillmentStatus: { $in: ['placed', 'confirmed', 'preparing'] },
    });
    const completedOrders = await OrderModel.countDocuments({
      partnerId: partner.partnerId,
      fulfillmentStatus: 'delivered',
    });

    const activeProducts = await GroceryProductModel.countDocuments({
      partnerId: partner.partnerId,
      inStock: true,
    });

    return {
      businessName: partner.businessName,
      category: partner.category,
      status: partner.status,
      totalRevenue: partner.totalRevenue,
      totalOrders,
      pendingOrders,
      completedOrders,
      activeProducts,
      rating: partner.rating,
      commissionPaid: partner.commissionPaid,
      outstandingBalance: partner.outstandingBalance,
    };
  }

  // --- Grocery SKU & Orders ---
  async getGroceryProducts(partnerId: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        return await GroceryProductModel.find({ partnerId }).sort({ createdAt: -1 });
      } catch {
        // Fallback
      }
    }
    return [];
  }

  async createGroceryProduct(partnerId: string, data: any) {
    const product = await GroceryProductModel.create({
      productId: `prod_${uuidv4().slice(0, 8)}`,
      partnerId,
      ...data,
    });
    return product;
  }

  async updateGroceryProduct(productId: string, partnerId: string, data: any) {
    const product = await GroceryProductModel.findOneAndUpdate(
      { productId, partnerId },
      { $set: data },
      { new: true }
    );
    return product;
  }

  async deleteGroceryProduct(productId: string, partnerId: string) {
    await GroceryProductModel.findOneAndDelete({ productId, partnerId });
    return { success: true };
  }

  async getPartnerOrders(partnerId: string) {
    return OrderModel.find({ partnerId }).sort({ createdAt: -1 });
  }

  async updateOrderStatus(orderId: string, partnerId: string, status: string) {
    const order = await OrderModel.findOneAndUpdate(
      { orderId, partnerId },
      {
        fulfillmentStatus: status,
        $push: {
          timeline: {
            status,
            timestamp: new Date(),
            note: `Status updated by merchant to ${status}`,
          },
        },
      },
      { new: true }
    );
    return order;
  }

  // --- Razorpay Partner Vault (AES-256-GCM) ---
  async getRazorpayIntegration(partnerId: string) {
    const record = await PartnerIntegrationModel.findOne({ partnerId, provider: 'razorpay' });
    if (!record) {
      return {
        provider: 'razorpay',
        status: 'unconfigured',
        environment: 'test',
        keyId: '',
        secretMasked: '',
      };
    }

    return {
      id: record.id,
      provider: record.provider,
      status: record.status,
      environment: record.environment,
      keyId: record.encryptedCredentials.keyId || '',
      secretMasked: maskSecret(record.encryptedCredentials.encryptedSecret ? 'secret_configured' : ''),
      lastTestedAt: record.lastTestedAt,
      lastUpdatedAt: record.lastUpdatedAt,
    };
  }

  async saveRazorpayIntegration(partnerId: string, data: { keyId: string; keySecret: string; environment?: 'test' | 'live' }) {
    const encrypted = encryptSecret(data.keySecret);

    const record = await PartnerIntegrationModel.findOneAndUpdate(
      { partnerId, provider: 'razorpay' },
      {
        id: `pi_rzp_${partnerId}`,
        partnerId,
        provider: 'razorpay',
        integrationName: 'Razorpay Payment Gateway',
        environment: data.environment || 'test',
        status: 'connected',
        encryptedCredentials: {
          keyId: data.keyId,
          encryptedSecret: encrypted.encrypted,
          iv: encrypted.iv,
          tag: encrypted.tag,
        },
        lastTestedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      status: record.status,
      keyId: data.keyId,
      secretMasked: maskSecret(data.keySecret),
    };
  }
}

export const partnersService = new PartnersService();
