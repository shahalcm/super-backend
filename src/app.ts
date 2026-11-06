// src/app.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customers/customers.routes.js';
import driverRoutes from './modules/drivers/drivers.routes.js';
import taxiRoutes from './modules/taxi/taxi.routes.js';
import deliveryRoutes from './modules/delivery/delivery.routes.js';
import partnerRoutes from './modules/partners/partners.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import contentRoutes from './modules/content/content.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import realEstateRoutes from './modules/real-estate/real-estate.routes.js';
import { authenticate } from './middleware/auth.js';
import { contentController } from './modules/content/content.controller.js';
import { customersController } from './modules/customers/customers.controller.js';

const app = express();

// Security & Optimization Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-razorpay-signature'],
  })
);

app.use(compression());

// Body parsing with rawBody capture for webhook signature verification
app.use(
  express.json({
    limit: '15mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// General Rate Limiter
app.use(generalLimiter);

// Health check endpoints
const healthHandler = (_req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'healthy',
    ecosystem: 'UBSSuper Ecosystem Central Backend',
    version: '1.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    services: {
      auth: 'online',
      ubssuper: 'online',
      taxi: 'online',
      delivery: 'online',
      partner: 'online',
      admin: 'online',
    },
  });
};

app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// 1. Direct Public Auth Aliases (Must be mounted BEFORE protected routers to avoid auth intercept)
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/v1/delivery/auth', authRoutes);
app.use('/api/delivery/auth', authRoutes);
app.use('/api/v1/api/delivery/auth', authRoutes);

app.use('/api/v1/driver/auth', authRoutes);
app.use('/api/driver/auth', authRoutes);
app.use('/api/v1/api/driver/auth', authRoutes);

app.use('/api/v1/partner/auth', authRoutes);
app.use('/api/partner/auth', authRoutes);
app.use('/api/v1/api/partner/auth', authRoutes);

// 2. Central API Routes (Versioned /api/v1)
app.use('/api/v1/customers', customerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/customers', customerRoutes);
app.use('/api/v1/location', customerRoutes);
app.use('/api/location', customerRoutes);
app.use('/location', customerRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/taxi', taxiRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/partners', partnerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/content', contentRoutes);
app.use('/content', contentRoutes);

// Direct Location & Nearby Endpoints (Supports /api and /api/v1)
app.put('/api/v1/users/location', authenticate, (req, res) => customersController.updateLocation(req, res));
app.put('/api/users/location', authenticate, (req, res) => customersController.updateLocation(req, res));
app.delete('/api/v1/users/account', authenticate, (req, res) => customersController.deleteAccount(req, res));
app.delete('/api/users/account', authenticate, (req, res) => customersController.deleteAccount(req, res));
app.delete('/api/v1/delivery/account', authenticate, (req, res) => customersController.deleteAccount(req, res));
app.delete('/api/delivery/account', authenticate, (req, res) => customersController.deleteAccount(req, res));
app.use('/api/users', customerRoutes);
app.use('/api/v1/users', customerRoutes);

app.get('/api/v1/stores/nearby', (req, res) => contentController.getNearbyStores(req, res));
app.get('/api/stores/nearby', (req, res) => contentController.getNearbyStores(req, res));
app.get('/api/v1/restaurants/nearby', (req, res) => contentController.getNearbyRestaurants(req, res));
app.get('/api/restaurants/nearby', (req, res) => contentController.getNearbyRestaurants(req, res));
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/real-estate', realEstateRoutes);
app.use('/api/real-estate', realEstateRoutes);
app.use('/api/v1/admin/real-estate', realEstateRoutes);
app.use('/api/admin/real-estate', realEstateRoutes);


// 3. Direct App Aliases (Version-less and client compatibility mounts)
app.use('/api/driver', driverRoutes);
app.use('/api/v1/api/driver', driverRoutes);

app.use('/api/partner', partnerRoutes);
app.use('/api/v1/api/partner', partnerRoutes);

app.use('/api/delivery', deliveryRoutes);
app.use('/api/v1/api/delivery', deliveryRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/v1/api/admin', adminRoutes);

// 404 handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found on UBS Central Backend`,
    code: 'NOT_FOUND',
  });
});

// Central Global Error Handler
app.use(errorHandler);

export default app;
