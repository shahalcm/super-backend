// src/modules/wallet/wallet.routes.ts
import { Router } from 'express';
import { walletController } from './wallet.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.js';

const router = Router();

// 1. Recharge Offers (Public / Optional Auth for catalog browsing)
router.get('/recharge-offers', optionalAuth, (req, res) => walletController.getOffers(req, res));
router.get('/offers', optionalAuth, (req, res) => walletController.getOffers(req, res));

// 2. Protected User Wallet Endpoints
router.use(authenticate);

router.get('/balance', (req, res) => walletController.getBalance(req, res));
router.get('/summary', (req, res) => walletController.getBalance(req, res));

router.post('/recharge', (req, res) => walletController.createRechargeOrder(req, res));
router.post('/recharge/create-order', (req, res) => walletController.createRechargeOrder(req, res));
router.post('/recharge/verify', (req, res) => walletController.verifyRechargePayment(req, res));

router.post('/withdraw', (req, res) => walletController.requestWithdrawal(req, res));

router.get('/transactions', (req, res) => walletController.getTransactions(req, res));
router.get('/recharge/history', (req, res) => walletController.getTransactions(req, res));
router.get('/history', (req, res) => walletController.getTransactions(req, res));

export default router;

