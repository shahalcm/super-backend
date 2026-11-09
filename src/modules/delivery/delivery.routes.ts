// src/modules/delivery/delivery.routes.ts
import { Router } from 'express';
import { deliveryController } from './delivery.controller.js';
import { walletController } from '../wallet/wallet.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Profile & Onboarding
router.get('/profile', (req, res) => deliveryController.getProfile(req, res));
router.post('/profile', (req, res) => deliveryController.updateProfile(req, res));
router.patch('/profile', (req, res) => deliveryController.updateProfile(req, res));
router.post('/profile/submit', (req, res) => deliveryController.submitProfile(req, res));

// Aliases matching mobile delivery client registration wizard
router.get('/riders/registration/me', (req, res) => deliveryController.getProfile(req, res));
router.patch('/riders/registration/me', (req, res) => deliveryController.updateProfile(req, res));
router.post('/riders/registration/submit', (req, res) => deliveryController.submitProfile(req, res));
router.get('/riders/registration/status', (req, res) => deliveryController.getProfile(req, res));
router.post('/riders/documents', (req, res) => deliveryController.updateProfile(req, res));

// Availability & Location
router.post('/availability', (req, res) => deliveryController.setAvailability(req, res));
router.post('/location', (req, res) => deliveryController.updateLocation(req, res));

// Deliveries
router.get('/deliveries/available', (req, res) => deliveryController.getAvailableDeliveries(req, res));
router.get('/deliveries/current', (req, res) => deliveryController.getCurrentDelivery(req, res));
router.post('/deliveries/:id/accept', (req, res) => deliveryController.acceptDelivery(req, res));
router.post('/deliveries/:id/pickup', (req, res) => deliveryController.updatePickup(req, res));
router.post('/deliveries/:id/complete', (req, res) => deliveryController.completeDelivery(req, res));

// Earnings & Payouts
router.get('/earnings/summary', (req, res) => deliveryController.getEarningsSummary(req, res));
router.post('/payouts/request', (req, res) => deliveryController.requestPayout(req, res));

// Rider Wallet & Promotional Credit System
router.get('/wallet', (req, res) => {
  req.query.app = 'delivery';
  req.query.accountType = 'delivery_rider';
  return walletController.getBalance(req, res);
});
router.get('/wallet/offers', (req, res) => {
  req.query.app = 'delivery';
  req.query.userRole = 'DELIVERY_RIDER';
  return walletController.getOffers(req, res);
});
router.get('/wallet/recharge-offers', (req, res) => {
  req.query.app = 'delivery';
  req.query.userRole = 'DELIVERY_RIDER';
  return walletController.getOffers(req, res);
});
router.post('/wallet/recharge', (req, res) => {
  req.body.app = 'delivery';
  req.body.accountType = 'delivery_rider';
  return walletController.createRechargeOrder(req, res);
});
router.post('/wallet/recharge/verify', (req, res) => {
  req.body.app = 'delivery';
  req.body.accountType = 'delivery_rider';
  return walletController.verifyRechargePayment(req, res);
});
router.get('/wallet/transactions', (req, res) => {
  req.query.app = 'delivery';
  return walletController.getTransactions(req, res);
});

export default router;
