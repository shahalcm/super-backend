// src/modules/taxi/taxi.routes.ts
import { Router } from 'express';
import { taxiController } from './taxi.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Route for calculating fare estimates
router.post('/estimate', (req, res) => taxiController.getEstimates(req, res));
router.get('/nearby-drivers', (req, res) => taxiController.getNearbyDrivers(req, res));

// Authenticated booking endpoints
router.post('/book', authenticate, (req, res) => taxiController.bookRide(req, res));
router.get('/ride/:id', authenticate, (req, res) => taxiController.getRide(req, res));
router.post('/ride/:id/cancel', authenticate, (req, res) => taxiController.cancelRide(req, res));

export default router;
