// src/modules/orders/orders.routes.ts
import { Router } from 'express';
import { ordersController } from './orders.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/checkout', (req, res) => ordersController.checkout(req, res));
router.post('/verify-payment', (req, res) => ordersController.verifyPayment(req, res));
router.get('/my-orders', (req, res) => ordersController.getMyOrders(req, res));
router.get('/:id', (req, res) => ordersController.getOrderById(req, res));
router.post('/:id/cancel', (req, res) => ordersController.cancelOrder(req, res));

export default router;
