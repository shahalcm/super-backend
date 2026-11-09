// src/modules/partners/partners.routes.ts
import { Router } from 'express';
import { partnersController } from './partners.controller.js';
import { walletController } from '../wallet/wallet.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public Catalog Browsing (Guest access allowed)
router.get('/grocery/products', (req, res) => partnersController.getGroceryProducts(req, res));
router.get('/grocery/products/:id', (req, res) => partnersController.getGroceryProductById(req, res));

// Authenticated Partner Routes
router.use(authenticate);

// Registration & Profile
router.get('/registrations', (req, res) => partnersController.getRegistration(req, res));
router.get('/registrations/me', (req, res) => partnersController.getRegistration(req, res));
router.post('/registrations/me', (req, res) => partnersController.updateRegistration(req, res));
router.patch('/registrations/me', (req, res) => partnersController.updateRegistration(req, res));
router.put('/registrations/me', (req, res) => partnersController.updateRegistration(req, res));
router.post('/registrations/submit', (req, res) => partnersController.submitRegistration(req, res));

// Onboarding Fee Payments
router.post('/payments/create-order', (req, res) => partnersController.createFeeOrder(req, res));
router.post('/payments/verify', (req, res) => partnersController.verifyFeePayment(req, res));

// Dashboard
router.get('/dashboard/summary', (req, res) => partnersController.getDashboardSummary(req, res));

// Grocery Management (Partner SKU modifications)
router.post('/grocery/products', (req, res) => partnersController.createGroceryProduct(req, res));
router.put('/grocery/products/:id', (req, res) => partnersController.updateGroceryProduct(req, res));
router.patch('/grocery/products/:id', (req, res) => partnersController.updateGroceryProduct(req, res));
router.delete('/grocery/products/:id', (req, res) => partnersController.deleteGroceryProduct(req, res));

router.get('/grocery/orders', (req, res) => partnersController.getPartnerOrders(req, res));
router.patch('/grocery/orders/:id/status', (req, res) => partnersController.updateOrderStatus(req, res));

// Integrations (AES-256-GCM Vault)
router.get('/integrations/razorpay', (req, res) => partnersController.getRazorpayIntegration(req, res));
router.post('/integrations/razorpay', (req, res) => partnersController.saveRazorpayIntegration(req, res));

// Store Images & Branding Management
router.get('/store/branding', (req, res) => partnersController.getStoreBranding(req, res));
router.put('/store/branding', (req, res) => partnersController.updateStoreBranding(req, res));
router.patch('/store/branding', (req, res) => partnersController.updateStoreBranding(req, res));
router.post('/store/upload-image', (req, res) => partnersController.uploadStoreImage(req, res));
router.delete('/store/gallery-image', (req, res) => partnersController.deleteGalleryImage(req, res));

// Partner Wallet & Recharge Offers
router.get('/wallet', (req, res) => {
  req.query.app = 'partner';
  req.query.accountType = 'partner';
  return walletController.getBalance(req, res);
});
router.get('/wallet/offers', (req, res) => {
  req.query.app = 'partner';
  req.query.userRole = 'PARTNER_OWNER';
  return walletController.getOffers(req, res);
});
router.get('/wallet/recharge-offers', (req, res) => {
  req.query.app = 'partner';
  req.query.userRole = 'PARTNER_OWNER';
  return walletController.getOffers(req, res);
});
router.post('/wallet/recharge', (req, res) => {
  req.body.app = 'partner';
  req.body.accountType = 'partner';
  return walletController.createRechargeOrder(req, res);
});
router.post('/wallet/recharge/verify', (req, res) => {
  req.body.app = 'partner';
  req.body.accountType = 'partner';
  return walletController.verifyRechargePayment(req, res);
});
router.get('/wallet/transactions', (req, res) => {
  req.query.app = 'partner';
  return walletController.getTransactions(req, res);
});

export default router;
