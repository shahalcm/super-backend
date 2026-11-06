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
import { uploadImage } from '../../config/cloudinary.js';

import mongoose from 'mongoose';

const memoryPartnerStore = new Map<string, any>();

export class PartnersService {
  formatRegistrationResponse(p: any) {
    if (!p) return null;
    return {
      id: p.partnerId || p.id || 'reg_partner',
      partnerId: p.partnerId || p.id || 'reg_partner',
      currentStep: p.currentStep || 1,
      owner: {
        fullName: p.ownerName || p.owner?.fullName || '',
        phone: p.ownerPhone || p.owner?.phone || '',
        email: p.ownerEmail || p.owner?.email || '',
        role: p.ownerRole || p.owner?.role || '',
        dob: p.ownerDob || p.owner?.dob || '',
      },
      category: p.category || 'grocery',
      business: {
        legalName: p.legalName || p.business?.legalName || '',
        displayName: p.businessName || p.business?.displayName || '',
        description: p.storeDescription || p.business?.description || '',
        businessType: p.businessType || p.business?.businessType || '',
        address: p.address || p.business?.address || '',
        city: p.city || p.business?.city || '',
        state: p.state || p.business?.state || '',
        postalCode: p.postalCode || p.business?.postalCode || '',
        country: p.country || 'India',
        businessPhone: p.businessPhone || p.ownerPhone || '',
        businessEmail: p.businessEmail || p.ownerEmail || '',
        operatingHours: p.operatingHoursStr || '',
      },
      documents: (p.documents || []).map((d: any) => ({
        id: d.id,
        type: d.type,
        label: d.label,
        fileName: d.fileName,
        fileUri: d.fileUrl || d.fileUri || '',
        status: d.status || 'pending',
        uploadedAt: d.uploadedAt ? (d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : d.uploadedAt) : new Date().toISOString(),
        rejectionReason: d.rejectionReason,
      })),
      categorySetup: p.categorySetup || {},
      settlement: {
        accountHolderName: p.bankDetails?.accountHolderName || p.settlement?.accountHolderName || '',
        bankName: p.bankDetails?.bankName || p.settlement?.bankName || '',
        accountNumber: p.bankDetails?.accountNumber || p.settlement?.accountNumber || '',
        ifscCode: p.bankDetails?.ifscCode || p.settlement?.ifscCode || '',
      },
      registrationFee: {
        amount: p.registrationFee?.amount || 999,
        currency: p.registrationFee?.currency || 'INR',
        isPaid: !!p.registrationFee?.isPaid,
        orderId: p.registrationFee?.orderId,
        paymentId: p.registrationFee?.paymentId,
      },
      status: p.status || 'draft',
    };
  }

  async getRawPartnerRecord(userId: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        let partner = await PartnerBusinessModel.findOne({ userId });
        if (!partner) {
          const user = await UserModel.findOne({ userId });
          partner = await PartnerBusinessModel.create({
            partnerId: `ptn_${uuidv4().slice(0, 8)}`,
            userId,
            businessName: '',
            legalName: '',
            category: 'grocery',
            ownerName: user?.fullName || '',
            ownerPhone: user?.phone || '',
            ownerEmail: user?.email || '',
            address: '',
            city: '',
            state: '',
            postalCode: '',
            status: 'draft',
            documents: [],
            registrationFee: { isPaid: false, amount: 999, currency: 'INR' },
            logo: '',
            coverImage: '',
            galleryImages: [],
            storeDescription: '',
            cuisines: [],
            deliveryAvailable: true,
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
        businessName: '',
        legalName: '',
        category: 'grocery',
        ownerName: '',
        ownerPhone: '',
        ownerEmail: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        status: 'draft',
        documents: [],
        registrationFee: { isPaid: false, amount: 999, currency: 'INR' },
        logo: '',
        coverImage: '',
        galleryImages: [],
        storeDescription: '',
        cuisines: [],
        deliveryAvailable: true,
        save: async function () {
          return this;
        },
      });
    }
    return memoryPartnerStore.get(userId);
  }

  async getRegistration(userId: string) {
    const partner = await this.getRawPartnerRecord(userId);
    return this.formatRegistrationResponse(partner);
  }

  async updateRegistration(userId: string, data: any) {
    const updatePayload: any = { ...data };

    if (data.owner) {
      if (data.owner.fullName !== undefined) updatePayload.ownerName = data.owner.fullName;
      if (data.owner.phone !== undefined) updatePayload.ownerPhone = data.owner.phone;
      if (data.owner.email !== undefined) updatePayload.ownerEmail = data.owner.email;
      if (data.owner.role !== undefined) updatePayload.ownerRole = data.owner.role;
      if (data.owner.dob !== undefined) updatePayload.ownerDob = data.owner.dob;
    }

    if (data.business) {
      if (data.business.displayName !== undefined) updatePayload.businessName = data.business.displayName;
      if (data.business.legalName !== undefined) updatePayload.legalName = data.business.legalName;
      if (data.business.description !== undefined) updatePayload.storeDescription = data.business.description;
      if (data.business.businessType !== undefined) updatePayload.businessType = data.business.businessType;
      if (data.business.address !== undefined) updatePayload.address = data.business.address;
      if (data.business.city !== undefined) updatePayload.city = data.business.city;
      if (data.business.state !== undefined) updatePayload.state = data.business.state;
      if (data.business.postalCode !== undefined) updatePayload.postalCode = data.business.postalCode;
      if (data.business.businessPhone !== undefined) updatePayload.businessPhone = data.business.businessPhone;
      if (data.business.businessEmail !== undefined) updatePayload.businessEmail = data.business.businessEmail;
      if (data.business.operatingHours !== undefined) updatePayload.operatingHoursStr = data.business.operatingHours;
    }

    if (data.settlement) {
      updatePayload.bankDetails = {
        bankName: data.settlement.bankName || '',
        accountHolderName: data.settlement.accountHolderName || '',
        accountNumber: data.settlement.accountNumber || '',
        ifscCode: data.settlement.ifscCode || '',
        upiId: data.settlement.upiId || '',
      };
    }

    if (data.documents && Array.isArray(data.documents)) {
      updatePayload.documents = data.documents.map((d: any) => ({
        id: d.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: d.type || 'other',
        label: d.label || 'Document',
        fileName: d.fileName || 'document.pdf',
        fileUrl: d.fileUri || d.fileUrl || '',
        status: d.status || 'pending',
        uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : new Date(),
        rejectionReason: d.rejectionReason,
      }));
    }

    if (data.currentStep !== undefined) {
      updatePayload.currentStep = data.currentStep;
    }

    let partner = null;
    if (mongoose.connection.readyState === 1) {
      partner = await PartnerBusinessModel.findOneAndUpdate(
        { userId },
        { $set: updatePayload },
        { new: true, upsert: true }
      );
    }

    if (memoryPartnerStore.has(userId)) {
      const existing = memoryPartnerStore.get(userId);
      const merged = { ...existing, ...updatePayload };
      memoryPartnerStore.set(userId, merged);
      if (!partner) partner = merged;
    }

    return this.formatRegistrationResponse(partner || updatePayload);
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
  async getGroceryProducts(partnerId?: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = partnerId ? { partnerId } : {};
        return await GroceryProductModel.find(query).sort({ createdAt: -1 });
      } catch {
        // Fallback
      }
    }
    return [];
  }

  async getGroceryProductById(productId: string) {
    if (mongoose.connection.readyState === 1) {
      try {
        const product = await GroceryProductModel.findOne({ productId });
        if (product) return product;
      } catch {
        // Fallback
      }
    }
    throw new Error(`Product ${productId} not found`);
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

  // --- Store Images & Branding Management ---
  async uploadStoreImage(userId: string, dataUri: string, type: 'logo' | 'cover' | 'gallery') {
    const partner = await this.getRawPartnerRecord(userId);
    if (!partner) throw new Error('Partner profile not found');

    const folder = partner.category === 'restaurant' ? 'restaurants' : 'grocery_stores';
    const result = await uploadImage(dataUri, folder);

    if (type === 'logo') {
      partner.logo = result.url;
    } else if (type === 'cover') {
      partner.coverImage = result.url;
    } else if (type === 'gallery') {
      if (!Array.isArray(partner.galleryImages)) {
        partner.galleryImages = [];
      }
      partner.galleryImages.push(result.url);
    }

    if (mongoose.connection.readyState === 1 && typeof partner.save === 'function') {
      await partner.save();
    }

    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
      type,
      branding: {
        logo: partner.logo,
        coverImage: partner.coverImage,
        galleryImages: partner.galleryImages,
        businessName: partner.businessName,
      },
    };
  }

  async getStoreBranding(userId: string) {
    const partner = await this.getRawPartnerRecord(userId);
    if (!partner) throw new Error('Partner profile not found');

    return {
      partnerId: partner.partnerId,
      businessName: partner.businessName,
      category: partner.category,
      logo: partner.logo || '',
      coverImage: partner.coverImage || '',
      galleryImages: partner.galleryImages || [],
      storeDescription: partner.storeDescription || '',
      cuisines: partner.cuisines || [],
      operatingHours: partner.operatingHours || { openTime: '09:00', closeTime: '22:00', isOpen: true },
      isOpen: partner.operatingHours?.isOpen !== false,
      deliveryAvailable: partner.deliveryAvailable !== false,
      deliveryFee: partner.deliveryFee ?? 25,
      minOrderAmount: partner.minOrderAmount ?? 149,
      estimatedDeliveryMinutes: partner.estimatedDeliveryMinutes ?? 25,
      address: partner.address,
      city: partner.city,
    };
  }

  async updateStoreBranding(userId: string, data: any) {
    const partner = await this.getRawPartnerRecord(userId);
    if (!partner) throw new Error('Partner profile not found');

    if (data.logo !== undefined) partner.logo = data.logo;
    if (data.coverImage !== undefined) partner.coverImage = data.coverImage;
    if (data.galleryImages !== undefined && Array.isArray(data.galleryImages)) {
      partner.galleryImages = data.galleryImages;
    }
    if (data.storeDescription !== undefined) partner.storeDescription = data.storeDescription;
    if (data.cuisines !== undefined && Array.isArray(data.cuisines)) {
      partner.cuisines = data.cuisines;
    }
    if (data.isOpen !== undefined) {
      if (!partner.operatingHours) {
        partner.operatingHours = { openTime: '09:00', closeTime: '22:00', isOpen: true };
      }
      partner.operatingHours.isOpen = !!data.isOpen;
    }
    if (data.deliveryAvailable !== undefined) {
      partner.deliveryAvailable = !!data.deliveryAvailable;
    }
    if (data.minOrderAmount !== undefined) {
      partner.minOrderAmount = Number(data.minOrderAmount);
    }
    if (data.deliveryFee !== undefined) {
      partner.deliveryFee = Number(data.deliveryFee);
    }
    if (data.estimatedDeliveryMinutes !== undefined) {
      partner.estimatedDeliveryMinutes = Number(data.estimatedDeliveryMinutes);
    }

    if (mongoose.connection.readyState === 1 && typeof partner.save === 'function') {
      await partner.save();
    }

    return this.getStoreBranding(userId);
  }

  async deleteGalleryImage(userId: string, imageUrl: string) {
    const partner = await this.getRawPartnerRecord(userId);
    if (!partner) throw new Error('Partner profile not found');

    if (Array.isArray(partner.galleryImages)) {
      partner.galleryImages = partner.galleryImages.filter((img: string) => img !== imageUrl);
    }

    if (mongoose.connection.readyState === 1 && typeof partner.save === 'function') {
      await partner.save();
    }

    return {
      success: true,
      galleryImages: partner.galleryImages,
    };
  }
}

export const partnersService = new PartnersService();
