// src/modules/real-estate/real-estate.routes.ts
import { Router, Request, Response } from 'express';
import { realEstateService } from './real-estate.service.js';
import { authenticate, optionalAuth, requireRoles } from '../../middleware/auth.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// ============================================================================
// 1. CUSTOMER REAL ESTATE ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/real-estate/listing-fee
 * Fetches the current active property listing fee from the backend.
 * Never hardcoded in the frontend.
 */
router.get('/listing-fee', async (_req: Request, res: Response) => {
  try {
    const fee = await realEstateService.getListingFee();
    return sendSuccess(res, fee);
  } catch (err: any) {
    logger.error({ err }, 'Error fetching property listing fee');
    return sendError(res, err.message, 500);
  }
});

/**
 * GET /api/v1/real-estate/properties
 * Public feed of approved real estate properties with search and filters.
 */
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const result = await realEstateService.getProperties({
      search: req.query.search as string,
      propertyType: req.query.propertyType as string,
      listingType: req.query.listingType as string,
      city: req.query.city as string,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/**
 * GET /api/v1/real-estate/my-properties
 * Returns properties posted by the authenticated user.
 */
router.get('/my-properties', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || (req.query.userId as string) || 'cust_guest_user';
    const properties = await realEstateService.getMyProperties(userId);
    return sendSuccess(res, properties);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/**
 * GET /api/v1/real-estate/properties/:id
 * Public property detail by ID.
 */
router.get('/properties/:id', async (req: Request, res: Response) => {
  try {
    const property = await realEstateService.getPropertyById(req.params.id);
    if (!property) {
      return sendError(res, 'Property not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, property);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
});

/**
 * POST /api/v1/real-estate/upload-image
 * Uploads a property image to Cloudinary (folder: properties)
 */
router.post('/upload-image', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      return sendError(res, 'image payload (base64 dataUri or URL) is required', 400);
    }
    const result = await realEstateService.uploadPropertyImage(image);
    return sendSuccess(res, result, 'Image uploaded to Cloudinary successfully', 201);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to upload property image to Cloudinary');
    return sendError(res, err.message, 500);
  }
});

/**
 * POST /api/v1/real-estate/properties
 * Submit a property draft. Server attaches active listing fee snapshot.
 */
router.post('/properties', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.body.userId || 'cust_guest_user';
    const userName = req.body.userName || req.body.contactName || 'Property Owner';
    const userPhone = req.user?.phone || req.body.contactPhone || req.body.userPhone || '+91 98765 43210';

    const result = await realEstateService.createPropertyDraft(userId, userName, userPhone, req.body);
    return sendSuccess(res, result, 'Property draft created', 201);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to create property draft');
    return sendError(res, err.message, 400);
  }
});

/**
 * POST /api/v1/real-estate/create-listing-order
 * Initiates Razorpay payment order for the property listing fee.
 * Amount is determined solely by the server-side fee snapshot.
 */
router.post('/create-listing-order', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) {
      return sendError(res, 'propertyId is required', 400);
    }

    const userId = req.user?.userId || req.body.userId || 'cust_guest_user';
    const userName = req.body.userName || 'Property Owner';
    const userPhone = req.user?.phone || req.body.userPhone || '+91 98765 43210';

    const orderData = await realEstateService.createListingOrder(userId, userName, userPhone, propertyId);
    return sendSuccess(res, orderData);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to create listing fee order');
    return sendError(res, err.message, 400);
  }
});

/**
 * POST /api/v1/real-estate/verify-listing-payment
 * Verifies Razorpay payment signature and transitions property to 'under_review'.
 */
router.post('/verify-listing-payment', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!propertyId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return sendError(
        res,
        'propertyId, razorpayOrderId, razorpayPaymentId, and razorpaySignature are required',
        400
      );
    }

    const userId = req.user?.userId || req.body.userId || 'cust_guest_user';

    const verificationResult = await realEstateService.verifyListingPayment(userId, {
      propertyId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return sendSuccess(res, verificationResult);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to verify property listing payment');
    return sendError(res, err.message, 400);
  }
});

// ============================================================================
// 2. ADMIN REAL ESTATE ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/admin/real-estate/listing-fee
 * Admin fetch current listing fee settings and audit log history.
 */
router.get(
  '/admin/listing-fee',
  optionalAuth,
  async (_req: Request, res: Response) => {
    try {
      const fee = await realEstateService.getListingFee();
      const history = await realEstateService.getListingFeeHistory();
      return sendSuccess(res, { ...fee, history });
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
);

/**
 * PUT /api/v1/admin/real-estate/listing-fee
 * Admin update listing fee amount or enabled state.
 */
router.put(
  '/admin/listing-fee',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const { amount, isEnabled, reason } = req.body;
      if (amount === undefined || typeof amount !== 'number' || amount < 0) {
        return sendError(res, 'A valid non-negative amount is required', 400);
      }

      const adminId = req.user?.userId || req.body.adminId || 'admin_super';
      const adminName = req.body.adminName || 'Super Admin';

      const updatedFee = await realEstateService.updateListingFee({
        amount,
        isEnabled,
        changedBy: adminId,
        changedByName: adminName,
        reason,
      });

      return sendSuccess(res, updatedFee);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
);

/**
 * GET /api/v1/admin/real-estate/properties
 * Admin view of all properties with approval status filters.
 */
router.get(
  '/admin/properties',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const result = await realEstateService.adminGetProperties({
        status: req.query.status as string,
        approvalStatus: req.query.approvalStatus as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
);

/**
 * PUT /api/v1/admin/real-estate/properties/:id/status
 * Admin approve or reject property.
 */
router.put(
  '/admin/properties/:id/status',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const { approvalStatus, rejectionReason } = req.body;
      if (!approvalStatus || !['approved', 'rejected'].includes(approvalStatus)) {
        return sendError(res, 'approvalStatus must be either approved or rejected', 400);
      }

      const adminId = req.user?.userId || req.body.adminId || 'admin_super';
      const adminName = req.body.adminName || 'Super Admin';

      const updatedProperty = await realEstateService.adminUpdatePropertyStatus(req.params.id, {
        approvalStatus,
        rejectionReason,
        adminId,
        adminName,
      });

      return sendSuccess(res, updatedProperty);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
);

/**
 * GET /api/v1/admin/real-estate/payments
 * Admin view of listing payments with status filters.
 */
router.get(
  '/admin/payments',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const result = await realEstateService.adminGetPayments({
        status: req.query.status as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
);

/**
 * GET /api/v1/admin/real-estate/analytics
 * Real estate revenue and listing analytics for admin dashboard.
 */
router.get(
  '/admin/analytics',
  optionalAuth,
  async (_req: Request, res: Response) => {
    try {
      const analytics = await realEstateService.adminGetAnalytics();
      return sendSuccess(res, analytics);
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }
);

export default router;
