// src/modules/payments/payments.service.ts
import { PaymentModel, OrderModel, TaxiRideModel, RefundModel } from '../../database/index.js';
import { verifyWebhookSignature } from '../../config/razorpay.js';
import { logger } from '../../utils/logger.js';
import { walletService } from '../wallet/wallet.service.js';

export class PaymentsService {
  async handleWebhook(rawBody: string | Buffer, signature: string, eventData: any) {
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      throw new Error('Invalid Razorpay webhook signature');
    }

    const event = eventData.event;
    logger.info({ event }, 'Received Razorpay Webhook Event');

    const paymentEntity = eventData.payload?.payment?.entity;
    const orderEntity = eventData.payload?.order?.entity;

    switch (event) {
      case 'payment.captured': {
        const orderId = paymentEntity?.notes?.orderId || paymentEntity?.order_id;
        const rideId = paymentEntity?.notes?.rideId;
        const isRecharge = paymentEntity?.notes?.type === 'wallet_recharge';

        if (isRecharge) {
          const userId = paymentEntity?.notes?.userId;
          const app = paymentEntity?.notes?.app || 'taxi';
          const accountType = paymentEntity?.notes?.accountType || 'taxi_driver';
          const offerId = paymentEntity?.notes?.offerId;

          if (userId && offerId) {
            try {
              await walletService.verifyRechargePayment(userId, app, accountType, {
                orderId: orderId || paymentEntity?.order_id || 'order_webhook',
                paymentId: paymentEntity.id,
                signature: 'webhook_verified',
                offerId,
              });
            } catch (err) {
              logger.warn({ err }, 'Error crediting wallet via webhook');
            }
          }
        }

        if (orderId) {
          await OrderModel.findOneAndUpdate(
            { orderId },
            {
              paymentStatus: 'captured',
              fulfillmentStatus: 'confirmed',
            }
          );
        }

        if (rideId) {
          await TaxiRideModel.findOneAndUpdate(
            { rideId },
            {
              paymentStatus: 'captured',
            }
          );
        }

        await PaymentModel.findOneAndUpdate(
          { gatewayPaymentId: paymentEntity?.id },
          {
            status: 'captured',
            capturedAt: new Date(),
          }
        );
        break;
      }

      case 'payment.failed': {
        const orderId = paymentEntity?.notes?.orderId;
        if (orderId) {
          await OrderModel.findOneAndUpdate(
            { orderId },
            {
              paymentStatus: 'failed',
            }
          );
        }
        await PaymentModel.findOneAndUpdate(
          { gatewayPaymentId: paymentEntity?.id },
          {
            status: 'failed',
            failureReason: paymentEntity?.error_description || 'Payment transaction failed',
          }
        );
        break;
      }

      case 'refund.processed': {
        const refundEntity = eventData.payload?.refund?.entity;
        if (refundEntity) {
          await RefundModel.findOneAndUpdate(
            { gatewayRefundId: refundEntity.id },
            {
              status: 'processed',
              processedAt: new Date(),
            }
          );
        }
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    return { received: true };
  }
}

export const paymentsService = new PaymentsService();
