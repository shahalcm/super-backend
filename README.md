# UBS Global Ecosystem – Central Backend Architecture & API Guide

A high-performance, resilient, enterprise-grade Central Backend built with Node.js, Express.js, TypeScript, MongoDB Atlas, and Socket.IO.

This central backend serves as the single source of truth and real-time engine connecting all five applications across the UBS Global ecosystem:

1. **UBSSuper** – Customer Super App (Expo / React Native)
2. **UBS Super Taxi** – Taxi Driver Partner App (Expo / React Native)
3. **UBS Partner** – Merchant Partner App: Supermarket, Hotel & Clinic (Expo / React Native)
4. **UBS Delivery** – Hyperlocal Delivery Rider App (Expo / React Native)
5. **UBS Admin Panel** – Central Administration & Finance Control Dashboard (Next.js 16)

---

## 🏛️ System Architecture & Cross-App Topology

```
                         ┌────────────────────────┐
                         │   UBS Admin Panel      │
                         │   (Next.js Dashboard)  │
                         └───────────┬────────────┘
                                     │ /api/admin/*
                                     ▼
 ┌──────────────┐        ┌────────────────────────┐        ┌──────────────┐
 │   UBSSuper   │───────▶│                        │◀───────│UBS Super Taxi│
 │(Customer App)│        │   UBS Central Backend  │        │ (Driver App) │
 └──────────────┘        │    (Node.js / Express  │        └──────────────┘
                         │     + Socket.IO)       │
 ┌──────────────┐        │                        │        ┌──────────────┐
 │ UBS Partner  │───────▶│                        │◀───────│ UBS Delivery │
 │(Merchant App)│        └───────────┬────────────┘        │ (Rider App)  │
 └──────────────┘                    │                     └──────────────┘
                                     ▼
                      ┌──────────────────────────────┐
                      │    MongoDB Atlas Cluster     │
                      │  Shared Schemas & 2dsphere   │
                      └──────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher
- **MongoDB**: MongoDB Atlas URI or local MongoDB instance (in-memory fallback active for offline tests)

### 2. Installation
```bash
# From workspace root
cd backend
npm install
```

### 3. Environment Configuration
Create `.env` inside `backend/` (or copy `.env.example`):
```ini
PORT=5000
NODE_ENV=development
API_VERSION=v1
APP_BASE_URL=http://localhost:5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ubs_global_ecosystem

# Security
JWT_SECRET=ubs_super_secret_jwt_key_production_2026_min_32_chars!
JWT_REFRESH_SECRET=ubs_super_refresh_jwt_key_production_2026_min_32_chars!
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
ENCRYPTION_KEY=12345678901234567890123456789012 # Exact 32 bytes for AES-256-GCM

# Razorpay
RAZORPAY_KEY_ID=rzp_test_ubsglobalecosystem2026
RAZORPAY_KEY_SECRET=ubsglobalsecretkeyrazorpay2026
RAZORPAY_WEBHOOK_SECRET=ubs_global_webhook_secret_hmac_2026

# Twilio SMS
TWILIO_ACCOUNT_SID=AC_dummy_account_sid_for_development_test
TWILIO_AUTH_TOKEN=dummy_auth_token_for_development_test
TWILIO_PHONE_NUMBER=+15005550006

# Cloudinary
CLOUDINARY_CLOUD_NAME=ubs-global-cloud
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=dummy_cloudinary_api_secret_2026
```

### 4. Running the Development Server
```bash
# Run with Hot-Reload (tsx watch)
npm run dev

# Or from root
npm run backend
```

### 5. Seeding Default Data
Populates default ecosystem applications, admin credentials, sample merchant grocery catalog, test drivers, and riders:
```bash
npm run seed
```

### 6. Compiling for Production
```bash
npm run build
npm start
```

---

## 🧪 Automated Test Suite (32 Scenarios)

The backend features a comprehensive 32-scenario integration test suite verifying cryptographic hashing, AES-256-GCM tamper-resistance, anti-SSRF filtering, geospatial fare engines, delivery tiering, Razorpay webhook validation, RBAC security gates, and mobile API aliases.

```bash
# Run test suite
npm test

# Direct tsx execution
npx tsx tests/verify-backend.ts
```

---

## 📡 API Catalog & Route Inventory

All endpoints are available versioned at `/api/v1/*` as well as direct route aliases matching existing mobile and web client codebases.

### 1. Health & Microservices
- `GET /health` – Ecosystem health, uptime, MongoDB state, and connected app statuses.
- `GET /api/v1/health` – JSON status endpoint.

### 2. Authentication (`/api/v1/auth/*` and aliases)
- `POST /send-otp` – Send 6-digit OTP (rate-limited, 60s cooldown, 5-min TTL, dev simulation fallback).
- `POST /verify-otp` – Verify OTP, issue JWT access + refresh tokens, return user profile.
- `POST /register` – Password-based multi-role registration.
- `POST /login` – Password-based authentication.
- `POST /refresh` – Rotate access token using valid refresh token.
- `GET /me` – Authenticated user profile and permissions.
- `POST /logout` – Invalidate current session.

### 3. Customers (`/api/v1/customers/*`)
- `GET /profile` – Customer profile and membership status.
- `PATCH /profile` – Update name, email, avatar, emergency contacts.
- `POST /addresses` – Add saved address with 2dsphere coordinates.
- `GET /addresses` – List saved home, work, and custom addresses.

### 4. Taxi Drivers & Booking (`/api/v1/taxi/*`, `/api/v1/drivers/*`, and `/api/driver/*`)
- `POST /estimate` – Multiclass fare calculation (Bike, Auto, Mini, Sedan, SUV, EV).
- `POST /book` – Atomic ride request, geospatial driver search (5km radius), and driver assignment.
- `GET /rides/:rideId` – Ride progress and driver location.
- `POST /rides/:rideId/cancel` – Ride cancellation.
- `GET /rides/available` – Driver view of incoming ride dispatch offers.
- `GET /rides/active` – Current assigned active ride.
- `POST /rides/:rideId/accept` – Accept dispatch order.
- `POST /rides/:rideId/arrived` – Mark arrived at customer pickup spot.
- `POST /rides/:rideId/start` – Verify 4-digit ride OTP and start trip meter.
- `POST /rides/:rideId/complete` – Complete trip, generate fare invoice, update earnings.
- `POST /availability` – Toggle online/offline status (strictly guarded: approved drivers only).
- `POST /location` – Driver GPS coordinates push with 2dsphere indexing.
- `GET /earnings/summary` – Today, weekly, and total driver earnings.
- `POST /payouts/request` – Request bank payout from driver wallet.

### 5. Hyperlocal Delivery (`/api/v1/delivery/*` and `/api/delivery/*`)
- `POST /onboarding/documents` – Upload Aadhaar, Driving Licence, and RC.
- `GET /assignments/available` – Available delivery tasks within rider service area.
- `GET /assignments/active` – Current in-progress delivery task.
- `POST /assignments/:id/accept` – Accept delivery assignment.
- `POST /assignments/:id/pickup` – Verify merchant pickup OTP.
- `POST /assignments/:id/complete` – Verify customer delivery OTP & Proof of Delivery (POD).
- `POST /availability` – Toggle rider availability (bicycle exemption supported for DL).
- `POST /location` – Push live delivery rider GPS coordinates.
- `GET /earnings` – Rider payouts and delivery fee incentives.

### 6. Merchant Partners (`/api/v1/partners/*` and `/api/partner/*`)
- `POST /register` – Partner onboarding wizard across Supermarket, Hotel, and Clinic.
- `POST /payments/registration-order` – Create ₹999 Razorpay order for onboarding registration fee.
- `POST /payments/verify-registration` – HMAC-SHA256 verification of registration fee payment.
- `GET /dashboard/summary` – Merchant revenue, pending orders, stock status.
- `GET /grocery/products` – Supermarket inventory catalog.
- `POST /grocery/products` – Add new grocery product (validated: sellingPrice <= MRP).
- `PATCH /grocery/products/:id` – Update price, stock count, and images.
- `GET /grocery/orders` – Incoming customer grocery orders.
- `PATCH /grocery/orders/:id/status` – Update order fulfillment: `preparing` ➔ `ready_for_pickup`.
- `POST /integrations/razorpay` – Save partner custom Razorpay credentials in AES-256-GCM vault.
- `POST /integrations/custom-api` – Configure webhook URL (protected by anti-SSRF engine).

### 7. Unified Orders & Multi-Domain Checkout (`/api/v1/orders/*`)
- `POST /checkout` – Unified cart checkout across grocery, food, logistics, hotel, and clinic.
- `POST /verify-payment` – Verify Razorpay payment signature, transition order to confirmed, and trigger delivery rider assignment.
- `GET /:orderId` – Detailed order status tracking.
- `GET /customer/my-orders` – Customer order history.

### 8. Payments & Webhooks (`/api/v1/payments/*`)
- `POST /razorpay/create-order` – Create server-side Razorpay order.
- `POST /razorpay/verify` – Client payment signature verification.
- `POST /razorpay/webhook` – Raw-body HMAC-SHA256 signature verification for automated payment settlement.

### 9. Content & Discovery (`/api/v1/content/*`)
- `GET /banners` – Active promotional banners for Super App home carousel.
- `GET /coupons` – Active promotional discount codes with expiration and minimum order rules.

### 10. Admin Panel (`/api/v1/admin/*` and `/api/admin/*`)
- `GET /dashboard` – System-wide GMV, active users, drivers, riders, partners, and orders.
- `GET /apps`, `PATCH /apps` – Manage ecosystem application statuses and maintenance toggles.
- `GET /customers`, `PATCH /customers` – Manage customer profiles, wallet credits, and suspensions.
- `GET /partners`, `PATCH /partners` – Approve/reject partner onboarding applications.
- `GET /drivers`, `PATCH /drivers` – Verify driving licences, RC books, vehicle photos, and approve drivers.
- `GET /delivery-riders`, `PATCH /delivery-riders` – Rider verification and vehicle approvals.
- `GET /orders`, `PATCH /orders` – Master order ledger across all 5 business verticals.
- `GET /payments`, `PATCH /payments` – Platform transactions and gateway logs.
- `GET /refunds`, `POST /refunds` – Process partial or full customer refunds.
- `GET /subscriptions`, `POST /subscriptions` – Partner subscription plans and billing.
- `GET /commissions`, `POST /commissions` – Category-based platform take-rates (e.g. 10% taxi, 8% grocery).
- `GET /payouts`, `PATCH /payouts` – Approve and execute partner and driver bank payouts.
- `GET /audit-logs` – Tamper-evident admin action log with IP, actor, and timestamp.

---

## ⚡ Real-Time Socket.IO Architecture

Socket.IO server runs on the same port (`5000`) and provides authenticated bi-directional events for live tracking.

### Connection & Authentication
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'jwt_access_token_here',
  },
});
```

### Room Partitioning Model
- `user:${customerId}` – Private customer notifications and ride/order updates.
- `driver:${driverId}` – Dispatch notifications, new ride alerts.
- `rider:${riderId}` – Hyperlocal delivery pickup notifications.
- `partner:${partnerId}` – New incoming orders and table/room reservations.
- `ride:${rideId}` – Real-time customer and driver GPS session during an active ride.
- `delivery:${deliveryId}` – Real-time customer and rider tracking during food/grocery delivery.

### Live Tracking Events
- `driver:location:update` – Driver broadcasts `{ rideId, lat, lng, heading, speed }`.
- `rider:location:update` – Delivery rider broadcasts `{ deliveryId, lat, lng }`.
- `ride:status:change` – State machine updates (`driver_assigned`, `arrived`, `in_progress`, `completed`).
- `delivery:status:change` – Package updates (`assigned`, `picked_up`, `delivered`).

---

## 🔒 Security Architecture

1. **AES-256-GCM Vault**: Partner API secrets and private credentials are encrypted with 12-byte initialization vectors (IVs) and 16-byte authentication tags to prevent tampering.
2. **Anti-SSRF Protection**: Webhook URLs provided by partners are resolved against DNS and checked to block loopback (`127.0.0.1`), IPv6 local (`::1`), link-local (`169.254.0.0/16`), and private RFC 1918 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
3. **Razorpay HMAC-SHA256**: Payment signatures and webhooks are verified using crypto buffers with timing-safe comparison to prevent timing attacks.
4. **Multi-Role RBAC**: 7 explicit roles (`CUSTOMER`, `TAXI_DRIVER`, `DELIVERY_RIDER`, `PARTNER_OWNER`, `PARTNER_STAFF`, `ADMIN`, `SUPER_ADMIN`) enforced via JWT middleware.
5. **Rate Limiting**: Protects against brute-force attacks on OTP endpoints (3 requests/min) and auth endpoints (10 requests/min).
