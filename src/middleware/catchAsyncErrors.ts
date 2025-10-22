import { NextFunction, Request, Response } from "express";
import { IController } from "../@types/common.type";

/**
 * Enhanced async error handler with proper TypeScript generics
 * Automatically catches and forwards async errors to error middleware
 * @param fn - Async controller function
 * @returns Express middleware function
 */
export const CatchAsyncErrors =
  <T extends Request = Request, U extends Response = Response>(
    fn: (req: T, res: U, next: NextFunction) => Promise<void | U>,
  ) =>
  (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error: Error) => {
      // Add request context to error for better debugging
      if (error && typeof error === "object") {
        (error as any).requestId =
          req.headers["x-request-id"] ||
          `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        (error as any).endpoint = `${req.method} ${req.originalUrl}`;
        (error as any).userAgent = req.headers["user-agent"];
        (error as any).ip = req.ip || req.connection.remoteAddress;
      }
      next(error);
    });
  };
