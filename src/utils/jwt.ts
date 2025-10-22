import { Response } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../@types/user.type";
import config from "../config";
import { redis } from "../server";
import { loggerHelpers } from "./logger";

interface IActivationCode {
  token: string;
  activationCode: string;
}

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "strict" | "lax" | "none" | undefined;
  secure?: boolean;
}

export const createActivationToken = (user: IUser): IActivationCode => {
  const activationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const token = jwt.sign(
    { user: { ...user }, activationCode },
    config.JWT_SECRET!,
    { expiresIn: "10m" },
  );
  return { token, activationCode };
};

export const verifyActivationToken = (token: string): any => {
  return jwt.verify(token, config.JWT_SECRET!);
};

// 🔧 FIXED: Proper token expiration times
export const accessTokenExpire = 15; // 15 minutes (not 5 days!)
export const refreshTokenExpire = 7; // 7 days

// 🔧 FIXED: Consistent token options
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 1000), // 15 minutes
  maxAge: accessTokenExpire * 60 * 1000, // 15 minutes in milliseconds
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000), // 7 days
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

// 🔧 FIXED: Use standalone functions instead of user methods
export const signAccessToken = (user: IUser): string => {
  return jwt.sign({ id: user._id }, config.JWT_ACCESS_SECRET!, {
    expiresIn: `${accessTokenExpire}m`, // 15m
  });
};

export const signRefreshToken = (user: IUser): string => {
  return jwt.sign({ id: user._id }, config.JWT_REFRESH_SECRET!, {
    expiresIn: `${refreshTokenExpire}d`, // 7d
  });
};

export const verifyAccessToken = (token: string): any => {
  return jwt.verify(token, config.JWT_ACCESS_SECRET!);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET!);
};

// 🚀 ENHANCED: Support both cookies AND headers
export const sendToken = async (
  user: IUser,
  statusCode: number,
  res: Response,
) => {
  try {
    // Generate tokens using standalone functions
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Enhanced session data
    const sessionData = {
      ...user?.toObject(),
      sessionCreated: new Date(),
      accessTokenExpiry: new Date(Date.now() + accessTokenExpire * 60 * 1000),
      refreshTokenExpiry: new Date(
        Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000,
      ),
    };

    // Store in Redis with error handling
    try {
      if (redis && redis.status === "ready") {
        await redis.setex(
          user._id.toString(),
          refreshTokenExpire * 24 * 60 * 60, // 7 days in seconds
          JSON.stringify(sessionData),
        );
      }
    } catch (redisError) {
      loggerHelpers.system("redis_session_error", {
        userId: user._id.toString(),
        error: (redisError as Error).message,
      });
      // Continue without failing the login
    }

    // remove password from user object
    if (typeof user === "object") {
      user = user.toObject(); // Convert Mongoose document to plain object if needed
      delete (user as { password?: string }).password;
    }

    // 🍪 Set cookies (for web browsers)
    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);

    // 📋 Return tokens in response (for mobile/API clients)
    res.status(statusCode).json({
      success: true,
      message: "Authentication successful",
      data: user,

      // 🔑 Tokens for header-based auth
      tokens: {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresIn: accessTokenExpire * 60, // seconds
        refreshExpiresIn: refreshTokenExpire * 24 * 60 * 60, // seconds
      },

      // 📱 Auth method instructions
      authMethods: {
        cookie: "Tokens set in httpOnly cookies automatically",
        header: "Use Authorization: Bearer <accessToken> header",
      },
    });
  } catch (error: any) {
    loggerHelpers.error("token_generation_failed", error, {
      userId: user._id?.toString(),
    });
    throw error;
  }
};
