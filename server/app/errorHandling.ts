import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger } from './logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class OperationalError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational = true;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'OperationalError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends OperationalError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends OperationalError {
  constructor(message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConflictError extends OperationalError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'An unexpected error occurred';

  logger.error('request_error', `Request failed: ${req.method} ${req.path}`, err, {
    method: req.method,
    path: req.path,
    statusCode,
    code,
    query: req.query,
    body: req.body
  });

  res.status(statusCode).json({
    error: {
      message,
      code,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('not_found', `Route not found: ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path
  });
  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  });
};

export class AdapterError extends Error implements AppError {
  statusCode: number = 500;
  code: string;
  isOperational = true;
  sourceName: string;

  constructor(message: string, sourceName: string, code: string = 'ADAPTER_ERROR') {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.sourceName = sourceName;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class IngestionError extends Error implements AppError {
  statusCode: number = 500;
  code: string;
  isOperational = true;
  sourceName: string;
  eventId?: string;

  constructor(message: string, sourceName: string, eventId?: string, code: string = 'INGESTION_ERROR') {
    super(message);
    this.name = 'IngestionError';
    this.code = code;
    this.sourceName = sourceName;
    this.eventId = eventId;
    Error.captureStackTrace(this, this.constructor);
  }
}
