// src/modules/taxi/taxi.routes.ts
import { Router } from 'express';
import { taxiController } from './taxi.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public fare estimation & pricing endpoints
router.post('/estimate', (req, res) => taxiController.getEstimates(req, res));
router.post('/fare-estimate', (req, res) => taxiController.getEstimates(req, res));
router.get('/pricing', (req, res) => taxiController.getPricing(req, res));
router.get('/nearby-drivers', (req, res) => taxiController.getNearbyDrivers(req, res));

// Admin pricing management endpoints
router.put('/pricing', (req, res) => taxiController.updatePricing(req, res));
router.post('/pricing', (req, res) => taxiController.updatePricing(req, res));

// Authenticated booking endpoints (supports both singular /ride/:id and plural /rides/:id)
router.post('/book', authenticate, (req, res) => taxiController.bookRide(req, res));

router.get('/ride/:id', authenticate, (req, res) => taxiController.getRide(req, res));
router.get('/rides/:id', authenticate, (req, res) => taxiController.getRide(req, res));

router.post('/ride/:id/cancel', authenticate, (req, res) => taxiController.cancelRide(req, res));
router.post('/rides/:id/cancel', authenticate, (req, res) => taxiController.cancelRide(req, res));

export default router;
