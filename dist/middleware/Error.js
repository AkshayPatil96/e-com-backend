"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ErrorMiddleware;
const ErrorHandler_1 = __importStar(require("../utils/ErrorHandler"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Middleware for handling errors in Express applications.
 * This middleware captures errors and formats the response.
 * @param error - The error object.
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @param next - The next middleware function.
 */
function ErrorMiddleware(error, req, res, next) {
    error.statusCode = error.statusCode || 500; // Default to 500 Internal Server Error
    error.message = error.message || "Internal server error"; // Default message
    // Get or generate request ID for correlation
    const requestId = error.requestId ||
        req.headers["x-request-id"] ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Handle specific error cases
    if (error.name === "CastError") {
        const message = `Resource not found. Invalid: ${error.path}`;
        error = new ErrorHandler_1.default(400, message, {
            category: ErrorHandler_1.ErrorCategory.VALIDATION,
            context: { path: error.path, value: error.value },
        });
    }
    else if (error.code === 11000) {
        const duplicateFields = Object.keys(error.keyValue || {});
        const message = `Duplicate key error: ${duplicateFields.join(", ")}`;
        error = new ErrorHandler_1.default(400, message, {
            category: ErrorHandler_1.ErrorCategory.VALIDATION,
            context: { duplicateFields, values: error.keyValue },
        });
    }
    else if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors || {}).map((value) => ({
            field: value.path,
            message: value.message,
            value: value.value,
        }));
        const message = validationErrors
            .map((err) => err.message)
            .join(", ");
        error = new ErrorHandler_1.default(400, message, {
            category: ErrorHandler_1.ErrorCategory.VALIDATION,
            context: { validationErrors },
        });
    }
    else if (error.name === "JsonWebTokenError") {
        const message = "JSON Web Token is invalid. Please try again.";
        error = new ErrorHandler_1.default(401, message, {
            category: ErrorHandler_1.ErrorCategory.AUTHENTICATION,
            severity: ErrorHandler_1.ErrorSeverity.HIGH,
        });
    }
    else if (error.name === "TokenExpiredError") {
        const message = "JSON Web Token has expired. Please try again.";
        error = new ErrorHandler_1.default(401, message, {
            category: ErrorHandler_1.ErrorCategory.AUTHENTICATION,
            severity: ErrorHandler_1.ErrorSeverity.HIGH,
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
            id: req.user?._id,
            email: req.user?.email,
            role: req.user?.role,
        },
        timestamp: new Date().toISOString(),
        context: error.metadata?.context,
    };
    logger_1.default.error(logData);
    // Send appropriate response based on environment
    const isDevelopment = process.env.NODE_ENV === "development";
    const errorResponse = {
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
function sanitizeRequestData(data) {
    if (!data || typeof data !== "object")
        return data;
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
