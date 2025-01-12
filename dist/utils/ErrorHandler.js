"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Custom Error Handler class that extends the built-in Error class.
 */
class ErrorHandler extends Error {
    /**
     * Initializes a new instance of the ErrorHandler class.
     * @param statusCode - HTTP status code for the error.
     * @param message - Error message (defaults to "An error occurred" if not provided).
     */
    constructor(statusCode, message = "An error occurred") {
        super(message);
        this.statusCode = statusCode;
        // Captures the stack trace for better debugging
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.default = ErrorHandler;
