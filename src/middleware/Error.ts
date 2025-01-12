import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import logger from "../utils/logger";
import { IController } from "../@types/common.type";

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

  // Handle specific error cases
  if (error.name === "CastError") {
    const message: string = `Resource not found. Invalid: ${error.path}`;
    error = new ErrorHandler(400, message);
  } else if (error.code === 11000) {
    const message: string = `Duplicate key error: ${Object.keys(error.keyValue).join(", ")}`;
    error = new ErrorHandler(400, message);
  } else if (error.name === "ValidationError") {
    const message: string = Object.values(error.errors)
      .map((value: any) => value.message)
      .join(", ");
    error = new ErrorHandler(400, message);
  } else if (error.name === "JsonWebTokenError") {
    const message: string = "JSON Web Token is invalid. Please try again.";
    error = new ErrorHandler(401, message);
  } else if (error.name === "TokenExpiredError") {
    const message: string = "JSON Web Token has expired. Please try again.";
    error = new ErrorHandler(401, message);
  }

  // Log the error details
  logger.log({
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
