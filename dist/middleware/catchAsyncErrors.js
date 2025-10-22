"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatchAsyncErrors = void 0;
/**
 * Enhanced async error handler with proper TypeScript generics
 * Automatically catches and forwards async errors to error middleware
 * @param fn - Async controller function
 * @returns Express middleware function
 */
const CatchAsyncErrors = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
        // Add request context to error for better debugging
        if (error && typeof error === "object") {
            error.requestId =
                req.headers["x-request-id"] ||
                    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            error.endpoint = `${req.method} ${req.originalUrl}`;
            error.userAgent = req.headers["user-agent"];
            error.ip = req.ip || req.connection.remoteAddress;
        }
        next(error);
    });
};
exports.CatchAsyncErrors = CatchAsyncErrors;
