import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { loggerHelpers } from "../utils/logger";

// In-memory fallback storage when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Enhanced rate limiting with memory storage (Redis will be added later)
 */
export class RateLimiter {
  /**
   * Get client identifier (IP + User ID if available)
   */
  private static getClientId(req: Request): string {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const userId = (req as any).user?._id;
    return userId ? `${ip}:${userId}` : ip;
  }

  /**
   * Get rate limit data from memory
   */
  private static getRateLimitData(key: string): number {
    const now = Date.now();
    const stored = memoryStore.get(key);

    if (!stored || now > stored.resetTime) {
      return 0;
    }

    return stored.count;
  }

  /**
   * Set rate limit data in memory
   */
  private static setRateLimitData(
    key: string,
    count: number,
    windowMs: number,
  ): void {
    const resetTime = Date.now() + windowMs;
    memoryStore.set(key, { count, resetTime });

    // Clean up expired entries periodically
    this.cleanupMemoryStore();
  }

  /**
   * Clean up expired entries from memory store
   */
  private static cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, value] of memoryStore.entries()) {
      if (now > value.resetTime) {
        memoryStore.delete(key);
      }
    }
  }

  /**
   * Create rate limiter for authentication endpoints
   */
  static authLimiter(
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000,
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientId = this.getClientId(req);
        const key = `auth_limit:${clientId}`;

        const currentAttempts = this.getRateLimitData(key);

        if (currentAttempts >= maxAttempts) {
          loggerHelpers.security("Auth rate limit exceeded", "HIGH", {
            clientId,
            endpoint: req.originalUrl,
            attempts: currentAttempts,
            maxAttempts,
          });

          throw ErrorHandler.rateLimit(
            `Too many authentication attempts. Try again in ${Math.ceil(windowMs / 60000)} minutes.`,
          );
        }

        // Increment counter
        this.setRateLimitData(key, currentAttempts + 1, windowMs);

        // Add remaining attempts to response headers
        res.set("X-RateLimit-Limit", maxAttempts.toString());
        res.set(
          "X-RateLimit-Remaining",
          (maxAttempts - currentAttempts - 1).toString(),
        );
        res.set(
          "X-RateLimit-Reset",
          new Date(Date.now() + windowMs).toISOString(),
        );

        next();
      } catch (error) {
        if (error instanceof ErrorHandler) {
          next(error);
        } else {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          loggerHelpers.security("Rate limiter error", "HIGH", {
            error: errorMessage,
          });
          next(); // Continue without rate limiting if there's an unexpected error
        }
      }
    };
  }

  /**
   * Create rate limiter for general API endpoints
   */
  static apiLimiter(maxRequests: number = 100, windowMs: number = 60 * 1000) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientId = this.getClientId(req);
        const key = `api_limit:${clientId}`;

        const currentRequests = this.getRateLimitData(key);

        if (currentRequests >= maxRequests) {
          loggerHelpers.security("API rate limit exceeded", "MEDIUM", {
            clientId,
            endpoint: req.originalUrl,
            requests: currentRequests,
            maxRequests,
          });

          throw ErrorHandler.rateLimit(
            `API rate limit exceeded. Try again in ${Math.ceil(windowMs / 60000)} minutes.`,
          );
        }

        // Increment counter
        this.setRateLimitData(key, currentRequests + 1, windowMs);

        // Add rate limit headers
        res.set("X-RateLimit-Limit", maxRequests.toString());
        res.set(
          "X-RateLimit-Remaining",
          (maxRequests - currentRequests - 1).toString(),
        );
        res.set(
          "X-RateLimit-Reset",
          new Date(Date.now() + windowMs).toISOString(),
        );

        next();
      } catch (error) {
        if (error instanceof ErrorHandler) {
          next(error);
        } else {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          loggerHelpers.security("Rate limiter error", "MEDIUM", {
            error: errorMessage,
          });
          next(); // Continue without rate limiting if there's an unexpected error
        }
      }
    };
  }

  /**
   * Clear rate limit for a client (useful for successful operations)
   */
  static clearLimit(req: Request, type: "auth" | "api"): void {
    try {
      const clientId = this.getClientId(req);
      const key = `${type}_limit:${clientId}`;
      memoryStore.delete(key);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      loggerHelpers.security("Failed to clear rate limit", "LOW", {
        error: errorMessage,
        type,
        clientId: this.getClientId(req),
      });
    }
  }

  /**
   * Get rate limiting statistics
   */
  static getStats(): { memoryStoreSize: number } {
    return {
      memoryStoreSize: memoryStore.size,
    };
  }
}

export default RateLimiter;
