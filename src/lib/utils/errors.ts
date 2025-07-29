// Centralized error handling for AnthonChat Web Application
// Provides standardized error classes and handling utilities

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND_ERROR', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 'CONFLICT_ERROR', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, public service: string) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502);
    this.name = 'ExternalServiceError';
  }
}

// Error handler for API routes
export function handleApiError(error: unknown): {
  error: AppError;
  shouldLog: boolean;
} {
  let appError: AppError;
  let shouldLog = true;

  if (error instanceof AppError) {
    appError = error;
    // Don't log operational errors (like validation errors) in production
    shouldLog = !error.isOperational || process.env.NODE_ENV === 'development';
  } else if (error instanceof Error) {
    appError = new AppError(
      error.message || 'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      false
    );
  } else {
    appError = new AppError(
      'An unknown error occurred',
      'UNKNOWN_ERROR',
      500,
      false
    );
  }

  return { error: appError, shouldLog };
}

// Utility to check if an error is operational (expected) or programming error
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

// Format error for API responses
export function formatErrorResponse(error: AppError) {
  return {
    success: false,
    error: {
      message: error.message,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}