/**
 * ERROR HANDLING UTILITIES
 * Comprehensive error handling for the ARGUS system
 */

// ============================================
// ERROR TYPES
// ============================================

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  PERMISSION = 'PERMISSION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_API = 'EXTERNAL_API',
  SYSTEM = 'SYSTEM',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  DATA_CORRUPTION = 'DATA_CORRUPTION'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  userId?: string;
  requestId?: string;
  stack?: string;
  context?: Record<string, any>;
}

export interface ErrorContext {
  userId?: string;
  orgId?: string;
  department?: string;
  role?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
}

// ============================================
// ERROR CREATION UTILITIES
// ============================================

/**
 * Create a standardized error object
 */
export function createError(
  type: ErrorType,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: any,
  context?: ErrorContext
): AppError {
  return {
    type,
    severity,
    message,
    details,
    timestamp: new Date().toISOString(),
    context,
    stack: new Error().stack
  };
}

/**
 * Create validation error
 */
export function createValidationError(
  field: string,
  message: string,
  details?: any
): AppError {
  return createError(
    ErrorType.VALIDATION,
    `${field}: ${message}`,
    ErrorSeverity.LOW,
    details,
    { field, validationDetails: details }
  );
}

/**
 * Create authentication error
 */
export function createAuthError(message: string = 'Authentication failed'): AppError {
  return createError(
    ErrorType.AUTHENTICATION,
    message,
    ErrorSeverity.HIGH
  );
}

/**
 * Create authorization error
 */
export function createAuthzError(
  resource: string,
  action: string,
  context?: ErrorContext
): AppError {
  return createError(
    ErrorType.AUTHORIZATION,
    `Access denied to ${resource} for ${action}`,
    ErrorSeverity.HIGH,
    undefined,
    context
  );
}

/**
 * Create not found error
 */
export function createNotFoundError(resource: string, id?: string): AppError {
  const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
  return createError(
    ErrorType.NOT_FOUND,
    message,
    ErrorSeverity.MEDIUM
  );
}

/**
 * Create database error
 */
export function createDatabaseError(
  operation: string,
  details?: any
): AppError {
  return createError(
    ErrorType.DATABASE,
    `Database operation failed: ${operation}`,
    ErrorSeverity.HIGH,
    details
  );
}

/**
 * Create network error
 */
export function createNetworkError(
  operation: string,
  statusCode?: number,
  details?: any
): AppError {
  const message = statusCode 
    ? `Network error during ${operation}: HTTP ${statusCode}`
    : `Network error during ${operation}`;
    
  return createError(
    ErrorType.NETWORK,
    message,
    ErrorSeverity.MEDIUM,
    { statusCode, ...details }
  );
}

/**
 * Create business logic error
 */
export function createBusinessLogicError(
  operation: string,
  reason: string,
  details?: any
): AppError {
  return createError(
    ErrorType.BUSINESS_LOGIC,
    `Business logic error in ${operation}: ${reason}`,
    ErrorSeverity.MEDIUM,
    details
  );
}

/**
 * Create external API error
 */
export function createExternalApiError(
  service: string,
  operation: string,
  statusCode?: number,
  details?: any
): AppError {
  const message = statusCode 
    ? `External API error in ${service} during ${operation}: HTTP ${statusCode}`
    : `External API error in ${service} during ${operation}`;
    
  return createError(
    ErrorType.EXTERNAL_API,
    message,
    ErrorSeverity.HIGH,
    { service, operation, statusCode, ...details }
  );
}

/**
 * Create rate limit error
 */
export function createRateLimitError(
  operation: string,
  limit: number,
  windowMs: number
): AppError {
  return createError(
    ErrorType.RATE_LIMIT,
    `Rate limit exceeded for ${operation}: ${limit} requests per ${windowMs}ms`,
    ErrorSeverity.MEDIUM,
    { limit, windowMs }
  );
}

// ============================================
// ERROR LOGGING UTILITIES
// ============================================

/**
 * Log error to console and/or external service
 */
export function logError(error: AppError, context?: ErrorContext): void {
  const logData = {
    ...error,
    context: { ...error.context, ...context }
  };

  // Console logging
  console.error('[APP ERROR]', logData);

  // In production, send to external logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement external logging service integration
    // sendToLoggingService(logData);
  }
}

/**
 * Log warning
 */
export function logWarning(message: string, context?: ErrorContext): void {
  const warningData = {
    type: ErrorType.SYSTEM,
    severity: ErrorSeverity.LOW,
    message,
    timestamp: new Date().toISOString(),
    context
  };

  console.warn('[APP WARNING]', warningData);
}

/**
 * Log info message
 */
export function logInfo(message: string, data?: any): void {
  const infoData = {
    message,
    data,
    timestamp: new Date().toISOString()
  };

  console.info('[APP INFO]', infoData);
}

// ============================================
// ERROR RESPONSE FORMATTING
// ============================================

/**
 * Format error for API response
 */
export function formatErrorResponse(error: AppError): {
  success: false;
  error: {
    type: string;
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
} {
  return {
    success: false,
    error: {
      type: error.type,
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp: error.timestamp,
      requestId: error.requestId
    }
  };
}

/**
 * Format errors for frontend display
 */
export function formatErrorForDisplay(error: AppError): {
  title: string;
  message: string;
  severity: ErrorSeverity;
  canRetry: boolean;
  actions?: string[];
} {
  const errorMessages = {
    [ErrorType.VALIDATION]: {
      title: 'Validation Error',
      canRetry: true,
      actions: ['Check input fields', 'Contact support if issue persists']
    },
    [ErrorType.AUTHENTICATION]: {
      title: 'Authentication Error',
      canRetry: true,
      actions: ['Check credentials', 'Reset password', 'Contact support']
    },
    [ErrorType.AUTHORIZATION]: {
      title: 'Access Denied',
      canRetry: false,
      actions: ['Contact administrator', 'Check permissions']
    },
    [ErrorType.NOT_FOUND]: {
      title: 'Not Found',
      canRetry: false,
      actions: ['Check resource ID', 'Refresh data']
    },
    [ErrorType.DATABASE]: {
      title: 'Database Error',
      canRetry: true,
      actions: ['Try again later', 'Contact support']
    },
    [ErrorType.NETWORK]: {
      title: 'Network Error',
      canRetry: true,
      actions: ['Check connection', 'Try again', 'Contact support']
    },
    [ErrorType.PERMISSION]: {
      title: 'Permission Error',
      canRetry: false,
      actions: ['Contact administrator', 'Request permission']
    },
    [ErrorType.BUSINESS_LOGIC]: {
      title: 'Processing Error',
      canRetry: false,
      actions: ['Contact support', 'Check data format']
    },
    [ErrorType.EXTERNAL_API]: {
      title: 'Service Error',
      canRetry: true,
      actions: ['Try again later', 'Contact support']
    },
    [ErrorType.SYSTEM]: {
      title: 'System Error',
      canRetry: true,
      actions: ['Refresh page', 'Contact support']
    },
    [ErrorType.RATE_LIMIT]: {
      title: 'Rate Limit Exceeded',
      canRetry: false,
      actions: ['Wait and try again', 'Upgrade plan']
    },
    [ErrorType.TIMEOUT]: {
      title: 'Request Timeout',
      canRetry: true,
      actions: ['Try again', 'Check connection', 'Contact support']
    }
  };

  const defaultMessage = {
    title: 'Error',
    message: error.message,
    severity: error.severity,
    canRetry: true,
    actions: ['Try again', 'Contact support']
  };

  return errorMessages[error.type] || defaultMessage;
}

// ============================================
// ERROR BOUNDARY HANDLING
// ============================================

/**
 * Handle async errors with proper error conversion
 */
export async function handleAsyncError<T>(
  promise: Promise<T>,
  errorContext?: ErrorContext
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await promise;
    return { data };
  } catch (error) {
    let appError: AppError;

    if (error instanceof Error) {
      // Determine error type based on error message
      if (error.message.includes('validation')) {
        appError = createValidationError('unknown', error.message, error);
      } else if (error.message.includes('authentication')) {
        appError = createAuthError(error.message);
      } else if (error.message.includes('permission')) {
        appError = createAuthzError('unknown', 'unknown', errorContext);
      } else if (error.message.includes('not found')) {
        appError = createNotFoundError('resource');
      } else if (error.message.includes('database')) {
        appError = createDatabaseError('operation', error);
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        appError = createNetworkError('operation', undefined, error);
      } else {
        appError = createError(ErrorType.SYSTEM, error.message, ErrorSeverity.MEDIUM, error);
      }
    } else {
      appError = createError(ErrorType.SYSTEM, 'Unknown error occurred', ErrorSeverity.MEDIUM, error);
    }

    logError(appError, errorContext);
    return { error: appError };
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffFactor: number = 2,
  errorContext?: ErrorContext
): Promise<{ data?: T; error?: AppError }> {
  let lastError: AppError | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const result = await handleAsyncError(Promise.reject(error), errorContext);
      lastError = result.error;

      if (attempt === maxRetries - 1) {
        return { error: lastError };
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(backoffFactor, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { error: lastError };
}

// ============================================
// CIRCUIT BREAKER PATTERN
// ============================================

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttempt: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private threshold: number;
  private timeout: number;
  private resetTimeout: number;

  constructor(threshold: number = 5, timeout: number = 60000, resetTimeout: number = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
    this.state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttempt: Date.now()
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.isOpen) {
      if (Date.now() < this.state.nextAttempt) {
        throw createError(
          ErrorType.SYSTEM,
          'Circuit breaker is open',
          ErrorSeverity.HIGH
        );
      }
      this.reset();
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.failureCount = 0;
    this.state.isOpen = false;
  }

  private onFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.threshold) {
      this.state.isOpen = true;
      this.state.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  private reset(): void {
    this.state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttempt: Date.now()
    };
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}
