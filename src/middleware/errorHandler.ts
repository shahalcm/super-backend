// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(
    {
      err: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      url: req.originalUrl,
      method: req.method,
    },
    'Unhandled request error'
  );

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    sendError(res, `A record with this ${field} already exists.`, 409, 'DUPLICATE_KEY', {
      field,
      value: err.keyValue ? err.keyValue[field] : undefined,
    });
    return;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e: any) => e.message);
    sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', messages);
    return;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    sendError(res, `Invalid resource identifier: ${err.value}`, 400, 'INVALID_ID');
    return;
  }

  // JSON Syntax Error
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Malformed JSON in request body', 400, 'INVALID_JSON');
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  sendError(res, message, statusCode, err.code || 'INTERNAL_ERROR');
};
