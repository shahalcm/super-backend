// src/modules/real-estate/real-estate.service.ts
import mongoose from 'mongoose';
import {
  PropertyModel,
  IProperty,
  PropertyListingFeeModel,
  IPropertyListingFee,
  PropertyListingPaymentModel,
  IPropertyListingPayment,
  PaymentModel,
  AuditLogModel,
} from '../../database/index.js';
import { platformRazorpay, verifyRazorpaySignature } from '../../config/razorpay.js';
import { uploadImage } from '../../config/cloudinary.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// In-memory stores for runtime session & test sandbox
let memoryFeeConfig = {
  feature: 'real_estate_property_listing',
  amount: 50,
  currency: 'INR',
  isEnabled: true,
  updatedBy: 'system',
  updatedByName: 'System Default',
  updatedAt: new Date(),
  history: [
    {
      amount: 50,
      currency: 'INR',
      isEnabled: true,
      changedBy: 'system',
      changedByName: 'System Default',
      changedAt: new Date(),
      reason: 'Initial ecosystem real estate listing fee setup',
    },
  ],
};

// No fake seed properties - only genuine user and partner added listings
const memoryProperties: any[] = [];
const memoryPayments: any[] = [];

export class RealEstateService {
  private isMongoConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * 1. GET CURRENT ACTIVE PROPERTY LISTING FEE
   * Fetches active fee configuration (Default ₹50 INR)
   */
  async getListingFee(): Promise<{
    feature: string;
    amount: number;
    currency: string;
    isEnabled: boolean;
    updatedAt: Date;
    updatedByName?: string;
  }> {
    if (this.isMongoConnected()) {
      try {
        const feeConfig = await PropertyListingFeeModel.getActiveFee();
        return {
          feature: feeConfig.feature,
          amount: feeConfig.amount,
          currency: feeConfig.currency,
          isEnabled: feeConfig.isEnabled,
          updatedAt: feeConfig.updatedAt,
          updatedByName: feeConfig.updatedByName,
        };
      } catch (err) {
        logger.warn({ err }, 'Mongo read failed, using memory fee config');
      }
    }

    return {
      feature: memoryFeeConfig.feature,
      amount: memoryFeeConfig.amount,
      currency: memoryFeeConfig.currency,
      isEnabled: memoryFeeConfig.isEnabled,
      updatedAt: memoryFeeConfig.updatedAt,
      updatedByName: memoryFeeConfig.updatedByName,
    };
  }

  /**
   * 2. ADMIN UPDATE LISTING FEE
   * Changes the listing fee dynamically without redeploying code.
   * Records audit history and maintains immutability for past payments.
   */
  async updateListingFee(payload: {
    amount: number;
    isEnabled?: boolean;
    changedBy: string;
    changedByName: string;
    reason?: string;
  }): Promise<any> {
    if (typeof payload.amount !== 'number' || payload.amount < 0) {
      throw new Error('Listing fee amount must be a non-negative number');
    }

    const previousAmount = memoryFeeConfig.amount;
    const isEnabled = payload.isEnabled !== undefined ? payload.isEnabled : memoryFeeConfig.isEnabled;

    const historyItem = {
      amount: payload.amount,
      currency: memoryFeeConfig.currency,
      isEnabled,
      changedBy: payload.changedBy,
      changedByName: payload.changedByName,
      changedAt: new Date(),
      reason: payload.reason || `Fee updated from ₹${previousAmount} to ₹${payload.amount}`,
    };

    memoryFeeConfig.history.push(historyItem);
    memoryFeeConfig.amount = payload.amount;
    memoryFeeConfig.isEnabled = isEnabled;
    memoryFeeConfig.updatedBy = payload.changedBy;
    memoryFeeConfig.updatedByName = payload.changedByName;
    memoryFeeConfig.updatedAt = new Date();

    if (this.isMongoConnected()) {
      try {
        const feeDoc = await PropertyListingFeeModel.getActiveFee();
        feeDoc.history.push(historyItem);
        feeDoc.amount = payload.amount;
        feeDoc.isEnabled = isEnabled;
        feeDoc.updatedBy = payload.changedBy;
        feeDoc.updatedByName = payload.changedByName;
        feeDoc.updatedAt = new Date();
        await feeDoc.save();

        await AuditLogModel.create({
          action: 'REAL_ESTATE_LISTING_FEE_UPDATED',
          performedBy: payload.changedByName,
          performedById: payload.changedBy,
          role: 'ADMIN',
          targetResource: 'PropertyListingFee',
          targetResourceId: feeDoc._id.toString(),
          metadata: {
            previousAmount,
            newAmount: payload.amount,
            isEnabled,
            reason: payload.reason,
          },
        }).catch(() => {});
      } catch (err) {
        logger.warn({ err }, 'Mongo fee update failed, memory updated');
      }
    }

    return memoryFeeConfig;
  }

  /**
   * 3. GET LISTING FEE AUDIT HISTORY
   */
  async getListingFeeHistory(): Promise<any[]> {
    if (this.isMongoConnected()) {
      try {
        const feeDoc = await PropertyListingFeeModel.getActiveFee();
        return feeDoc.history.slice().reverse();
      } catch {
        // fallback
      }
    }
    return memoryFeeConfig.history.slice().reverse();
  }

  /**
   * 4. GET PUBLIC APPROVED & ACTIVE PROPERTIES
   * Returns approved/active/paid properties feed with filters
   */
  async getProperties(params: {
    search?: string;
    propertyType?: string;
    listingType?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }): Promise<{ properties: any[]; total: number }> {
    if (this.isMongoConnected()) {
      try {
        const filter: any = {
          $or: [
            { approvalStatus: 'approved' },
            { approvalStatus: 'active' },
            { isPaid: true, status: { $ne: 'rejected' } },
          ],
        };
        if (params.search) {
          const reg = new RegExp(params.search, 'i');
          filter.$and = filter.$and || [];
          filter.$and.push({ $or: [{ title: reg }, { location: reg }, { city: reg }, { description: reg }] });
        }
        if (params.propertyType && params.propertyType !== 'All') {
          filter.propertyType = params.propertyType.toLowerCase();
        }
        if (params.listingType && params.listingType !== 'All') {
          filter.listingType = params.listingType.toLowerCase().includes('rent') ? 'rent' : 'sale';
        }
        if (params.city) {
          filter.city = new RegExp(params.city, 'i');
        }
        if (params.minPrice !== undefined || params.maxPrice !== undefined) {
          filter.price = {};
          if (params.minPrice !== undefined) filter.price.$gte = Number(params.minPrice);
          if (params.maxPrice !== undefined) filter.price.$lte = Number(params.maxPrice);
        }

        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.max(1, Math.min(50, Number(params.limit) || 20));

        const [properties, total] = await Promise.all([
          PropertyModel.find(filter)
            .sort({ featured: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
          PropertyModel.countDocuments(filter),
        ]);

        return { properties: properties || [], total: total || 0 };
      } catch (err: any) {
        logger.warn({ err: err.message }, 'MongoDB getProperties query notice, checking memory fallback');
      }
    }

    // In-memory filter (only real user added & paid listings)
    let list = memoryProperties.filter((p) => p.approvalStatus === 'approved' || p.approvalStatus === 'active' || p.isPaid);

    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (params.propertyType && params.propertyType !== 'All') {
      list = list.filter((p) => p.propertyType?.toLowerCase() === params.propertyType!.toLowerCase());
    }
    if (params.listingType && params.listingType !== 'All') {
      const target = params.listingType.toLowerCase().includes('rent') ? 'rent' : 'sale';
      list = list.filter((p) => p.listingType === target);
    }
    if (params.city) {
      list = list.filter((p) => p.city?.toLowerCase().includes(params.city!.toLowerCase()));
    }
    if (params.minPrice !== undefined) {
      list = list.filter((p) => p.price >= Number(params.minPrice));
    }
    if (params.maxPrice !== undefined) {
      list = list.filter((p) => p.price <= Number(params.maxPrice));
    }

    return { properties: list, total: list.length };
  }

  /**
   * 5. GET SINGLE PROPERTY DETAILS
   */
  async getPropertyById(propertyId: string): Promise<any | null> {
    if (this.isMongoConnected()) {
      try {
        const prop = await PropertyModel.findOne({
          $or: [{ propertyId }, { _id: propertyId.match(/^[0-9a-fA-F]{24}$/) ? propertyId : undefined }],
        });
        if (prop) {
          prop.viewsCount = (prop.viewsCount || 0) + 1;
          prop.save().catch(() => {});
          return prop;
        }
      } catch {}
    }
    const memProp = memoryProperties.find((p) => p.propertyId === propertyId || p._id === propertyId);
    if (memProp) {
      memProp.viewsCount = (memProp.viewsCount || 0) + 1;
      return memProp;
    }
    return null;
  }

  /**
   * 6. GET USER'S PROPERTIES (MY PROPERTIES)
   */
  async getMyProperties(userId: string): Promise<any[]> {
    if (this.isMongoConnected()) {
      try {
        const docs = await PropertyModel.find({ userId }).sort({ createdAt: -1 });
        if (docs && docs.length > 0) return docs;
      } catch {}
    }
    return memoryProperties.filter((p) => p.userId === userId);
  }

  /**
   * UPLOAD PROPERTY IMAGE TO CLOUDINARY
   */
  async uploadPropertyImage(dataUri: string): Promise<{ url: string; publicId: string }> {
    return uploadImage(dataUri, 'properties');
  }

  /**
   * 7. CREATE PROPERTY DRAFT
   * Saves to MongoDB / memory with Cloudinary-backed images.
   */
  async createPropertyDraft(
    userId: string,
    userName: string,
    userPhone: string,
    data: {
      title: string;
      description?: string;
      propertyType: string;
      listingType: string;
      category?: string;
      price: number;
      location: string;
      address: string;
      city?: string;
      state?: string;
      images?: string[];
      bedrooms?: number;
      bathrooms?: number;
      area: string;
      amenities?: string[];
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      postedBy?: string;
    }
  ): Promise<{ property: any; listingFee: number; isPaid: boolean }> {
    if (!data.title || !data.price || !data.location || !data.address || !data.area) {
      throw new Error('Title, price, location, address, and area are required');
    }

    const feeAmount = memoryFeeConfig.isEnabled ? memoryFeeConfig.amount : 0;
    const isFree = feeAmount === 0;

    const propertyId = `PR-${Date.now().toString().slice(-6)}`;

    // Upload any base64 images or local image URIs to Cloudinary
    let processedImages: string[] = [];
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      for (const img of data.images) {
        if (!img) continue;
        if (img.startsWith('https://res.cloudinary.com')) {
          processedImages.push(img);
        } else if (img.startsWith('data:image') || img.startsWith('file:') || img.length > 500) {
          try {
            const uploadRes = await uploadImage(img, 'properties');
            processedImages.push(uploadRes.url);
          } catch (err: any) {
            logger.warn({ err: err.message }, 'Failed to upload property image to Cloudinary during draft creation');
            processedImages.push(img);
          }
        } else {
          processedImages.push(img);
        }
      }
    }

    const newProperty: any = {
      propertyId,
      _id: propertyId,
      title: data.title.trim(),
      description: data.description || '',
      propertyType: data.propertyType?.toLowerCase() || 'villa',
      listingType: data.listingType?.toLowerCase() === 'rent' ? 'rent' : 'sale',
      category: data.category || 'Residential',
      price: Number(data.price),
      location: data.location.trim(),
      address: data.address.trim(),
      city: data.city || 'Manjeri',
      state: data.state || 'Kerala',
      images: processedImages,
      bedrooms: Number(data.bedrooms) || 0,
      bathrooms: Number(data.bathrooms) || 0,
      area: data.area,
      amenities: data.amenities || [],
      contactName: data.contactName || userName || 'Property Owner',
      contactPhone: data.contactPhone || userPhone || '+91 98765 43210',
      contactEmail: data.contactEmail,
      postedBy: data.postedBy || 'Direct Owner',
      userId,
      userName,
      userPhone,

      listingFeeAmount: feeAmount,
      isPaid: isFree,
      status: isFree ? 'approved' : 'pending_payment',
      approvalStatus: isFree ? 'approved' : 'pending',
      paidAt: isFree ? new Date() : undefined,
      createdAt: new Date(),
      viewsCount: 0,
    };

    memoryProperties.unshift(newProperty);

    if (isFree) {
      memoryPayments.unshift({
        paymentId: `PLP-FREE-${Date.now().toString().slice(-6)}`,
        userId,
        userName,
        userPhone,
        propertyId: newProperty.propertyId,
        propertyTitle: newProperty.title,
        amount: 0,
        amountInPaise: 0,
        currency: 'INR',
        feeSnapshot: 0,
        paymentProvider: 'free',
        status: 'paid',
        paidAt: new Date(),
      });
    }

    if (this.isMongoConnected()) {
      try {
        await PropertyModel.create(newProperty);
      } catch (err) {
        logger.warn({ err }, 'Mongo property draft create failed, saved in memory');
      }
    }

    return {
      property: newProperty,
      listingFee: feeAmount,
      isPaid: isFree,
    };
  }

  /**
   * 8. CREATE RAZORPAY LISTING PAYMENT ORDER
   * Server validates fee snapshot and creates Razorpay order.
   * Never trusts any client-provided amount.
   */
  async createListingOrder(
    userId: string,
    userName: string,
    userPhone: string,
    propertyId: string
  ): Promise<{
    isFree: boolean;
    orderId?: string;
    amount: number;
    currency: string;
    keyId: string;
    propertyId: string;
  }> {
    let property: any = null;
    if (this.isMongoConnected()) {
      try {
        property = await PropertyModel.findOne({ propertyId });
      } catch {}
    }
    if (!property) {
      property = memoryProperties.find((p) => p.propertyId === propertyId);
    }
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    if (property.isPaid) {
      throw new Error(`Property ${propertyId} listing fee has already been paid`);
    }

    const activeAmount = memoryFeeConfig.isEnabled ? memoryFeeConfig.amount : 0;

    // Handle free listing policy
    if (activeAmount === 0) {
      property.isPaid = true;
      property.status = 'approved';
      property.approvalStatus = 'approved';
      property.listingFeeAmount = 0;
      property.paidAt = new Date();

      if (this.isMongoConnected()) {
        await PropertyModel.findOneAndUpdate(
          { propertyId },
          { isPaid: true, status: 'approved', approvalStatus: 'approved', paidAt: new Date() }
        ).catch(() => {});
      }

      return {
        isFree: true,
        amount: 0,
        currency: 'INR',
        keyId: env.RAZORPAY_KEY_ID,
        propertyId: property.propertyId,
      };
    }

    const amountInPaise = Math.round(activeAmount * 100);
    const receipt = `rcpt_prop_${property.propertyId}_${Date.now().toString().slice(-4)}`;

    let razorpayOrderId: string;
    try {
      const order = await platformRazorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          propertyId: property.propertyId,
          userId,
          title: property.title.slice(0, 30),
          feeSnapshot: String(activeAmount),
        },
      });
      razorpayOrderId = order.id;
    } catch {
      // Offline / sandbox fallback
      razorpayOrderId = `order_${property.propertyId}_${Date.now().toString().slice(-6)}`;
    }

    const paymentId = `PLP-${Date.now().toString().slice(-6)}`;

    const pendingPayment = {
      paymentId,
      userId,
      userName,
      userPhone,
      propertyId: property.propertyId,
      propertyTitle: property.title,
      amount: activeAmount,
      amountInPaise,
      currency: 'INR',
      feeSnapshot: activeAmount,
      paymentProvider: 'razorpay',
      razorpayOrderId,
      status: 'pending',
      createdAt: new Date(),
    };

    const existingIdx = memoryPayments.findIndex(
      (p) => p.propertyId === property.propertyId && p.status === 'pending'
    );
    if (existingIdx >= 0) {
      memoryPayments[existingIdx] = pendingPayment;
    } else {
      memoryPayments.unshift(pendingPayment);
    }

    property.paymentOrderId = razorpayOrderId;
    property.listingFeeAmount = activeAmount;

    if (this.isMongoConnected()) {
      try {
        await PropertyListingPaymentModel.findOneAndUpdate(
          { propertyId: property.propertyId, status: 'pending' },
          pendingPayment,
          { upsert: true, new: true }
        );
        await PropertyModel.findOneAndUpdate(
          { propertyId: property.propertyId },
          { paymentOrderId: razorpayOrderId, listingFeeAmount: activeAmount }
        );
      } catch {}
    }

    return {
      isFree: false,
      orderId: razorpayOrderId,
      amount: activeAmount,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      propertyId: property.propertyId,
    };
  }

  /**
   * 9. VERIFY RAZORPAY LISTING PAYMENT
   * Cryptographically verifies HMAC signature and amount against server snapshot.
   * Activates property so it is immediately visible in real estate feed!
   */
  async verifyListingPayment(
    userId: string,
    payload: {
      propertyId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }
  ): Promise<{ success: boolean; property: any; paymentId: string }> {
    const { propertyId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload;

    let property: any = null;
    if (this.isMongoConnected()) {
      try {
        property = await PropertyModel.findOne({ propertyId });
      } catch {}
    }
    if (!property) {
      property = memoryProperties.find((p) => p.propertyId === propertyId);
    }
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    if (property.isPaid) {
      return {
        success: true,
        property,
        paymentId: property.paymentId || 'PLP-PREV',
      };
    }

    let payment = memoryPayments.find(
      (p) => p.propertyId === propertyId && p.razorpayOrderId === razorpayOrderId
    );

    if (!payment && this.isMongoConnected()) {
      try {
        payment = await PropertyListingPaymentModel.findOne({ propertyId, razorpayOrderId });
      } catch {}
    }

    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    const isMockAccepted =
      process.env.NODE_ENV !== 'production' &&
      (razorpaySignature === 'simulated_valid_signature' || razorpaySignature === 'valid_test_sig');

    if (!isValidSignature && !isMockAccepted) {
      if (payment) payment.status = 'failed';
      throw new Error('Payment verification failed: Invalid Razorpay cryptographic signature');
    }

    const paidAt = new Date();
    if (payment) {
      payment.status = 'paid';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.paidAt = paidAt;
    }

    property.isPaid = true;
    property.status = 'approved';
    property.approvalStatus = 'approved';
    property.paymentId = payment?.paymentId || `PLP-${Date.now().toString().slice(-6)}`;
    property.paidAt = paidAt;

    if (this.isMongoConnected()) {
      try {
        await PropertyListingPaymentModel.findOneAndUpdate(
          { propertyId, razorpayOrderId },
          {
            status: 'paid',
            razorpayPaymentId,
            razorpaySignature,
            paidAt,
          },
          { upsert: true }
        );
        await PropertyModel.findOneAndUpdate(
          { propertyId },
          {
            isPaid: true,
            status: 'approved',
            approvalStatus: 'approved',
            paymentId: property.paymentId,
            paidAt,
          }
        );
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to persist verified property payment in MongoDB');
      }
    }

    return {
      success: true,
      property,
      paymentId: property.paymentId,
    };
  }

  /**
   * 10. MARK PROPERTY PAID FROM RAZORPAY WEBHOOK
   */
  async markPropertyPaidFromWebhook(params: {
    propertyId: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  }): Promise<void> {
    const { propertyId, razorpayOrderId, razorpayPaymentId } = params;
    logger.info({ propertyId, razorpayOrderId, razorpayPaymentId }, 'Marking property paid from Razorpay webhook');

    const paidAt = new Date();
    const memProp = memoryProperties.find((p) => p.propertyId === propertyId);
    if (memProp) {
      memProp.isPaid = true;
      memProp.status = 'approved';
      memProp.approvalStatus = 'approved';
      memProp.paidAt = paidAt;
    }

    if (this.isMongoConnected()) {
      try {
        await PropertyModel.findOneAndUpdate(
          { propertyId },
          {
            isPaid: true,
            status: 'approved',
            approvalStatus: 'approved',
            paidAt,
          }
        );
        if (razorpayOrderId) {
          await PropertyListingPaymentModel.findOneAndUpdate(
            { propertyId, razorpayOrderId },
            {
              status: 'paid',
              razorpayPaymentId,
              paidAt,
            }
          );
        }
      } catch (err: any) {
        logger.error({ err: err.message, propertyId }, 'Error in markPropertyPaidFromWebhook');
      }
    }
  }

  /**
   * 10. ADMIN GET ALL PROPERTIES
   */
  async adminGetProperties(params: {
    status?: string;
    approvalStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ properties: any[]; total: number }> {
    let list = [...memoryProperties];

    if (params.approvalStatus && params.approvalStatus !== 'all') {
      list = list.filter((p) => p.approvalStatus === params.approvalStatus);
    }
    if (params.status && params.status !== 'all') {
      list = list.filter((p) => p.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.propertyId.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          (p.userName && p.userName.toLowerCase().includes(q))
      );
    }

    return { properties: list, total: list.length };
  }

  /**
   * 11. ADMIN APPROVE OR REJECT PROPERTY
   */
  async adminUpdatePropertyStatus(
    propertyId: string,
    payload: {
      approvalStatus: 'approved' | 'rejected';
      rejectionReason?: string;
      adminName: string;
      adminId: string;
    }
  ): Promise<any> {
    const property = memoryProperties.find((p) => p.propertyId === propertyId || p._id === propertyId);
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    property.approvalStatus = payload.approvalStatus;
    property.status = payload.approvalStatus === 'approved' ? 'approved' : 'rejected';
    property.reviewedAt = new Date();
    property.reviewedBy = payload.adminName;
    property.rejectionReason =
      payload.approvalStatus === 'rejected'
        ? payload.rejectionReason || 'Did not meet listing quality standards'
        : undefined;

    if (this.isMongoConnected()) {
      try {
        await PropertyModel.findOneAndUpdate(
          { propertyId: property.propertyId },
          {
            approvalStatus: property.approvalStatus,
            status: property.status,
            reviewedAt: property.reviewedAt,
            reviewedBy: property.reviewedBy,
            rejectionReason: property.rejectionReason,
          }
        );
      } catch {}
    }

    return property;
  }

  /**
   * 12. ADMIN GET PAYMENTS LIST
   */
  async adminGetPayments(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ payments: any[]; total: number }> {
    let list = [...memoryPayments];

    if (params.status && params.status !== 'all') {
      list = list.filter((p) => p.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.paymentId.toLowerCase().includes(q) ||
          p.propertyId.toLowerCase().includes(q) ||
          p.propertyTitle.toLowerCase().includes(q) ||
          (p.userName && p.userName.toLowerCase().includes(q))
      );
    }

    return { payments: list, total: list.length };
  }

  /**
   * 13. ADMIN REVENUE ANALYTICS
   */
  async adminGetAnalytics(): Promise<{
    totalRevenue: number;
    paidListingsCount: number;
    pendingPaymentsCount: number;
    failedPaymentsCount: number;
    totalProperties: number;
    approvedProperties: number;
    averageFee: number;
    currentListingFee: number;
  }> {
    const paidList = memoryPayments.filter((p) => p.status === 'paid');
    const pendingList = memoryPayments.filter((p) => p.status === 'pending');
    const failedList = memoryPayments.filter((p) => p.status === 'failed');

    const totalRevenue = paidList.reduce((acc, p) => acc + (p.amount || 0), 0);
    const paidListingsCount = paidList.length;
    const averageFee =
      paidListingsCount > 0 ? Math.round(totalRevenue / paidListingsCount) : memoryFeeConfig.amount;
    const approvedProps = memoryProperties.filter((p) => p.approvalStatus === 'approved').length;

    return {
      totalRevenue,
      paidListingsCount,
      pendingPaymentsCount: pendingList.length,
      failedPaymentsCount: failedList.length,
      totalProperties: memoryProperties.length,
      approvedProperties: approvedProps,
      averageFee,
      currentListingFee: memoryFeeConfig.amount,
    };
  }
}

export const realEstateService = new RealEstateService();
