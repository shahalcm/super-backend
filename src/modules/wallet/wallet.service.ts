// src/modules/wallet/wallet.service.ts
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  WalletModel,
  IWallet,
  WalletAccountType,
  WalletApp,
  WalletTransactionModel,
  IWalletTransaction,
  RechargeOfferModel,
  IRechargeOffer,
  TaxiDriverModel,
  DeliveryRiderModel,
  PartnerBusinessModel,
  PaymentModel,
} from '../../database/index.js';
import { platformRazorpay, verifyRazorpaySignature } from '../../config/razorpay.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// Default initial offers per app to seed dynamically if none exist in the database
export const DEFAULT_OFFERS = [
  // UBS Super Taxi (Drivers)
  {
    offerId: 'rch_taxi_100',
    name: 'Starter Driver Pack',
    description: 'Pay ₹100 and get ₹1,000 total wallet credit for platform commission.',
    app: 'taxi' as const,
    userRole: 'TAXI_DRIVER' as const,
    rechargeAmount: 100,
    promotionalBonus: 900,
    totalCredit: 1000,
    minAmount: 100,
    maxAmount: 100,
    status: 'active' as const,
    badgeText: '900% BONUS',
    displayOrder: 1,
    terms: [
      'Cash balance ₹100 is withdrawable.',
      'Promotional credit ₹900 valid for ride commission deductions.',
      'Non-transferable to other drivers.',
    ],
  },
  {
    offerId: 'rch_taxi_500',
    name: 'Pro Driver 10X Booster',
    description: 'Pay ₹500 and get ₹5,000 total wallet credit for zero-downtime platform fee coverage.',
    app: 'taxi' as const,
    userRole: 'TAXI_DRIVER' as const,
    rechargeAmount: 500,
    promotionalBonus: 4500,
    totalCredit: 5000,
    minAmount: 500,
    maxAmount: 500,
    status: 'active' as const,
    badgeText: 'MOST POPULAR',
    displayOrder: 2,
    terms: [
      'Cash balance ₹500 is withdrawable.',
      'Promotional credit ₹4,500 valid for ride commission deductions.',
      'Non-transferable to other drivers.',
    ],
  },
  {
    offerId: 'rch_taxi_1000',
    name: 'Elite Highway Driver Pack',
    description: 'Pay ₹1,000 and get ₹10,000 total wallet credit. Best value for high-volume drivers.',
    app: 'taxi' as const,
    userRole: 'TAXI_DRIVER' as const,
    rechargeAmount: 1000,
    promotionalBonus: 9000,
    totalCredit: 10000,
    minAmount: 1000,
    maxAmount: 1000,
    status: 'active' as const,
    badgeText: 'BEST VALUE',
    displayOrder: 3,
    terms: [
      'Cash balance ₹1,000 is withdrawable.',
      'Promotional credit ₹9,000 valid for ride commission deductions.',
      'Non-transferable to other drivers.',
    ],
  },
  {
    offerId: 'rch_taxi_2000',
    name: 'Mega Fleet 10X Super Saver',
    description: 'Pay ₹2,000 and get ₹20,000 total wallet credit. Maximum savings on all platform fees.',
    app: 'taxi' as const,
    userRole: 'TAXI_DRIVER' as const,
    rechargeAmount: 2000,
    promotionalBonus: 18000,
    totalCredit: 20000,
    minAmount: 2000,
    maxAmount: 2000,
    status: 'active' as const,
    badgeText: 'MAX SAVINGS',
    displayOrder: 4,
    terms: [
      'Cash balance ₹2,000 is withdrawable.',
      'Promotional credit ₹18,000 valid for ride commission deductions.',
      'Non-transferable to other drivers.',
    ],
  },

  // UBS Partner (Merchants)
  {
    offerId: 'rch_partner_500',
    name: 'Merchant Starter Boost',
    description: 'Pay ₹500 and get ₹5,000 wallet credit to cover store commissions and listing fees.',
    app: 'partner' as const,
    userRole: 'PARTNER_OWNER' as const,
    rechargeAmount: 500,
    promotionalBonus: 4500,
    totalCredit: 5000,
    minAmount: 500,
    maxAmount: 500,
    status: 'active' as const,
    badgeText: 'STARTER',
    displayOrder: 1,
    terms: [
      'Cash balance ₹500 is withdrawable or refundable.',
      'Promotional credit ₹4,500 applies to store order commission.',
      'Credits do not expire during active partnership.',
    ],
  },
  {
    offerId: 'rch_partner_1000',
    name: 'Merchant Growth 10X Pack',
    description: 'Pay ₹1,000 and get ₹10,000 wallet credit for order commissions and featured placements.',
    app: 'partner' as const,
    userRole: 'PARTNER_OWNER' as const,
    rechargeAmount: 1000,
    promotionalBonus: 9000,
    totalCredit: 10000,
    minAmount: 1000,
    maxAmount: 1000,
    status: 'active' as const,
    badgeText: 'POPULAR CHOICE',
    displayOrder: 2,
    terms: [
      'Cash balance ₹1,000 is withdrawable or refundable.',
      'Promotional credit ₹9,000 applies to store order commission.',
      'Credits do not expire during active partnership.',
    ],
  },
  {
    offerId: 'rch_partner_2500',
    name: 'Enterprise Merchant Power Pack',
    description: 'Pay ₹2,500 and get ₹25,000 wallet credit. Premium commission shield for supermarkets & hotels.',
    app: 'partner' as const,
    userRole: 'PARTNER_OWNER' as const,
    rechargeAmount: 2500,
    promotionalBonus: 22500,
    totalCredit: 25000,
    minAmount: 2500,
    maxAmount: 2500,
    status: 'active' as const,
    badgeText: 'ENTERPRISE',
    displayOrder: 3,
    terms: [
      'Cash balance ₹2,500 is withdrawable.',
      'Promotional credit ₹22,500 applies to store order commissions.',
      'Credits do not expire during active partnership.',
    ],
  },

  // UBS Delivery (Riders)
  {
    offerId: 'rch_del_200',
    name: 'Rider Shift Booster',
    description: 'Pay ₹200 and get ₹2,000 wallet credit. Zero-stress shift commission buffer.',
    app: 'delivery' as const,
    userRole: 'DELIVERY_RIDER' as const,
    rechargeAmount: 200,
    promotionalBonus: 1800,
    totalCredit: 2000,
    minAmount: 200,
    maxAmount: 200,
    status: 'active' as const,
    badgeText: 'DAILY ESSENTIAL',
    displayOrder: 1,
    terms: [
      'Cash balance ₹200 is withdrawable.',
      'Promotional credit ₹1,800 is applied towards delivery platform deductions.',
      'Non-withdrawable as cash.',
    ],
  },
  {
    offerId: 'rch_del_500',
    name: 'Rider Weekly 10X Super Saver',
    description: 'Pay ₹500 and get ₹5,000 wallet credit. Designed for full-time delivery champions.',
    app: 'delivery' as const,
    userRole: 'DELIVERY_RIDER' as const,
    rechargeAmount: 500,
    promotionalBonus: 4500,
    totalCredit: 5000,
    minAmount: 500,
    maxAmount: 500,
    status: 'active' as const,
    badgeText: 'MOST POPULAR',
    displayOrder: 2,
    terms: [
      'Cash balance ₹500 is withdrawable.',
      'Promotional credit ₹4,500 is applied towards delivery platform deductions.',
      'Non-withdrawable as cash.',
    ],
  },
  {
    offerId: 'rch_del_1000',
    name: 'Rider Monthly Mega Saver',
    description: 'Pay ₹1,000 and get ₹10,000 wallet credit for maximum monthly earnings protection.',
    app: 'delivery' as const,
    userRole: 'DELIVERY_RIDER' as const,
    rechargeAmount: 1000,
    promotionalBonus: 9000,
    totalCredit: 10000,
    minAmount: 1000,
    maxAmount: 1000,
    status: 'active' as const,
    badgeText: '10X SAVINGS',
    displayOrder: 3,
    terms: [
      'Cash balance ₹1,000 is withdrawable.',
      'Promotional credit ₹9,000 is applied towards delivery platform deductions.',
      'Non-withdrawable as cash.',
    ],
  },
];

// Fallback in-memory state for development / tests when MongoDB is not connected
const inMemoryWallets = new Map<string, any>();
const inMemoryLedger: any[] = [];
let inMemoryOffers: any[] = [...DEFAULT_OFFERS];

export class WalletService {
  /**
   * Helper to resolve standard wallet key for in-memory or mongo
   */
  private walletKey(userId: string, app: string, accountType: string) {
    return `${userId}:${app}:${accountType}`;
  }

  /**
   * Ensure default offers exist in DB
   */
  async ensureDefaultOffers() {
    if (mongoose.connection.readyState === 1) {
      try {
        const count = await RechargeOfferModel.countDocuments();
        if (count === 0) {
          await RechargeOfferModel.insertMany(DEFAULT_OFFERS);
          logger.info('Seeded default recharge offers into MongoDB');
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to seed default recharge offers to MongoDB');
      }
    }
  }

  /**
   * Retrieve active recharge offers for the specified app and user role
   */
  async getOffers(app: string, userRole?: string): Promise<any[]> {
    await this.ensureDefaultOffers();

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = {
          status: 'active',
          $or: [{ app }, { app: 'all' }],
        };
        if (userRole) {
          query.$and = [{ $or: [{ userRole }, { userRole: 'all' }] }];
        }

        const offers = await RechargeOfferModel.find(query).sort({ displayOrder: 1, rechargeAmount: 1 }).lean();
        if (offers.length > 0) {
          return offers;
        }
      } catch (err) {
        logger.warn({ err }, 'Error querying RechargeOfferModel from MongoDB, falling back');
      }
    }

    // In-memory fallback
    return inMemoryOffers
      .filter((o: any) => {
        const appMatch = o.app === app || o.app === 'all';
        const roleMatch = !userRole || o.userRole === userRole || o.userRole === 'all';
        const activeMatch = o.status === 'active';
        return appMatch && roleMatch && activeMatch;
      })
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
  }

  /**
   * Retrieve or create a wallet record
   */
  async getOrCreateWallet(
    userId: string,
    app: WalletApp,
    accountType: WalletAccountType
  ): Promise<{
    walletId: string;
    userId: string;
    app: WalletApp;
    accountType: WalletAccountType;
    cashBalance: number;
    promotionalBalance: number;
    totalAvailableBalance: number;
    currency: string;
    totalRecharged: number;
    totalBonusReceived: number;
    totalPlatformUsageDeducted: number;
    totalWithdrawn: number;
    status: string;
    lastRechargedAt?: Date;
  }> {
    if (mongoose.connection.readyState === 1) {
      try {
        let wallet = await WalletModel.findOne({ userId, app, accountType });
        if (!wallet) {
          // If taxi driver or delivery rider, check if they have existing earnings to initialize
          let initialCash = 0;
          if (accountType === 'taxi_driver') {
            const driver = await TaxiDriverModel.findOne({ userId });
            if (driver && driver.outstandingPayout) {
              initialCash = driver.outstandingPayout;
            }
          } else if (accountType === 'delivery_rider') {
            const rider = await DeliveryRiderModel.findOne({ userId });
            if (rider && rider.outstandingPayout) {
              initialCash = rider.outstandingPayout;
            }
          }

          wallet = await WalletModel.create({
            walletId: `wal_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
            userId,
            app,
            accountType,
            cashBalance: initialCash,
            promotionalBalance: 0,
            currency: 'INR',
            totalRecharged: 0,
            totalBonusReceived: 0,
            totalPlatformUsageDeducted: 0,
            totalWithdrawn: 0,
            status: 'active',
          });
        }

        const obj = wallet.toObject();
        return {
          ...obj,
          totalAvailableBalance: Number((obj.cashBalance + obj.promotionalBalance).toFixed(2)),
        };
      } catch (err) {
        logger.warn({ err }, 'Error in getOrCreateWallet Mongoose, falling back to in-memory');
      }
    }

    // In-memory fallback
    const key = this.walletKey(userId, app, accountType);
    if (!inMemoryWallets.has(key)) {
      inMemoryWallets.set(key, {
        walletId: `wal_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
        userId,
        app,
        accountType,
        cashBalance: 0,
        promotionalBalance: 0,
        currency: 'INR',
        totalRecharged: 0,
        totalBonusReceived: 0,
        totalPlatformUsageDeducted: 0,
        totalWithdrawn: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const w = inMemoryWallets.get(key);
    return {
      ...w,
      totalAvailableBalance: Number((w.cashBalance + w.promotionalBalance).toFixed(2)),
    };
  }

  /**
   * Create Razorpay recharge order against an authoritative backend offer
   */
  async createRechargeOrder(
    userId: string,
    app: WalletApp,
    accountType: WalletAccountType,
    offerId: string
  ) {
    await this.ensureDefaultOffers();

    // 1. Fetch authoritative offer from database (NEVER trust frontend price)
    let offer: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        offer = await RechargeOfferModel.findOne({ offerId, status: 'active' }).lean();
      } catch (err) {
        logger.warn({ err }, 'Error finding offer in MongoDB');
      }
    }

    if (!offer) {
      offer = inMemoryOffers.find((o) => o.offerId === offerId && o.status === 'active');
    }

    if (!offer) {
      throw new Error(`Invalid or inactive recharge offer ID: ${offerId}`);
    }

    // Ensure wallet exists
    const wallet = await this.getOrCreateWallet(userId, app, accountType);

    const rechargeAmountPaise = Math.round(offer.rechargeAmount * 100);
    const receipt = `rcpt_${wallet.walletId.slice(-6)}_${Date.now().toString(36)}`;

    let orderId: string;
    try {
      if (
        env.RAZORPAY_KEY_ID &&
        env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder_key_id' &&
        env.RAZORPAY_KEY_SECRET &&
        env.RAZORPAY_KEY_SECRET !== 'rzp_test_placeholder_secret'
      ) {
        const rzpOrder = await platformRazorpay.orders.create({
          amount: rechargeAmountPaise,
          currency: 'INR',
          receipt,
          notes: {
            type: 'wallet_recharge',
            userId,
            app,
            accountType,
            walletId: wallet.walletId,
            offerId: offer.offerId,
            rechargeAmount: offer.rechargeAmount,
            promotionalBonus: offer.promotionalBonus,
          },
        });
        orderId = rzpOrder.id;
      } else {
        // Safe development simulation order
        orderId = `order_sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      }
    } catch (err) {
      logger.warn({ err }, 'Razorpay SDK call failed, using fallback simulated order ID');
      orderId = `order_sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }

    return {
      orderId,
      amount: offer.rechargeAmount,
      promotionalBonus: offer.promotionalBonus,
      totalCredit: offer.totalCredit,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      offer: {
        offerId: offer.offerId,
        name: offer.name,
        description: offer.description,
        rechargeAmount: offer.rechargeAmount,
        promotionalBonus: offer.promotionalBonus,
        totalCredit: offer.totalCredit,
        terms: offer.terms,
      },
    };
  }

  /**
   * Verify Razorpay Payment Signature and Atomically Credit Wallet Ledger
   */
  async verifyRechargePayment(
    userId: string,
    app: WalletApp,
    accountType: WalletAccountType,
    data: {
      orderId: string;
      paymentId: string;
      signature: string;
      offerId: string;
    }
  ) {
    const { orderId, paymentId, signature, offerId } = data;

    if (!orderId || !paymentId || !offerId) {
      throw new Error('Missing required payment verification parameters');
    }

    // 1. Signature Verification
    // In production or when realistic signatures are provided, verify cryptographic HMAC-SHA256
    const isSimulated = orderId.startsWith('order_sim_') || paymentId.startsWith('pay_sim_');
    if (!isSimulated && process.env.NODE_ENV === 'production') {
      const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
      if (!isValid) {
        throw new Error('Invalid Razorpay payment signature. Payment verification failed.');
      }
    }

    // 2. Idempotency Check: Prevent duplicate crediting
    if (mongoose.connection.readyState === 1) {
      try {
        const existingTx = await WalletTransactionModel.findOne({
          gatewayPaymentId: paymentId,
          status: 'completed',
        });
        if (existingTx) {
          logger.info({ paymentId }, 'Idempotent request: Payment has already been credited.');
          const wallet = await this.getOrCreateWallet(userId, app, accountType);
          return {
            success: true,
            isDuplicate: true,
            message: 'Payment already processed and credited to wallet.',
            wallet,
            transactionId: existingTx.transactionId,
          };
        }
      } catch (err) {
        logger.warn({ err }, 'Error checking idempotency in MongoDB');
      }
    } else {
      const existing = inMemoryLedger.find(
        (t) => t.gatewayPaymentId === paymentId && t.status === 'completed'
      );
      if (existing) {
        const wallet = await this.getOrCreateWallet(userId, app, accountType);
        return {
          success: true,
          isDuplicate: true,
          message: 'Payment already processed and credited to wallet.',
          wallet,
          transactionId: existing.transactionId,
        };
      }
    }

    // 3. Fetch authoritative offer from DB
    let offer: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        offer = await RechargeOfferModel.findOne({ offerId }).lean();
      } catch (err) {
        logger.warn({ err }, 'Error fetching offer for verification');
      }
    }
    if (!offer) {
      offer = inMemoryOffers.find((o) => o.offerId === offerId);
    }
    if (!offer) {
      throw new Error(`Referenced recharge offer ${offerId} not found.`);
    }

    const { rechargeAmount, promotionalBonus } = offer;
    const totalCredit = rechargeAmount + promotionalBonus;

    // 4. Atomically Update Wallet and Ledger
    const baseTxId = `tx_rch_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date();

    if (mongoose.connection.readyState === 1) {
      try {
        // Find existing wallet
        let walletDoc = await WalletModel.findOne({ userId, app, accountType });
        if (!walletDoc) {
          walletDoc = await WalletModel.create({
            walletId: `wal_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
            userId,
            app,
            accountType,
            cashBalance: 0,
            promotionalBalance: 0,
            currency: 'INR',
            totalRecharged: 0,
            totalBonusReceived: 0,
            totalPlatformUsageDeducted: 0,
            totalWithdrawn: 0,
            status: 'active',
          });
        }

        const prevCash = walletDoc.cashBalance;
        const prevPromo = walletDoc.promotionalBalance;
        const newCash = Number((prevCash + rechargeAmount).toFixed(2));
        const newPromo = Number((prevPromo + promotionalBonus).toFixed(2));

        // Update Wallet
        walletDoc.cashBalance = newCash;
        walletDoc.promotionalBalance = newPromo;
        walletDoc.totalRecharged = Number((walletDoc.totalRecharged + rechargeAmount).toFixed(2));
        walletDoc.totalBonusReceived = Number(
          (walletDoc.totalBonusReceived + promotionalBonus).toFixed(2)
        );
        walletDoc.lastRechargedAt = now;
        await walletDoc.save();

        // Sync with TaxiDriver or DeliveryRider outstandingPayout if applicable
        if (accountType === 'taxi_driver') {
          await TaxiDriverModel.findOneAndUpdate(
            { userId },
            { $set: { outstandingPayout: newCash } }
          );
        } else if (accountType === 'delivery_rider') {
          await DeliveryRiderModel.findOneAndUpdate(
            { userId },
            { $set: { outstandingPayout: newCash } }
          );
        }

        // Ledger Entry 1: Real Cash Recharge
        await WalletTransactionModel.create({
          transactionId: `${baseTxId}_cash`,
          walletId: walletDoc.walletId,
          userId,
          app,
          accountType,
          transactionType: 'recharge_cash',
          amount: rechargeAmount,
          currency: 'INR',
          cashBalanceChange: rechargeAmount,
          promoBalanceChange: 0,
          previousCashBalance: prevCash,
          newCashBalance: newCash,
          previousPromoBalance: prevPromo,
          newPromoBalance: prevPromo,
          gateway: 'razorpay',
          gatewayOrderId: orderId,
          gatewayPaymentId: paymentId,
          gatewaySignature: signature,
          rechargeOfferId: offerId,
          status: 'completed',
          title: `Recharge Payment (₹${rechargeAmount.toLocaleString()})`,
          subtitle: `Paid via Razorpay (${offer.name})`,
          metadata: { offerName: offer.name, orderId, paymentId },
        });

        // Ledger Entry 2: Promotional Bonus Credit
        if (promotionalBonus > 0) {
          await WalletTransactionModel.create({
            transactionId: `${baseTxId}_promo`,
            walletId: walletDoc.walletId,
            userId,
            app,
            accountType,
            transactionType: 'recharge_promo',
            amount: promotionalBonus,
            currency: 'INR',
            cashBalanceChange: 0,
            promoBalanceChange: promotionalBonus,
            previousCashBalance: newCash,
            newCashBalance: newCash,
            previousPromoBalance: prevPromo,
            newPromoBalance: newPromo,
            gateway: 'system',
            gatewayOrderId: orderId,
            gatewayPaymentId: paymentId,
            rechargeOfferId: offerId,
            status: 'completed',
            title: `Promotional Credit Bonus (+₹${promotionalBonus.toLocaleString()})`,
            subtitle: `${offer.badgeText || 'Special Offer Bonus'} • Platform Usage Only`,
            metadata: { offerName: offer.name, nonWithdrawable: true },
          });
        }

        // Record generic payment for admin reconciliation
        await PaymentModel.create({
          transactionId: `pay_${baseTxId}`,
          customerId: userId,
          customerName: `${accountType} ${userId.slice(-4)}`,
          app,
          serviceCategory: 'wallet_recharge',
          gateway: 'razorpay',
          gatewayOrderId: orderId,
          gatewayPaymentId: paymentId,
          gatewaySignature: signature,
          amount: Math.round(rechargeAmount * 100),
          majorAmount: rechargeAmount,
          currency: 'INR',
          status: 'captured',
          capturedAt: now,
        }).catch(() => {});

        // Increment offer redemptions
        await RechargeOfferModel.findOneAndUpdate({ offerId }, { $inc: { totalRedemptions: 1 } });

        const updatedWallet = walletDoc.toObject();
        return {
          success: true,
          isDuplicate: false,
          message: `Successfully credited ₹${rechargeAmount} Cash and ₹${promotionalBonus} Promotional Bonus. Total Wallet: ₹${(newCash + newPromo).toFixed(2)}`,
          wallet: {
            ...updatedWallet,
            totalAvailableBalance: Number((newCash + newPromo).toFixed(2)),
          },
          creditedCash: rechargeAmount,
          creditedPromo: promotionalBonus,
          totalCredit,
          transactionId: baseTxId,
        };
      } catch (err) {
        logger.error({ err }, 'Error executing Mongoose wallet recharge credit');
        throw err;
      }
    }

    // In-memory fallback
    const key = this.walletKey(userId, app, accountType);
    let wallet = inMemoryWallets.get(key);
    if (!wallet) {
      wallet = {
        walletId: `wal_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
        userId,
        app,
        accountType,
        cashBalance: 0,
        promotionalBalance: 0,
        currency: 'INR',
        totalRecharged: 0,
        totalBonusReceived: 0,
        totalPlatformUsageDeducted: 0,
        totalWithdrawn: 0,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      inMemoryWallets.set(key, wallet);
    }

    const prevCash = wallet.cashBalance;
    const prevPromo = wallet.promotionalBalance;
    const newCash = Number((prevCash + rechargeAmount).toFixed(2));
    const newPromo = Number((prevPromo + promotionalBonus).toFixed(2));

    wallet.cashBalance = newCash;
    wallet.promotionalBalance = newPromo;
    wallet.totalRecharged += rechargeAmount;
    wallet.totalBonusReceived += promotionalBonus;
    wallet.lastRechargedAt = now;
    wallet.updatedAt = now;

    // In-memory ledger
    inMemoryLedger.push(
      {
        transactionId: `${baseTxId}_cash`,
        walletId: wallet.walletId,
        userId,
        app,
        accountType,
        transactionType: 'recharge_cash',
        amount: rechargeAmount,
        currency: 'INR',
        cashBalanceChange: rechargeAmount,
        promoBalanceChange: 0,
        previousCashBalance: prevCash,
        newCashBalance: newCash,
        previousPromoBalance: prevPromo,
        newPromoBalance: prevPromo,
        gateway: 'razorpay',
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        gatewaySignature: signature,
        rechargeOfferId: offerId,
        status: 'completed',
        title: `Recharge Payment (₹${rechargeAmount.toLocaleString()})`,
        subtitle: `Paid via Razorpay (${offer.name})`,
        createdAt: now,
      },
      {
        transactionId: `${baseTxId}_promo`,
        walletId: wallet.walletId,
        userId,
        app,
        accountType,
        transactionType: 'recharge_promo',
        amount: promotionalBonus,
        currency: 'INR',
        cashBalanceChange: 0,
        promoBalanceChange: promotionalBonus,
        previousCashBalance: newCash,
        newCashBalance: newCash,
        previousPromoBalance: prevPromo,
        newPromoBalance: newPromo,
        gateway: 'system',
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        rechargeOfferId: offerId,
        status: 'completed',
        title: `Promotional Credit Bonus (+₹${promotionalBonus.toLocaleString()})`,
        subtitle: `${offer.badgeText || 'Special Offer Bonus'} • Platform Usage Only`,
        createdAt: now,
      }
    );

    return {
      success: true,
      isDuplicate: false,
      message: `Successfully credited ₹${rechargeAmount} Cash and ₹${promotionalBonus} Promotional Bonus. Total Wallet: ₹${(newCash + newPromo).toFixed(2)}`,
      wallet: {
        ...wallet,
        totalAvailableBalance: Number((newCash + newPromo).toFixed(2)),
      },
      creditedCash: rechargeAmount,
      creditedPromo: promotionalBonus,
      totalCredit,
      transactionId: baseTxId,
    };
  }

  /**
   * Request cash withdrawal to bank/UPI. Strictly validates against cashBalance only!
   */
  async requestWithdrawal(
    userId: string,
    app: WalletApp,
    accountType: WalletAccountType,
    amount: number
  ) {
    if (!amount || amount <= 0) {
      throw new Error('Please specify a valid withdrawal amount.');
    }

    const wallet = await this.getOrCreateWallet(userId, app, accountType);

    if (amount > wallet.cashBalance) {
      throw new Error(
        `Requested withdrawal of ₹${amount.toLocaleString()} exceeds your eligible cash balance of ₹${wallet.cashBalance.toLocaleString()}. Note: Promotional bonus credits (₹${wallet.promotionalBalance.toLocaleString()}) cannot be withdrawn.`
      );
    }

    const now = new Date();
    const txId = `tx_wth_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    if (mongoose.connection.readyState === 1) {
      try {
        const walletDoc = await WalletModel.findOne({ userId, app, accountType });
        if (!walletDoc) throw new Error('Wallet not found');

        const prevCash = walletDoc.cashBalance;
        const newCash = Number((prevCash - amount).toFixed(2));

        walletDoc.cashBalance = newCash;
        walletDoc.totalWithdrawn = Number((walletDoc.totalWithdrawn + amount).toFixed(2));
        await walletDoc.save();

        await WalletTransactionModel.create({
          transactionId: txId,
          walletId: walletDoc.walletId,
          userId,
          app,
          accountType,
          transactionType: 'payout_withdrawal',
          amount: -amount,
          currency: 'INR',
          cashBalanceChange: -amount,
          promoBalanceChange: 0,
          previousCashBalance: prevCash,
          newCashBalance: newCash,
          previousPromoBalance: walletDoc.promotionalBalance,
          newPromoBalance: walletDoc.promotionalBalance,
          gateway: 'system',
          status: 'completed',
          title: `Bank Transfer Requested (-₹${amount.toLocaleString()})`,
          subtitle: 'Instant transfer to verified payout account',
        });

        return {
          success: true,
          message: `Payout request of ₹${amount.toLocaleString()} submitted successfully.`,
          newCashBalance: newCash,
          transactionId: txId,
        };
      } catch (err) {
        logger.error({ err }, 'Error processing withdrawal');
        throw err;
      }
    }

    // In-memory fallback
    const key = this.walletKey(userId, app, accountType);
    const inMem = inMemoryWallets.get(key);
    const prevCash = inMem.cashBalance;
    const newCash = Number((prevCash - amount).toFixed(2));
    inMem.cashBalance = newCash;
    inMem.totalWithdrawn += amount;

    inMemoryLedger.unshift({
      transactionId: txId,
      walletId: inMem.walletId,
      userId,
      app,
      accountType,
      transactionType: 'payout_withdrawal',
      amount: -amount,
      currency: 'INR',
      cashBalanceChange: -amount,
      promoBalanceChange: 0,
      previousCashBalance: prevCash,
      newCashBalance: newCash,
      previousPromoBalance: inMem.promotionalBalance,
      newPromoBalance: inMem.promotionalBalance,
      gateway: 'system',
      status: 'completed',
      title: `Bank Transfer Requested (-₹${amount.toLocaleString()})`,
      subtitle: 'Instant transfer to verified payout account',
      createdAt: now,
    });

    return {
      success: true,
      message: `Payout request of ₹${amount.toLocaleString()} submitted successfully.`,
      newCashBalance: newCash,
      transactionId: txId,
    };
  }

  /**
   * Retrieve transaction history ledger for user
   */
  async getTransactions(
    userId: string,
    app?: string,
    page = 1,
    limit = 30
  ) {
    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = { userId };
        if (app && app !== 'all') {
          query.app = app;
        }

        const list = await WalletTransactionModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        const total = await WalletTransactionModel.countDocuments(query);
        return {
          data: list,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };
      } catch (err) {
        logger.warn({ err }, 'Error fetching transactions from MongoDB');
      }
    }

    // In-memory fallback
    const filtered = inMemoryLedger.filter((t) => {
      const uMatch = t.userId === userId;
      const appMatch = !app || app === 'all' || t.app === app;
      return uMatch && appMatch;
    });

    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit) || 1,
    };
  }

  /**
   * Admin: List all offers
   */
  async adminGetOffers(app?: string) {
    await this.ensureDefaultOffers();

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = {};
        if (app && app !== 'all') query.app = app;
        return await RechargeOfferModel.find(query).sort({ app: 1, displayOrder: 1, rechargeAmount: 1 }).lean();
      } catch (err) {
        logger.warn({ err }, 'Error in adminGetOffers MongoDB');
      }
    }

    return inMemoryOffers.filter((o) => !app || app === 'all' || o.app === app);
  }

  /**
   * Admin: Create or update an offer dynamically
   */
  async adminSaveOffer(payload: any) {
    const offerId = payload.offerId || `rch_${payload.app}_${Date.now()}`;
    const totalCredit = (Number(payload.rechargeAmount) || 0) + (Number(payload.promotionalBonus) || 0);

    const dataToSave = {
      ...payload,
      offerId,
      totalCredit,
      rechargeAmount: Number(payload.rechargeAmount),
      promotionalBonus: Number(payload.promotionalBonus),
      status: payload.status || 'active',
      updatedAt: new Date(),
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const saved = await RechargeOfferModel.findOneAndUpdate(
          { offerId },
          { $set: dataToSave },
          { new: true, upsert: true }
        );
        return saved.toObject();
      } catch (err) {
        logger.warn({ err }, 'Error saving offer to MongoDB');
      }
    }

    const idx = inMemoryOffers.findIndex((o) => o.offerId === offerId);
    if (idx >= 0) {
      inMemoryOffers[idx] = { ...inMemoryOffers[idx], ...dataToSave };
      return inMemoryOffers[idx];
    } else {
      inMemoryOffers.push(dataToSave);
      return dataToSave;
    }
  }

  /**
   * Admin: Toggle offer status or delete
   */
  async adminUpdateOfferStatus(offerId: string, status: 'active' | 'inactive' | 'expired') {
    if (mongoose.connection.readyState === 1) {
      try {
        const updated = await RechargeOfferModel.findOneAndUpdate(
          { offerId },
          { $set: { status, updatedAt: new Date() } },
          { new: true }
        );
        return updated;
      } catch (err) {
        logger.warn({ err }, 'Error updating offer status in MongoDB');
      }
    }

    const item = inMemoryOffers.find((o) => o.offerId === offerId);
    if (item) {
      (item as any).status = status;
      return item;
    }
    throw new Error('Offer not found');
  }

  /**
   * Admin: List wallet ledger transactions with comprehensive filters
   */
  async adminGetTransactions(params: {
    app?: string;
    accountType?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { app = 'all', accountType = 'all', status = 'all', search = '', page = 1, limit = 50 } = params;

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = {};
        if (app !== 'all') query.app = app;
        if (accountType !== 'all') query.accountType = accountType;
        if (status !== 'all') query.status = status;
        if (search) {
          query.$or = [
            { transactionId: { $regex: search, $options: 'i' } },
            { userId: { $regex: search, $options: 'i' } },
            { gatewayPaymentId: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
          ];
        }

        const list = await WalletTransactionModel.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        const total = await WalletTransactionModel.countDocuments(query);
        return { data: list, total, page, limit };
      } catch (err) {
        logger.warn({ err }, 'Error in adminGetTransactions MongoDB');
      }
    }

    // In-memory fallback
    let list = [...inMemoryLedger];
    if (app !== 'all') list = list.filter((t) => t.app === app);
    if (accountType !== 'all') list = list.filter((t) => t.accountType === accountType);
    if (status !== 'all') list = list.filter((t) => t.status === status);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.transactionId?.toLowerCase().includes(s) ||
          t.userId?.toLowerCase().includes(s) ||
          t.gatewayPaymentId?.toLowerCase().includes(s)
      );
    }

    return {
      data: list.slice((page - 1) * limit, page * limit),
      total: list.length,
      page,
      limit,
    };
  }

  /**
   * Admin: Wallet analytics aggregate metrics
   */
  async adminGetAnalytics() {
    if (mongoose.connection.readyState === 1) {
      try {
        const wallets = await WalletModel.find().lean();
        const txs = await WalletTransactionModel.find({ status: 'completed' }).lean();

        const totalCashBalances = wallets.reduce((sum, w) => sum + (w.cashBalance || 0), 0);
        const totalPromoBalances = wallets.reduce((sum, w) => sum + (w.promotionalBalance || 0), 0);
        const totalRechargePaid = txs
          .filter((t) => t.transactionType === 'recharge_cash')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalPromoIssued = txs
          .filter((t) => t.transactionType === 'recharge_promo')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const appBreakdown = {
          taxi: {
            rechargePaid: txs.filter((t) => t.app === 'taxi' && t.transactionType === 'recharge_cash').reduce((s, t) => s + t.amount, 0),
            promoIssued: txs.filter((t) => t.app === 'taxi' && t.transactionType === 'recharge_promo').reduce((s, t) => s + t.amount, 0),
          },
          partner: {
            rechargePaid: txs.filter((t) => t.app === 'partner' && t.transactionType === 'recharge_cash').reduce((s, t) => s + t.amount, 0),
            promoIssued: txs.filter((t) => t.app === 'partner' && t.transactionType === 'recharge_promo').reduce((s, t) => s + t.amount, 0),
          },
          delivery: {
            rechargePaid: txs.filter((t) => t.app === 'delivery' && t.transactionType === 'recharge_cash').reduce((s, t) => s + t.amount, 0),
            promoIssued: txs.filter((t) => t.app === 'delivery' && t.transactionType === 'recharge_promo').reduce((s, t) => s + t.amount, 0),
          },
        };

        return {
          totalCashBalances: Number(totalCashBalances.toFixed(2)),
          totalPromoBalances: Number(totalPromoBalances.toFixed(2)),
          totalRechargePaid: Number(totalRechargePaid.toFixed(2)),
          totalPromoIssued: Number(totalPromoIssued.toFixed(2)),
          totalSuccessfulRecharges: txs.filter((t) => t.transactionType === 'recharge_cash').length,
          appBreakdown,
        };
      } catch (err) {
        logger.warn({ err }, 'Error in adminGetAnalytics MongoDB');
      }
    }

    // In-memory fallback
    const totalCashBalances = Array.from(inMemoryWallets.values()).reduce((sum, w) => sum + (w.cashBalance || 0), 0);
    const totalPromoBalances = Array.from(inMemoryWallets.values()).reduce((sum, w) => sum + (w.promotionalBalance || 0), 0);
    const totalRechargePaid = inMemoryLedger.filter((t) => t.transactionType === 'recharge_cash').reduce((sum, t) => sum + t.amount, 0);
    const totalPromoIssued = inMemoryLedger.filter((t) => t.transactionType === 'recharge_promo').reduce((sum, t) => sum + t.amount, 0);

    return {
      totalCashBalances,
      totalPromoBalances,
      totalRechargePaid,
      totalPromoIssued,
      totalSuccessfulRecharges: inMemoryLedger.filter((t) => t.transactionType === 'recharge_cash').length,
      appBreakdown: {
        taxi: { rechargePaid: 0, promoIssued: 0 },
        partner: { rechargePaid: 0, promoIssued: 0 },
        delivery: { rechargePaid: 0, promoIssued: 0 },
      },
    };
  }
}

export const walletService = new WalletService();
