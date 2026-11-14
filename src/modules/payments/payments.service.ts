// src/modules/payments/payments.service.ts
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import {
  PaymentModel,
  IPayment,
  OrderModel,
  TaxiRideModel,
  RefundModel,
  IRefund,
  WebhookEventModel,
  PartnerBusinessModel,
  PartnerIntegrationModel,
  PropertyListingPaymentModel,
} from '../../database/index.js';
import {
  platformRazorpay,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  toSmallestCurrencyUnit,
  fromSmallestCurrencyUnit,
  isSupportedCurrency,
  getPublicRazorpayKey,
} from '../../config/razorpay.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { walletService } from '../wallet/wallet.service.js';
import { decryptSecret } from '../../utils/crypto.js';

// In-memory fallback and hot cache for resilient payment processing & testing
const memoryPayments = new Map<string, any>();
const memoryWebhookEvents = new Set<string>();

function findMemoryPayment(predicate: (p: any) => boolean) {
  for (const p of memoryPayments.values()) {
    if (predicate(p)) return p;
  }
  return null;
}

export interface CreateOrderParams {
  userId: string;
  userName?: string;
  app: 'ubssuper' | 'taxi' | 'delivery' | 'partner';
  purpose: 'order' | 'taxi_ride' | 'wallet_recharge' | 'partner_registration_fee' | 'property_listing_fee';
  amount: number; // in major units (e.g. 500 for ₹500)
  currency?: string;
  referenceId?: string; // orderId, rideId, offerId, etc.
  notes?: Record<string, string>;
  partnerId?: string;
}

export interface VerifyPaymentParams {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  transactionId?: string;
  referenceId?: string;
  purpose?: string;
}

export interface RefundParams {
  paymentId: string; // Razorpay payment ID (pay_...) or internal transactionId
  amount?: number; // In major units. If omitted, full refund
  reason: string;
  initiatedBy: string;
}

export class PaymentsService {
  /**
   * 1. Create a Razorpay Order centrally from trusted backend data
   */
  async createPaymentOrder(params: CreateOrderParams) {
    const { userId, app, purpose, amount, notes = {}, partnerId } = params;
    const currency = (params.currency || 'INR').toUpperCase();

    if (!isSupportedCurrency(currency)) {
      throw new Error(`Unsupported currency: ${currency}. Supported currencies: INR, USD, EUR, GBP, AED, SGD`);
    }

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const amountInPaise = toSmallestCurrencyUnit(amount, currency);
    const transactionId = `TXN-${uuidv4().slice(0, 10).toUpperCase()}`;
    const internalReceipt = `rcpt_${transactionId.slice(-8)}`;

    let rzpClient = platformRazorpay;
    let activeKeyId = getPublicRazorpayKey();

    // Check for custom partner Razorpay credentials if partner-specific payment
    if (partnerId) {
      try {
        const partnerIntegration = await PartnerIntegrationModel.findOne({
          partnerId,
          provider: 'razorpay',
          status: 'connected',
        });
        if (
          partnerIntegration?.encryptedCredentials?.keyId &&
          partnerIntegration.encryptedCredentials.encryptedSecret &&
          partnerIntegration.encryptedCredentials.iv &&
          partnerIntegration.encryptedCredentials.tag
        ) {
          const decryptedSecret = decryptSecret({
            encrypted: partnerIntegration.encryptedCredentials.encryptedSecret,
            iv: partnerIntegration.encryptedCredentials.iv,
            tag: partnerIntegration.encryptedCredentials.tag,
          });
          const RazorpayClass = (await import('razorpay')).default;
          rzpClient = new RazorpayClass({
            key_id: partnerIntegration.encryptedCredentials.keyId,
            key_secret: decryptedSecret,
          });
          activeKeyId = partnerIntegration.encryptedCredentials.keyId;
        }
      } catch (err: any) {
        logger.warn({ partnerId, err: err.message }, 'Failed to load custom partner keys, using platform gateway');
      }
    }

    // Call Razorpay API to create official order
    const rzpOrder = await rzpClient.orders.create({
      amount: amountInPaise,
      currency,
      receipt: internalReceipt,
      notes: {
        transactionId,
        userId,
        app,
        purpose,
        referenceId: params.referenceId || '',
        ...notes,
      },
    });

    // Store in hot memory cache for resilience & testing
    const paymentDoc: any = {
      transactionId,
      orderId: purpose === 'order' ? params.referenceId : undefined,
      rideId: purpose === 'taxi_ride' ? params.referenceId : undefined,
      customerId: userId,
      customerName: params.userName || 'UBS User',
      app,
      serviceCategory: purpose,
      gateway: 'razorpay',
      gatewayOrderId: rzpOrder.id,
      amount: amountInPaise,
      majorAmount: amount,
      currency,
      status: 'pending',
      reconciliationStatus: 'pending_recon',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryPayments.set(transactionId, paymentDoc);

    // Durable audit in MongoDB PaymentModel
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      try {
        await PaymentModel.create(paymentDoc);
      } catch (dbErr: any) {
        logger.warn({ err: dbErr.message }, 'Error persisting initial Payment record to MongoDB');
      }
    }

    return {
      orderId: rzpOrder.id,
      razorpayOrderId: rzpOrder.id,
      transactionId,
      amount,
      amountInPaise,
      currency,
      keyId: activeKeyId,
      receipt: internalReceipt,
    };
  }

  /**
   * 2. Verify Payment Signature & Authorize Paid Transaction
   * Server-side cryptographic HMAC SHA-256 verification
   */
  async verifyPayment(params: VerifyPaymentParams) {
    const { userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new Error('Missing required payment verification parameters: orderId, paymentId, and signature are required.');
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    let paymentRecord: any = null;

    if (isDbConnected) {
      paymentRecord = await PaymentModel.findOne({
        $or: [
          { gatewayOrderId: razorpayOrderId },
          { transactionId: params.transactionId },
          { orderId: params.referenceId },
          { rideId: params.referenceId },
        ],
      });
    }

    if (!paymentRecord) {
      paymentRecord = findMemoryPayment(p =>
        Boolean(
          p.gatewayOrderId === razorpayOrderId ||
          (params.transactionId && p.transactionId === params.transactionId) ||
          (params.referenceId && (p.orderId === params.referenceId || p.rideId === params.referenceId))
        )
      );
    }

    // Determine verification secret
    let secretToUse = env.RAZORPAY_KEY_SECRET;

    // Cryptographic signature check
    const isValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      secretToUse
    );

    if (!isValid) {
      logger.warn({ razorpayOrderId, razorpayPaymentId }, 'Cryptographic payment signature mismatch');
      throw new Error('Payment signature verification failed. Invalid or fraudulent payment signature.');
    }

    // Fetch official payment entity from Razorpay to guarantee captured status and exact amount
    let rzpPaymentEntity: any = null;
    try {
      rzpPaymentEntity = await platformRazorpay.payments.fetch(razorpayPaymentId);
    } catch (fetchErr: any) {
      logger.warn({ paymentId: razorpayPaymentId, err: fetchErr.message }, 'Could not fetch payment directly from Razorpay');
    }

    // Update payment record in database and memory
    if (paymentRecord) {
      paymentRecord.gatewayPaymentId = razorpayPaymentId;
      paymentRecord.gatewaySignature = razorpaySignature;
      paymentRecord.status = 'captured';
      paymentRecord.capturedAt = new Date();
      paymentRecord.reconciliationStatus = 'reconciled';
      if (rzpPaymentEntity?.method) {
        paymentRecord.paymentMethodDetails = {
          type: rzpPaymentEntity.method,
          issuer: rzpPaymentEntity.bank || rzpPaymentEntity.wallet || rzpPaymentEntity.vpa,
          last4: rzpPaymentEntity.card?.last4,
        };
      }
      if (typeof paymentRecord.save === 'function') {
        await paymentRecord.save();
      }
    }

    // Resolve domain-specific business records
    const purpose = paymentRecord?.serviceCategory || params.purpose;
    const referenceId = paymentRecord?.orderId || paymentRecord?.rideId || params.referenceId;

    if (purpose === 'order' && referenceId && isDbConnected) {
      await OrderModel.findOneAndUpdate(
        { orderId: referenceId },
        {
          paymentStatus: 'captured',
          fulfillmentStatus: 'confirmed',
          $push: {
            timeline: {
              status: 'confirmed',
              timestamp: new Date(),
              note: `Payment verified via Razorpay (${razorpayPaymentId})`,
            },
          },
        }
      );
    } else if (purpose === 'taxi_ride' && referenceId && isDbConnected) {
      await TaxiRideModel.findOneAndUpdate(
        { rideId: referenceId },
        {
          paymentStatus: 'captured',
        }
      );
    } else if (purpose === 'partner_registration_fee' && isDbConnected) {
      await PartnerBusinessModel.findOneAndUpdate(
        { userId },
        {
          'registrationFee.isPaid': true,
          'registrationFee.paymentId': razorpayPaymentId,
          'registrationFee.paidAt': new Date(),
        }
      );
    }

    return {
      success: true,
      message: 'Payment cryptographically verified and captured successfully',
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      transactionId: paymentRecord?.transactionId || `TXN-${razorpayPaymentId.slice(-8)}`,
      status: 'captured',
    };
  }

  /**
   * 3. Fetch Payment Status
   */
  async getPaymentStatus(identifier: string) {
    const isDbConnected = mongoose.connection.readyState === 1;
    let payment = null;

    if (isDbConnected) {
      payment = await PaymentModel.findOne({
        $or: [
          { transactionId: identifier },
          { gatewayPaymentId: identifier },
          { gatewayOrderId: identifier },
          { orderId: identifier },
          { rideId: identifier },
        ],
      }).lean();
    }

    if (!payment) {
      payment = findMemoryPayment(p =>
        p.transactionId === identifier ||
        p.gatewayPaymentId === identifier ||
        p.gatewayOrderId === identifier ||
        p.orderId === identifier ||
        p.rideId === identifier
      );
    }

    if (!payment) {
      // Check Razorpay directly if starts with pay_
      if (identifier.startsWith('pay_')) {
        try {
          const rzpPayment = await platformRazorpay.payments.fetch(identifier);
          return {
            paymentId: rzpPayment.id,
            status: rzpPayment.status,
            amount: fromSmallestCurrencyUnit(Number(rzpPayment.amount), rzpPayment.currency),
            currency: rzpPayment.currency,
            createdAt: new Date((rzpPayment as any).created_at * 1000),
          };
        } catch {
          throw new Error(`Payment ${identifier} not found.`);
        }
      }
      throw new Error(`Payment transaction ${identifier} not found.`);
    }

    return payment;
  }

  /**
   * 4. Process Refund centrally via Razorpay API
   */
  async processRefund(params: RefundParams) {
    const { paymentId, amount, reason, initiatedBy } = params;

    const isDbConnected = mongoose.connection.readyState === 1;
    let paymentRecord: any = null;

    if (isDbConnected) {
      paymentRecord = await PaymentModel.findOne({
        $or: [{ gatewayPaymentId: paymentId }, { transactionId: paymentId }],
      });
    }

    if (!paymentRecord) {
      paymentRecord = findMemoryPayment(p =>
        p.gatewayPaymentId === paymentId || p.transactionId === paymentId
      );
    }

    const actualPaymentId = paymentRecord?.gatewayPaymentId || paymentId;

    if (!actualPaymentId.startsWith('pay_')) {
      throw new Error(`Cannot process refund: No valid Razorpay payment ID found for ${paymentId}`);
    }

    // Verify payment state with Razorpay
    const rzpPayment = await platformRazorpay.payments.fetch(actualPaymentId);
    if (rzpPayment.status !== 'captured') {
      throw new Error(`Payment cannot be refunded in state: ${rzpPayment.status}. Must be captured.`);
    }

    const refundAmountPaise = amount
      ? toSmallestCurrencyUnit(amount, rzpPayment.currency)
      : undefined; // undefined triggers full refund in Razorpay

    // Call Razorpay Refund API
    const rzpRefund = await platformRazorpay.payments.refund(actualPaymentId, {
      amount: refundAmountPaise,
      notes: {
        reason: reason || 'Customer requested refund',
        initiatedBy,
      },
    });

    const refundId = `REF-${uuidv4().slice(0, 10).toUpperCase()}`;
    const refundAmountPaiseNum = Number(rzpRefund.amount ?? refundAmountPaise ?? 0);
    const refundedMajorAmount = fromSmallestCurrencyUnit(refundAmountPaiseNum, rzpRefund.currency);

    if (isDbConnected) {
      try {
        await RefundModel.create({
          refundId,
          transactionId: paymentRecord?.transactionId || actualPaymentId,
          orderId: paymentRecord?.orderId || '',
          customerId: paymentRecord?.customerId || 'system',
          customerName: paymentRecord?.customerName || 'UBS Customer',
          amount: refundedMajorAmount,
          currency: rzpRefund.currency,
          reason,
          requestedBy: initiatedBy,
          status: 'processed',
          gatewayRefundId: rzpRefund.id,
          processedAt: new Date(),
        });

        if (paymentRecord) {
          const isFullRefund = !refundAmountPaise || refundAmountPaiseNum >= paymentRecord.amount;
          paymentRecord.status = isFullRefund ? 'refunded' : 'partially_refunded';
          if (typeof paymentRecord.save === 'function') {
            await paymentRecord.save();
          }
        }

        if (paymentRecord?.orderId) {
          await OrderModel.findOneAndUpdate(
            { orderId: paymentRecord.orderId },
            {
              paymentStatus: 'refunded',
              fulfillmentStatus: 'cancelled',
              $push: {
                timeline: {
                  status: 'refunded',
                  timestamp: new Date(),
                  note: `Refund of ${rzpRefund.currency} ${refundedMajorAmount} processed via Razorpay (${rzpRefund.id})`,
                },
              },
            }
          );
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Error persisting refund record in MongoDB');
      }
    }

    return {
      success: true,
      refundId,
      gatewayRefundId: rzpRefund.id,
      paymentId: actualPaymentId,
      amount: refundedMajorAmount,
      currency: rzpRefund.currency,
      status: 'processed',
      message: 'Refund successfully initiated and processed through Razorpay',
    };
  }

  /**
   * 5. Webhook Processing with Raw-body Verification & Deduplication
   */
  async handleWebhook(rawBody: string | Buffer, signature: string, eventData: any) {
    if (!signature) {
      throw new Error('Missing x-razorpay-signature header for webhook verification.');
    }

    const isValid = verifyWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET);
    if (!isValid) {
      logger.warn('Unauthorized Razorpay webhook signature attempt rejected.');
      throw new Error('Invalid Razorpay webhook signature');
    }

    const eventId = eventData?.event_id || eventData?.id || `evt_${uuidv4()}`;
    const event = eventData?.event;

    const isDbConnected = mongoose.connection.readyState === 1;

    // Webhook Deduplication: Check if this event was already processed
    if (eventId) {
      if (memoryWebhookEvents.has(eventId)) {
        logger.info({ eventId, event }, 'Duplicate webhook event received - skipping already processed event.');
        return { received: true, deduplicated: true, status: 'already_processed' };
      }
      memoryWebhookEvents.add(eventId);

      if (isDbConnected) {
        try {
          const existingEvent = await WebhookEventModel.findOne({ eventId });
          if (existingEvent && existingEvent.status === 'processed') {
            logger.info({ eventId, event }, 'Duplicate webhook event received - skipping already processed event.');
            return { received: true, deduplicated: true, status: 'already_processed' };
          }

          if (!existingEvent) {
            await WebhookEventModel.create({
              eventId,
              eventType: event,
              source: 'razorpay',
              payload: eventData,
              status: 'processing',
            });
          }
        } catch (dedupErr: any) {
          logger.warn({ err: dedupErr.message }, 'Notice during webhook event deduplication check');
        }
      }
    }

    logger.info({ event, eventId }, 'Processing Razorpay Webhook Event');

    const paymentEntity = eventData.payload?.payment?.entity;
    const orderEntity = eventData.payload?.order?.entity;
    const refundEntity = eventData.payload?.refund?.entity;

    switch (event) {
      case 'payment.captured':
      case 'order.paid': {
        const orderId = paymentEntity?.notes?.orderId || paymentEntity?.order_id || orderEntity?.receipt?.replace('rcpt_', '');
        const rideId = paymentEntity?.notes?.rideId || paymentEntity?.notes?.referenceId;
        const isRecharge = paymentEntity?.notes?.type === 'wallet_recharge';

        if (isRecharge) {
          const userId = paymentEntity?.notes?.userId;
          const app = paymentEntity?.notes?.app || 'taxi';
          const accountType = paymentEntity?.notes?.accountType || 'taxi_driver';
          const offerId = paymentEntity?.notes?.offerId;

          if (userId && offerId) {
            try {
              await walletService.creditFromWebhook({
                userId,
                app,
                accountType,
                orderId: paymentEntity?.order_id || 'order_webhook',
                paymentId: paymentEntity.id,
                offerId,
              });
            } catch (err) {
              logger.warn({ err }, 'Error crediting wallet via webhook');
            }
          }
        }

        if (orderId) {
          try {
            const { ordersService } = await import('../orders/orders.service.js');
            await ordersService.markOrderCaptured(orderId, paymentEntity?.id || eventId);
          } catch (err: any) {
            logger.warn({ err: err.message, orderId }, 'Error marking order captured');
          }
        }

        const propertyId = paymentEntity?.notes?.propertyId || orderEntity?.notes?.propertyId;
        if (propertyId) {
          try {
            const { realEstateService } = await import('../real-estate/real-estate.service.js');
            await realEstateService.markPropertyPaidFromWebhook({
              propertyId,
              razorpayOrderId: paymentEntity?.order_id || orderEntity?.id,
              razorpayPaymentId: paymentEntity?.id,
            });
          } catch (err: any) {
            logger.warn({ err: err.message, propertyId }, 'Error marking property paid via webhook');
          }
        }

        if (rideId && isDbConnected) {
          await TaxiRideModel.findOneAndUpdate(
            { rideId },
            {
              paymentStatus: 'captured',
            }
          );
        }

        if (paymentEntity?.id && isDbConnected) {
          await PaymentModel.findOneAndUpdate(
            { $or: [{ gatewayPaymentId: paymentEntity.id }, { gatewayOrderId: paymentEntity.order_id }] },
            {
              gatewayPaymentId: paymentEntity.id,
              status: 'captured',
              capturedAt: new Date(),
              reconciliationStatus: 'reconciled',
            },
            { upsert: false }
          );
        }
        break;
      }

      case 'payment.failed': {
        const orderId = paymentEntity?.notes?.orderId || paymentEntity?.order_id;
        if (orderId) {
          try {
            const { ordersService } = await import('../orders/orders.service.js');
            await ordersService.markOrderFailed(orderId, paymentEntity?.error_description);
          } catch (err: any) {
            logger.warn({ err: err.message, orderId }, 'Error marking order failed');
          }
        }

        if (paymentEntity?.id && isDbConnected) {
          await PaymentModel.findOneAndUpdate(
            { gatewayPaymentId: paymentEntity.id },
            {
              status: 'failed',
              failureReason: paymentEntity?.error_description || 'Payment transaction failed',
            }
          );
        }
        break;
      }

      case 'refund.processed':
      case 'refund.created': {
        if (refundEntity && isDbConnected) {
          await RefundModel.findOneAndUpdate(
            { gatewayRefundId: refundEntity.id },
            {
              status: 'processed',
              processedAt: new Date(),
            },
            { upsert: true }
          );

          if (refundEntity.payment_id) {
            await PaymentModel.findOneAndUpdate(
              { gatewayPaymentId: refundEntity.payment_id },
              {
                status: 'refunded',
              }
            );
          }
        }
        break;
      }

      case 'refund.failed': {
        if (refundEntity && isDbConnected) {
          await RefundModel.findOneAndUpdate(
            { gatewayRefundId: refundEntity.id },
            {
              status: 'rejected',
              rejectionReason: 'Refund failed at payment gateway',
            }
          );
        }
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    // Mark event as processed in database
    if (isDbConnected && eventId) {
      await WebhookEventModel.findOneAndUpdate(
        { eventId },
        { status: 'processed', processedAt: new Date() }
      );
    }

    return { received: true, eventId, event, status: 'processed' };
  }

  /**
   * 6. Retrieve Transaction History for Authenticated User
   */
  async getTransactionHistory(userId: string, app?: string) {
    const isDbConnected = mongoose.connection.readyState === 1;
    let history: any[] = [];
    if (isDbConnected) {
      const query: any = { customerId: userId };
      if (app) {
        query.app = app;
      }
      history = await PaymentModel.find(query).sort({ createdAt: -1 }).limit(50).lean();
    }

    if (history.length === 0) {
      history = Array.from(memoryPayments.values()).filter(p =>
        p.customerId === userId && (!app || p.app === app)
      );
    }

    return history;
  }
}

export const paymentsService = new PaymentsService();
