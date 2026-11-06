// src/modules/customers/customers.routes.ts
import { Router } from 'express';
import { customersController } from './customers.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public PIN code lookup for signup and address forms
router.get('/pincode/:pincode', (req, res) => customersController.lookupPincode(req, res));

router.use(authenticate);

router.get('/profile', (req, res) => customersController.getProfile(req, res));
router.put('/profile', (req, res) => customersController.updateProfile(req, res));
router.put('/location', (req, res) => customersController.updateLocation(req, res));
router.post('/addresses', (req, res) => customersController.addAddress(req, res));
router.delete('/addresses/:id', (req, res) => customersController.deleteAddress(req, res));
router.delete('/account', (req, res) => customersController.deleteAccount(req, res));

export default router;

