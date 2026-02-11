import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      requestId: req.headers['x-request-id'],
    });
  }

  // Log unexpected errors for investigation
  console.error('Unexpected error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: (req as any).userId,
    requestId: req.headers['x-request-id'],
  });

  // Don't leak internal error details
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id'],
  });
};
