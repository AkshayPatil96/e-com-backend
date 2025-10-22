/**
 * @fileoverview Hybrid Authentication Middleware System
 *
 * This module provides a comprehensive authentication system that supports both
 * cookie-based (web applications) and Authorization header (API/mobile) authentication.
 *
 * AUTHENTICATION METHODS:
 * 1. Header Authentication (Priority 1):
 *    - Authorization: Bearer <token>
 *    - Preferred for API clients, mobile apps
 *    - More secure for cross-origin requests
 *
 * 2. Cookie Authentication (Priority 2):
 *    - httpOnly cookies with accessToken
 *    - Preferred for web applications
 *    - Automatic handling by browsers
 *
 * MIDDLEWARE VARIANTS:
 * - isAuthenticated: Flexible hybrid auth (header priority, cookie fallback)
 * - requireApiAuth: Strict header-only authentication
 * - requireWebAuth: Strict cookie-only authentication
 * - optionalAuth: Non-blocking auth attempt
 * - requireStrictAuth: Enhanced security checks (verification, token age)
 * - authorizeRoles: Role-based access control
 *
 * SECURITY FEATURES:
 * - Comprehensive security logging
 * - Redis caching with database fallback
 * - Account status validation
 * - Token expiration checks
 * - Rate limiting integration
 * - Request correlation tracking
 *
 * USAGE EXAMPLES:
 * - API routes: requireApiAuth, authorizeRoles('admin')
 * - Web routes: requireWebAuth, authorizeRoles('user')
 * - Public routes: optionalAuth (user context if available)
 * - Sensitive operations: requireStrictAuth, authorizeRoles('admin')
 *
 * @author E-commerce API Team
 * @version 2.0.0
 */

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../model/user.model";
import { redis } from "../server";
import ErrorHandler, {
  ErrorCategory,
  ErrorSeverity,
} from "../utils/ErrorHandler";
import { verifyAccessToken } from "../utils/jwt";
import { loggerHelpers } from "../utils/logger";
import { CatchAsyncErrors } from "./catchAsyncErrors";

interface AuthenticatedRequest extends Request {
  user?: any;
  authMethod?: "cookie" | "header";
  tokenInfo?: {
    type: string;
    expiresAt: Date;
    issuedAt: Date;
  };
}

/**
 * Main hybrid authentication middleware
 *
 * Supports both cookie and Authorization header authentication with priority system:
 * 1. Authorization header (Bearer token) - Priority 1
 * 2. Cookie-based authentication - Priority 2 (fallback)
 *
 * Features:
 * - Redis caching with database fallback
 * - Comprehensive security logging
 * - Account status validation
 * - Token verification and expiration checks
 * - Method detection and logging
 *
 * @param req - Express request object (enhanced with AuthenticatedRequest)
 * @param res - Express response object
 * @param next - Express next function
 */
export const isAuthenticated = CatchAsyncErrors(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let accessToken: string | undefined;
    let authMethod: "cookie" | "header" | undefined;

    // Priority 1: Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log("accessToken:======================> ", accessToken);
      authMethod = "header";

      // Only log auth attempts in development or for monitoring
      if (process.env.NODE_ENV !== "production") {
        loggerHelpers.auth("auth_attempt", undefined, {
          method: "header",
          ip: req.ip,
          endpoint: req.originalUrl,
        });
      }
    }

    // Priority 2: Check cookies (fallback)
    else if (req.cookies.accessToken) {
      accessToken = req.cookies.accessToken;
      authMethod = "cookie";

      if (process.env.NODE_ENV !== "production") {
        loggerHelpers.auth("auth_attempt", undefined, {
          method: "cookie",
          ip: req.ip,
          endpoint: req.originalUrl,
        });
      }
    }

    // No token found in either method - always log security events
    if (!accessToken) {
      loggerHelpers.security("auth_no_token", "MEDIUM", {
        ip: req.ip,
        endpoint: req.originalUrl,
        userAgent: req.get("User-Agent"),
        authMethods: ["cookie", "header"],
      });

      return next(
        ErrorHandler.authentication(
          "Access denied. Please login to access this resource",
        ),
      );
    }

    try {
      // Verify the access token
      const decoded: any = verifyAccessToken(accessToken);

      if (!decoded || !decoded.id) {
        // Always log invalid tokens (security concern)
        loggerHelpers.security("auth_invalid_token", "HIGH", {
          method: authMethod,
          ip: req.ip,
          endpoint: req.originalUrl,
          tokenHint: accessToken.substring(0, 10) + "***",
        });

        return next(
          ErrorHandler.authentication(
            "Invalid or expired token. Please login again",
          ),
        );
      }

      // Try to get user from Redis cache first
      let user: any = null;
      let fromCache = false;

      try {
        if (redis && redis.status === "ready") {
          const cachedUser = await redis.get(decoded.id);
          if (cachedUser) {
            user = JSON.parse(cachedUser);
            fromCache = true;
          }
        }
      } catch (redisError) {
        // Only log Redis errors in development or if critical
        if (process.env.NODE_ENV !== "production") {
          loggerHelpers.system("redis_auth_error", {
            userId: decoded.id,
            error: (redisError as Error).message,
          });
        }
      }

      // Fallback to database if not in cache
      if (!user) {
        const startTime = Date.now();
        user = await User.findActiveOne({ _id: decoded.id }).select(
          "-password",
        );

        // Log slow database queries
        loggerHelpers.performance("user_lookup", Date.now() - startTime, {
          userId: decoded.id,
          fromCache: false,
        });

        if (!user) {
          loggerHelpers.security("auth_user_not_found", "HIGH", {
            userId: decoded.id,
            method: authMethod,
            ip: req.ip,
          });

          return next(
            ErrorHandler.authentication("User not found. Please login again"),
          );
        }

        // Cache user for future requests (don't log caching operations)
        try {
          if (redis && redis.status === "ready") {
            await redis.setex(decoded.id, 3600, JSON.stringify(user)); // 1 hour cache
          }
        } catch (redisError) {
          // Silent fail for caching errors
        }
      }

      // Check if user account is still active
      if (user.status !== "active") {
        loggerHelpers.security("auth_inactive_user", "HIGH", {
          userId: user._id.toString(),
          status: user.status,
          method: authMethod,
          ip: req.ip,
        });

        return next(
          ErrorHandler.authorization(
            `Account is ${user.status}. Please contact support`,
          ),
        );
      }

      // Successful authentication - attach user and metadata to request
      req.user = user;
      req.authMethod = authMethod;
      req.tokenInfo = {
        type: "access",
        expiresAt: new Date(decoded.exp * 1000),
        issuedAt: new Date(decoded.iat * 1000),
      };

      // Log successful authentication
      // Only log successful auth in development or for first-time logins
      if (process.env.NODE_ENV !== "production" || !fromCache) {
        loggerHelpers.auth("auth_success", user._id.toString(), {
          method: authMethod,
          fromCache,
          ip: req.ip,
          endpoint: req.originalUrl,
        });
      }

      next();
    } catch (error: any) {
      // Always log authentication errors
      loggerHelpers.security("auth_error", "HIGH", {
        method: authMethod,
        error: error.message,
        ip: req.ip,
        endpoint: req.originalUrl,
      });

      return next(
        ErrorHandler.authentication(
          "Authentication failed. Please login again",
        ),
      );
    }
  },
);

/**
 * Enhanced role-based authorization middleware
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return CatchAsyncErrors(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        loggerHelpers.security("auth_no_user", "HIGH", {
          ip: req.ip,
          endpoint: req.originalUrl,
          requiredRoles: allowedRoles,
        });

        return next(
          ErrorHandler.authentication(
            "Authentication required to access this resource",
          ),
        );
      }

      const userRole = req.user.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        loggerHelpers.security("auth_insufficient_role", "HIGH", {
          userId: req.user._id?.toString(),
          userRole,
          requiredRoles: allowedRoles,
          ip: req.ip,
          endpoint: req.originalUrl,
        });

        return next(
          ErrorHandler.authorization(
            `Role (${userRole}) is not allowed to access this resource`,
          ),
        );
      }

      // Log successful role authorization
      loggerHelpers.auth("role_authorized", req.user._id?.toString(), {
        userRole,
        requiredRoles: allowedRoles,
        endpoint: req.originalUrl,
      });

      next();
    },
  );
};

/**
 * Middleware that requires API authentication (header-based)
 */
export const requireApiAuth = CatchAsyncErrors(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      loggerHelpers.security("api_auth_required", "MEDIUM", {
        ip: req.ip,
        endpoint: req.originalUrl,
        userAgent: req.get("User-Agent"),
      });

      return next(
        ErrorHandler.authentication(
          "API authentication required. Please provide valid Authorization header",
        ),
      );
    }

    // Use the main authentication middleware
    await isAuthenticated(req, res, (error) => {
      if (error) return next(error);

      // Ensure it was authenticated via header
      if (req.authMethod !== "header") {
        loggerHelpers.security("api_auth_method_mismatch", "MEDIUM", {
          userId: req.user?._id?.toString(),
          expectedMethod: "header",
          actualMethod: req.authMethod,
          ip: req.ip,
        });

        return next(
          ErrorHandler.authentication(
            "API authentication required via Authorization header",
          ),
        );
      }

      next();
    });
  },
);

/**
 * Middleware that requires web authentication (cookie-based)
 */
export const requireWebAuth = CatchAsyncErrors(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.cookies.accessToken) {
      loggerHelpers.security("web_auth_required", "MEDIUM", {
        ip: req.ip,
        endpoint: req.originalUrl,
        userAgent: req.get("User-Agent"),
      });

      return next(
        ErrorHandler.authentication(
          "Web authentication required. Please login",
        ),
      );
    }

    // Use the main authentication middleware
    await isAuthenticated(req, res, (error) => {
      if (error) return next(error);

      // Ensure it was authenticated via cookie
      if (req.authMethod !== "cookie") {
        loggerHelpers.security("web_auth_method_mismatch", "MEDIUM", {
          userId: req.user?._id?.toString(),
          expectedMethod: "cookie",
          actualMethod: req.authMethod,
          ip: req.ip,
        });

        return next(
          ErrorHandler.authentication(
            "Web authentication required via cookies",
          ),
        );
      }

      next();
    });
  },
);

/**
 * Optional authentication middleware (doesn't fail if no auth provided)
 */
export const optionalAuth = CatchAsyncErrors(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const hasToken =
      (authHeader && authHeader.startsWith("Bearer ")) ||
      req.cookies.accessToken;

    if (!hasToken) {
      // No authentication provided, continue without user
      loggerHelpers.auth("optional_auth_skipped", undefined, {
        ip: req.ip,
        endpoint: req.originalUrl,
      });
      return next();
    }

    // Authentication provided, validate it
    await isAuthenticated(req, res, (error) => {
      if (error) {
        // Log but don't fail for optional auth
        loggerHelpers.auth("optional_auth_failed", undefined, {
          error: error.message,
          ip: req.ip,
          endpoint: req.originalUrl,
        });
      }

      // Continue regardless of auth success/failure for optional auth
      next();
    });
  },
);

/**
 * Strict authentication that requires valid auth and active session
 */
export const requireStrictAuth = CatchAsyncErrors(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // First, ensure authentication
    await isAuthenticated(req, res, async (error) => {
      if (error) return next(error);

      // Additional checks for strict auth
      const user = req.user;

      // Check if account is verified
      if (!user.isVerified) {
        loggerHelpers.security("strict_auth_unverified", "HIGH", {
          userId: user._id.toString(),
          ip: req.ip,
          endpoint: req.originalUrl,
        });

        return next(
          ErrorHandler.authorization(
            "Account verification required for this action",
          ),
        );
      }

      // Check for recent activity (optional - can be configured)
      const tokenAge =
        Date.now() - new Date(req.tokenInfo?.issuedAt || 0).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (tokenAge > maxAge) {
        loggerHelpers.security("strict_auth_token_old", "MEDIUM", {
          userId: user._id.toString(),
          tokenAge,
          maxAge,
          ip: req.ip,
        });

        return next(
          ErrorHandler.authentication(
            "Token too old. Please login again for security",
          ),
        );
      }

      loggerHelpers.auth("strict_auth_success", user._id.toString(), {
        method: req.authMethod,
        tokenAge,
        endpoint: req.originalUrl,
      });

      next();
    });
  },
);
