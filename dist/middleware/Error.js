"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ErrorMiddleware;
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
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
    // Handle specific error cases
    if (error.name === "CastError") {
        const message = `Resource not found. Invalid: ${error.path}`;
        error = new ErrorHandler_1.default(400, message);
    }
    else if (error.code === 11000) {
        const message = `Duplicate key error: ${Object.keys(error.keyValue).join(", ")}`;
        error = new ErrorHandler_1.default(400, message);
    }
    else if (error.name === "ValidationError") {
        const message = Object.values(error.errors)
            .map((value) => value.message)
            .join(", ");
        error = new ErrorHandler_1.default(400, message);
    }
    else if (error.name === "JsonWebTokenError") {
        const message = "JSON Web Token is invalid. Please try again.";
        error = new ErrorHandler_1.default(401, message);
    }
    else if (error.name === "TokenExpiredError") {
        const message = "JSON Web Token has expired. Please try again.";
        error = new ErrorHandler_1.default(401, message);
    }
    // Log the error details
    logger_1.default.log({
        level: "error",
        message: error.message,
        method: req.method,
        statusCode: error.statusCode,
        url: req.url,
        body: req.body,
        query: req.query,
    });
    // Send the formatted error response
    res.status(error.statusCode).json({
        success: false,
        message: error.message,
    });
}
