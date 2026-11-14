// src/modules/payments/payments.routes.ts
import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public Webhook Endpoint (Signature verified cryptographically via HMAC-SHA256)
router.post('/webhook', (req, res) => paymentsController.handleWebhook(req, res));
router.post('/razorpay/webhook', (req, res) => paymentsController.handleWebhook(req, res));

// Public Hosted Checkout Session Page (for in-app WebBrowser checkout)
router.get('/checkout-page', (req, res) => paymentsController.renderCheckoutPage(req, res));
router.get('/razorpay/checkout-page', (req, res) => paymentsController.renderCheckoutPage(req, res));

// Authenticated Payment Operations
router.post('/create-order', authenticate, (req, res) => paymentsController.createOrder(req, res));
router.post('/razorpay/create-order', authenticate, (req, res) => paymentsController.createOrder(req, res));

router.post('/verify', authenticate, (req, res) => paymentsController.verifyPayment(req, res));
router.post('/razorpay/verify', authenticate, (req, res) => paymentsController.verifyPayment(req, res));

router.get('/status/:id', authenticate, (req, res) => paymentsController.getPaymentStatus(req, res));
router.get('/history', authenticate, (req, res) => paymentsController.getTransactionHistory(req, res));

// Refund Management
router.post('/refund', authenticate, (req, res) => paymentsController.processRefund(req, res));

export default router;
