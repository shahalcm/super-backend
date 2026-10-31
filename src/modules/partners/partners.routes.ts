// src/modules/partners/partners.routes.ts
import { Router } from 'express';
import { partnersController } from './partners.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

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

// Grocery Management
router.get('/grocery/products', (req, res) => partnersController.getGroceryProducts(req, res));
router.post('/grocery/products', (req, res) => partnersController.createGroceryProduct(req, res));
router.put('/grocery/products/:id', (req, res) => partnersController.updateGroceryProduct(req, res));
router.patch('/grocery/products/:id', (req, res) => partnersController.updateGroceryProduct(req, res));
router.delete('/grocery/products/:id', (req, res) => partnersController.deleteGroceryProduct(req, res));

router.get('/grocery/orders', (req, res) => partnersController.getPartnerOrders(req, res));
router.patch('/grocery/orders/:id/status', (req, res) => partnersController.updateOrderStatus(req, res));

// Integrations (AES-256-GCM Vault)
router.get('/integrations/razorpay', (req, res) => partnersController.getRazorpayIntegration(req, res));
router.post('/integrations/razorpay', (req, res) => partnersController.saveRazorpayIntegration(req, res));

export default router;
