// src/modules/drivers/drivers.routes.ts
import { Router } from 'express';
import { driversController } from './drivers.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Profile & Onboarding
router.get('/profile', (req, res) => driversController.getProfile(req, res));
router.post('/profile', (req, res) => driversController.updateProfile(req, res));
router.post('/profile/submit', (req, res) => driversController.submitProfile(req, res));

// Documents
router.post('/documents/driving-licence', (req, res) => driversController.updateLicence(req, res));
router.post('/documents/rc', (req, res) => driversController.updateRC(req, res));
router.post('/documents/vehicle-photos', (req, res) => driversController.updateVehiclePhotos(req, res));

// Availability & Location
router.post('/availability', (req, res) => driversController.setAvailability(req, res));
router.patch('/availability', (req, res) => driversController.setAvailability(req, res));
router.post('/location', (req, res) => driversController.updateLocation(req, res));

// Rides
router.get('/rides/available', (req, res) => driversController.getAvailableRides(req, res));
router.get('/rides/active', (req, res) => driversController.getActiveRide(req, res));
router.post('/rides/:id/accept', (req, res) => driversController.acceptRide(req, res));
router.post('/rides/:id/decline', (req, res) => driversController.declineRide(req, res));
router.post('/rides/:id/arrived', (req, res) => driversController.updateArrived(req, res));
router.post('/rides/:id/start', (req, res) => driversController.startRide(req, res));
router.post('/rides/:id/complete', (req, res) => driversController.completeRide(req, res));

// Earnings & Payouts
router.get('/earnings/summary', (req, res) => driversController.getEarningsSummary(req, res));
router.post('/payouts/request', (req, res) => driversController.requestPayout(req, res));

export default router;
