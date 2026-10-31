// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';

export type UserRole =
  | 'CUSTOMER'
  | 'TAXI_DRIVER'
  | 'DELIVERY_RIDER'
  | 'PARTNER_OWNER'
  | 'PARTNER_STAFF'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface AuthUserPayload {
  userId: string;
  phone: string;
  email?: string;
  roles: UserRole[];
  currentRole: UserRole;
  partnerId?: string;
  driverId?: string;
  riderId?: string;
  adminStaffId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Generate Access Token & Refresh Token pair
 */
export function generateTokens(payload: AuthUserPayload): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });

  const refreshToken = jwt.sign(
    { userId: payload.userId, currentRole: payload.currentRole },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    }
  );

  return { accessToken, refreshToken };
}

/**
 * Authentication Middleware: Validates Bearer JWT Access Token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication token required', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      sendError(res, 'Session token expired. Please refresh your token.', 401, 'TOKEN_EXPIRED');
      return;
    }
    sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }
};

/**
 * Optional Authentication: Attaches req.user if token is present, does not fail if absent
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUserPayload;
    req.user = decoded;
  } catch {
    // Ignore invalid optional tokens
  }
  next();
};

/**
 * Authorize specified roles
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    const hasRole =
      allowedRoles.includes(req.user.currentRole) ||
      req.user.roles.some((r) => allowedRoles.includes(r)) ||
      req.user.roles.includes('SUPER_ADMIN');

    if (!hasRole) {
      sendError(
        res,
        'Access denied: You do not have permissions for this action.',
        403,
        'FORBIDDEN'
      );
      return;
    }

    next();
  };
};

// Convenient Role Guards
export const requireCustomer = requireRoles('CUSTOMER');
export const requireDriver = requireRoles('TAXI_DRIVER');
export const requireRider = requireRoles('DELIVERY_RIDER');
export const requirePartner = requireRoles('PARTNER_OWNER', 'PARTNER_STAFF');
export const requireAdmin = requireRoles('ADMIN', 'SUPER_ADMIN');
export const requireSuperAdmin = requireRoles('SUPER_ADMIN');
