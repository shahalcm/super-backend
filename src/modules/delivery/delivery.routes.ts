// src/modules/delivery/delivery.routes.ts
import { Router } from 'express';
import { deliveryController } from './delivery.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Profile & Onboarding
router.get('/profile', (req, res) => deliveryController.getProfile(req, res));
router.post('/profile', (req, res) => deliveryController.updateProfile(req, res));
router.post('/profile/submit', (req, res) => deliveryController.submitProfile(req, res));

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

export default router;
