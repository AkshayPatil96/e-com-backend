import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncErrors } from "./catchAsyncErrors";
import { redis } from "../server";
import { verifyAccessToken } from "../utils/jwt";

export const isAuthenticated = CatchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.cookies.accessToken;
    if (!accessToken)
      return next(
        new ErrorHandler(
          400,
          "Please login to access this resource (no access token provided)",
        ),
      );

    const decoded: any = verifyAccessToken(accessToken);
    if (!decoded)
      return next(
        new ErrorHandler(401, "Please login to access this resource"),
      );

    let user = await redis.get(decoded.id);
    if (!user)
      return next(
        new ErrorHandler(401, "Please login to access this resource"),
      );
    user = JSON.parse(user);
    req.user = user;

    next();
  },
);

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req?.user) {
      
    }

    const userRole = req?.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return next({
        message: `Role (${userRole}) is not allowed to access this resource`,
        status: 403, // Forbidden
      });
    }

    next();
  };
};
