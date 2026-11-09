// src/modules/admin/admin.routes.ts
import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = Router();

// Allow optional auth for admin panel dev mode or enforce strictly in prod
router.use(optionalAuth);

// 1. Dashboard
router.get('/dashboard', (req, res) => adminController.getDashboard(req, res));

// 2. Apps
router.get('/apps', (req, res) => adminController.getApps(req, res));
router.patch('/apps', (req, res) => adminController.updateApp(req, res));

// 3. Customers
router.get('/customers', (req, res) => adminController.getCustomers(req, res));
router.patch('/customers', (req, res) => adminController.updateCustomer(req, res));

// 4. Partners
router.get('/partners', (req, res) => adminController.getPartners(req, res));
router.patch('/partners', (req, res) => adminController.updatePartner(req, res));

// 5. Drivers
router.get('/drivers', (req, res) => adminController.getDrivers(req, res));
router.patch('/drivers', (req, res) => adminController.updateDriver(req, res));

// 6. Delivery Riders
router.get('/delivery-riders', (req, res) => adminController.getDeliveryRiders(req, res));
router.patch('/delivery-riders', (req, res) => adminController.updateDeliveryRider(req, res));

// 7. Orders
router.get('/orders', (req, res) => adminController.getOrders(req, res));
router.patch('/orders', (req, res) => adminController.updateOrder(req, res));

// 8. Financials: Payments, Refunds, Payouts, Commissions
router.get('/payments', (req, res) => adminController.getPayments(req, res));
router.get('/refunds', (req, res) => adminController.getRefunds(req, res));
router.patch('/refunds', (req, res) => adminController.updateRefund(req, res));
router.get('/payouts', (req, res) => adminController.getPayouts(req, res));
router.patch('/payouts', (req, res) => adminController.updatePayout(req, res));

router.get('/commissions', (req, res) => adminController.getCommissions(req, res));
router.post('/commissions', (req, res) => adminController.createCommission(req, res));
router.patch('/commissions', (req, res) => adminController.updateCommission(req, res));
router.delete('/commissions', (req, res) => adminController.deleteCommission(req, res));

// 9. Subscriptions
router.get('/subscriptions', (req, res) => adminController.getSubscriptions(req, res));

// 10. Audit Logs
router.get('/audit-logs', (req, res) => adminController.getAuditLogs(req, res));

// 11. Recharge Offers & Pricing Management
router.get('/recharge-offers', (req, res) => adminController.getRechargeOffers(req, res));
router.post('/recharge-offers', (req, res) => adminController.createRechargeOffer(req, res));
router.put('/recharge-offers/:id', (req, res) => adminController.updateRechargeOffer(req, res));
router.patch('/recharge-offers/:id', (req, res) => adminController.updateRechargeOffer(req, res));
router.patch('/recharge-offers/:id/status', (req, res) => adminController.updateRechargeOfferStatus(req, res));

// 12. Wallet Ledger Transactions & Analytics
router.get('/wallet/transactions', (req, res) => adminController.getWalletTransactions(req, res));
router.get('/wallet/analytics', (req, res) => adminController.getWalletAnalytics(req, res));

export default router;
