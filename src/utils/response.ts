// src/utils/response.ts
import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  error?: {
    code?: string;
    details?: any;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message: string = 'Operation successful',
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response => {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string = 'Internal server error',
  statusCode: number = 500,
  code: string = 'ERROR',
  details?: any
): Response => {
  const body: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      details,
    },
  };
  return res.status(statusCode).json(body);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Data fetched successfully'
): Response => {
  const totalPages = Math.ceil(total / limit) || 1;
  return sendSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages,
  });
};
