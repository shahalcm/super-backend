// src/modules/payments/payments.routes.ts
import { Router } from 'express';
import { paymentsController } from './payments.controller.js';

const router = Router();

router.post('/webhook', (req, res) => paymentsController.handleWebhook(req, res));

export default router;
