import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { loggerHelpers } from "../utils/logger";

/**
 * Request correlation middleware for tracking requests across services
 */
export const requestCorrelation = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Generate or use existing request ID
  const requestId =
    (req.headers["x-request-id"] as string) ||
    (req.headers["x-correlation-id"] as string) ||
    uuidv4();

  // Add request ID to request object
  (req as any).requestId = requestId;

  // Add to response headers
  res.set("X-Request-ID", requestId);
  res.set("X-Correlation-ID", requestId);

  // Track request start time for performance monitoring
  const startTime = Date.now();
  (req as any).startTime = startTime;

  // Log incoming request
  loggerHelpers.request(
    req.method,
    req.originalUrl,
    0,
    0,
    (req as any).user?._id,
  );

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  (res as any).end = function (...args: any[]) {
    const duration = Date.now() - startTime;

    // Log completed request
    loggerHelpers.request(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      (req as any).user?._id,
    );

    // Performance warning for slow requests
    if (duration > 5000) {
      loggerHelpers.performance("slow_request", duration, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        requestId,
      });
    }

    return originalEnd(...args);
  };

  next();
};

export default requestCorrelation;
