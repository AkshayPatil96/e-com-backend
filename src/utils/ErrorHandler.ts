/**
 * Error categories for better error classification
 */
export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  BUSINESS_LOGIC = "BUSINESS_LOGIC",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  SYSTEM = "SYSTEM",
  RATE_LIMIT = "RATE_LIMIT",
  SECURITY = "SECURITY",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Interface for error metadata
 */
export interface ErrorMetadata {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  context?: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
  userId?: string;
  action?: string;
}

/**
 * Enhanced Custom Error Handler class with comprehensive error tracking
 */
class ErrorHandler extends Error {
  statusCode: number;
  metadata: ErrorMetadata;

  /**
   * Initializes a new instance of the ErrorHandler class.
   * @param statusCode - HTTP status code for the error.
   * @param message - Error message (defaults to "An error occurred" if not provided).
   * @param metadata - Additional error metadata for tracking and debugging.
   */
  constructor(
    statusCode: number,
    message: string = "An error occurred",
    metadata?: Partial<ErrorMetadata>,
  ) {
    super(message);
    this.statusCode = statusCode;

    // Default metadata
    this.metadata = {
      category: this.getDefaultCategory(statusCode),
      severity: this.getDefaultSeverity(statusCode),
      code: this.generateErrorCode(statusCode, metadata?.category),
      timestamp: new Date(),
      ...metadata,
    };

    // Captures the stack trace for better debugging
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get default error category based on status code
   */
  private getDefaultCategory(statusCode: number): ErrorCategory {
    if (statusCode >= 400 && statusCode < 500) {
      switch (statusCode) {
        case 401:
          return ErrorCategory.AUTHENTICATION;
        case 403:
          return ErrorCategory.AUTHORIZATION;
        case 404:
          return ErrorCategory.RESOURCE_NOT_FOUND;
        case 422:
          return ErrorCategory.VALIDATION;
        case 429:
          return ErrorCategory.RATE_LIMIT;
        default:
          return ErrorCategory.BUSINESS_LOGIC;
      }
    } else if (statusCode >= 500) {
      return ErrorCategory.SYSTEM;
    }
    return ErrorCategory.BUSINESS_LOGIC;
  }

  /**
   * Get default error severity based on status code
   */
  private getDefaultSeverity(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return ErrorSeverity.CRITICAL;
    if (statusCode === 401 || statusCode === 403) return ErrorSeverity.HIGH;
    if (statusCode === 404 || statusCode === 422) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Generate structured error code
   */
  private generateErrorCode(
    statusCode: number,
    category?: ErrorCategory,
  ): string {
    const cat = category || this.getDefaultCategory(statusCode);
    const timestamp = Date.now().toString(36);
    return `${cat}_${statusCode}_${timestamp}`;
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        statusCode: this.statusCode,
        code: this.metadata.code,
        category: this.metadata.category,
        severity: this.metadata.severity,
        timestamp: this.metadata.timestamp,
      },
    };
  }

  /**
   * Static method to create validation errors
   */
  static validation(
    message: string,
    context?: Record<string, any>,
  ): ErrorHandler {
    return new ErrorHandler(422, message, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      context,
    });
  }

  /**
   * Static method to create authentication errors
   */
  static authentication(
    message: string = "Authentication required",
  ): ErrorHandler {
    return new ErrorHandler(401, message, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
    });
  }

  /**
   * Static method to create authorization errors
   */
  static authorization(message: string = "Access denied"): ErrorHandler {
    return new ErrorHandler(403, message, {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
    });
  }

  /**
   * Static method to create not found errors
   */
  static notFound(resource: string = "Resource"): ErrorHandler {
    return new ErrorHandler(404, `${resource} not found`, {
      category: ErrorCategory.RESOURCE_NOT_FOUND,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  /**
   * Static method to create rate limit errors
   */
  static rateLimit(message: string = "Too many requests"): ErrorHandler {
    return new ErrorHandler(429, message, {
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
    });
  }
}

export default ErrorHandler;
