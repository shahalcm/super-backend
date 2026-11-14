// src/modules/payments/payments.controller.ts
import { Request, Response } from 'express';
import { paymentsService } from './payments.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { env } from '../../config/env.js';

export class PaymentsController {
  /**
   * POST /api/v1/payments/create-order
   */
  async createOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required to create payment order', 401);
      }

      const { app, purpose, amount, currency, referenceId, notes, partnerId } = req.body;
      const result = await paymentsService.createPaymentOrder({
        userId,
        userName: (req.user as any)?.name || 'UBS User',
        app: app || 'ubssuper',
        purpose: purpose || 'order',
        amount: Number(amount),
        currency: currency || 'INR',
        referenceId,
        notes,
        partnerId,
      });

      return sendSuccess(res, result, 'Razorpay payment order created successfully', 201);
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  /**
   * POST /api/v1/payments/verify
   */
  async verifyPayment(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required to verify payment', 401);
      }

      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, transactionId, referenceId, purpose } = req.body;
      const result = await paymentsService.verifyPayment({
        userId,
        razorpayOrderId: razorpayOrderId || req.body.orderId || req.body.razorpay_order_id,
        razorpayPaymentId: razorpayPaymentId || req.body.paymentId || req.body.razorpay_payment_id,
        razorpaySignature: razorpaySignature || req.body.signature || req.body.razorpay_signature,
        transactionId,
        referenceId,
        purpose,
      });

      return sendSuccess(res, result, 'Payment verified and captured successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  /**
   * GET /api/v1/payments/status/:id
   */
  async getPaymentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await paymentsService.getPaymentStatus(id);
      return sendSuccess(res, result, 'Payment status retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  /**
   * POST /api/v1/payments/refund
   */
  async processRefund(req: Request, res: Response) {
    try {
      const userId = req.user?.userId || 'admin';
      const { paymentId, amount, reason } = req.body;

      if (!paymentId) {
        return sendError(res, 'paymentId is required for refund processing', 400);
      }

      const result = await paymentsService.processRefund({
        paymentId,
        amount: amount ? Number(amount) : undefined,
        reason: reason || 'Customer refund requested',
        initiatedBy: userId,
      });

      return sendSuccess(res, result, 'Refund processed successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  /**
   * GET /api/v1/payments/history
   */
  async getTransactionHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return sendError(res, 'Authentication required', 401);
      }
      const app = req.query.app as string | undefined;
      const result = await paymentsService.getTransactionHistory(userId, app);
      return sendSuccess(res, result, 'Transaction history retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  /**
   * POST /api/v1/payments/webhook
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const signature = (req.headers['x-razorpay-signature'] as string) || '';
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const result = await paymentsService.handleWebhook(rawBody, signature, req.body);
      return sendSuccess(res, result, 'Webhook processed successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  /**
   * GET /api/v1/payments/checkout-page
   * Serves an interactive Razorpay checkout page for web and mobile WebBrowser auth sessions
   */
  async renderCheckoutPage(req: Request, res: Response) {
    const {
      keyId,
      orderId,
      amount,
      amountInPaise,
      currency,
      name,
      description,
      redirectUrl,
      prefillName,
      prefillEmail,
      prefillContact,
    } = req.query;

    const key = (keyId as string) || env.RAZORPAY_KEY_ID;
    const finalAmountInPaise = amountInPaise
      ? Number(amountInPaise)
      : Math.round(Number(amount || 0) * 100);
    const finalCurrency = (currency as string) || 'INR';
    const finalName = (name as string) || 'UBS Super Ecosystem';
    const finalDesc = (description as string) || 'Secure Order Payment';
    const finalRedirect = (redirectUrl as string) || 'ubssuper://payment-complete';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Razorpay Secure Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0F172A;
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      text-align: center;
    }
    .card {
      background: #1E293B;
      padding: 28px 24px;
      border-radius: 20px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 1px solid #334155;
      box-sizing: border-box;
    }
    .badge {
      display: inline-block;
      background: rgba(22, 163, 74, 0.15);
      color: #4ADE80;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 14px;
      border: 1px solid rgba(74, 222, 128, 0.3);
    }
    h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; }
    p { color: #94A3B8; font-size: 13px; margin: 0 0 18px; }
    .amount { font-size: 32px; font-weight: 800; color: #4ADE80; margin-bottom: 22px; }
    .btn {
      display: block;
      width: 100%;
      background: #16A34A;
      color: white;
      border: none;
      padding: 14px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      box-sizing: border-box;
      transition: background 0.2s;
    }
    .btn:hover { background: #15803D; }
    .footer { font-size: 11px; color: #64748B; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🔒 256-Bit SSL Bank Encryption</div>
    <h2>${finalName}</h2>
    <p>${finalDesc}</p>
    <div class="amount">₹${(finalAmountInPaise / 100).toFixed(2)}</div>
    <button id="rzp-btn" class="btn">Proceed to Pay via Razorpay</button>
    <div class="footer">Order #${orderId || 'Direct'} • Powered by Razorpay</div>
  </div>

  <script>
    var options = {
      key: "${key}",
      amount: ${finalAmountInPaise},
      currency: "${finalCurrency}",
      name: "${finalName}",
      description: "${finalDesc}",
      order_id: "${orderId || ''}",
      prefill: {
        name: "${prefillName || ''}",
        email: "${prefillEmail || ''}",
        contact: "${prefillContact || ''}"
      },
      theme: { color: "#16A34A" },
      handler: function(response) {
        var sep = "${finalRedirect}".indexOf('?') >= 0 ? '&' : '?';
        window.location.href = "${finalRedirect}" + sep + 
          "razorpay_payment_id=" + encodeURIComponent(response.razorpay_payment_id) +
          "&razorpay_order_id=" + encodeURIComponent(response.razorpay_order_id || "${orderId || ''}") +
          "&razorpay_signature=" + encodeURIComponent(response.razorpay_signature);
      },
      modal: {
        ondismiss: function() {
          var sep = "${finalRedirect}".indexOf('?') >= 0 ? '&' : '?';
          window.location.href = "${finalRedirect}" + sep + "status=cancelled";
        }
      }
    };
    var rzp = new Razorpay(options);
    document.getElementById('rzp-btn').onclick = function(e){
      rzp.open();
      e.preventDefault();
    };
    window.onload = function() {
      setTimeout(function() { rzp.open(); }, 400);
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }
}

export const paymentsController = new PaymentsController();
