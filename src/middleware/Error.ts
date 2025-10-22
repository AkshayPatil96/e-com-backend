import { NextFunction, Request, Response } from "express";
import { IController } from "../@types/common.type";
import ErrorHandler, {
  ErrorCategory,
  ErrorSeverity,
} from "../utils/ErrorHandler";
import logger from "../utils/logger";

/**
 * Middleware for handling errors in Express applications.
 * This middleware captures errors and formats the response.
 * @param error - The error object.
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @param next - The next middleware function.
 */
export default function ErrorMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  error.statusCode = error.statusCode || 500; // Default to 500 Internal Server Error
  error.message = error.message || "Internal server error"; // Default message

  // Get or generate request ID for correlation
  const requestId =
    error.requestId ||
    req.headers["x-request-id"] ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle specific error cases
  if (error.name === "CastError") {
    const message: string = `Resource not found. Invalid: ${error.path}`;
    error = new ErrorHandler(400, message, {
      category: ErrorCategory.VALIDATION,
      context: { path: error.path, value: error.value },
    });
  } else if (error.code === 11000) {
    const duplicateFields = Object.keys(error.keyValue || {});
    const message: string = `Duplicate key error: ${duplicateFields.join(", ")}`;
    error = new ErrorHandler(400, message, {
      category: ErrorCategory.VALIDATION,
      context: { duplicateFields, values: error.keyValue },
    });
  } else if (error.name === "ValidationError") {
    const validationErrors = Object.values(error.errors || {}).map(
      (value: any) => ({
        field: value.path,
        message: value.message,
        value: value.value,
      }),
    );
    const message: string = validationErrors
      .map((err) => err.message)
      .join(", ");
    error = new ErrorHandler(400, message, {
      category: ErrorCategory.VALIDATION,
      context: { validationErrors },
    });
  } else if (error.name === "JsonWebTokenError") {
    const message: string = "JSON Web Token is invalid. Please try again.";
    error = new ErrorHandler(401, message, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
    });
  } else if (error.name === "TokenExpiredError") {
    const message: string = "JSON Web Token has expired. Please try again.";
    error = new ErrorHandler(401, message, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
    });
  }

  // Sanitize sensitive data from request body for logging
  const sanitizedBody = sanitizeRequestData(req.body);
  const sanitizedQuery = sanitizeRequestData(req.query);

  // Enhanced logging with structured data
  const logData = {
    level: "error",
    message: error.message,
    requestId,
    error: {
      name: error.name,
      statusCode: error.statusCode,
      stack: error.stack,
      category: error.metadata?.category || "UNKNOWN",
      severity: error.metadata?.severity || "MEDIUM",
      code: error.metadata?.code,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.connection.remoteAddress,
      body: sanitizedBody,
      query: sanitizedQuery,
      params: req.params,
      headers: {
        "content-type": req.headers["content-type"],
        accept: req.headers["accept"],
        origin: req.headers["origin"],
      },
    },
    user: {
      id: (req as any).user?._id,
      email: (req as any).user?.email,
      role: (req as any).user?.role,
    },
    timestamp: new Date().toISOString(),
    context: error.metadata?.context,
  };

  logger.error(logData);

  // Send appropriate response based on environment
  const isDevelopment = process.env.NODE_ENV === "development";

  const errorResponse: any = {
    success: false,
    message: error.message,
    requestId,
  };

  // Include additional error details in development
  if (isDevelopment) {
    errorResponse.error = {
      statusCode: error.statusCode,
      category: error.metadata?.category,
      code: error.metadata?.code,
      stack: error.stack,
    };
  }

  // Include error code for client-side error handling
  if (error.metadata?.code) {
    errorResponse.errorCode = error.metadata.code;
  }

  res.status(error.statusCode).json(errorResponse);
}

/**
 * Sanitize request data to remove sensitive information
 */
function sanitizeRequestData(data: any): any {
  if (!data || typeof data !== "object") return data;

  const sensitiveFields = [
    "password",
    "confirmPassword",
    "currentPassword",
    "newPassword",
    "token",
    "refreshToken",
    "accessToken",
    "apiKey",
    "secret",
    "creditCard",
    "ssn",
    "socialSecurityNumber",
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}
