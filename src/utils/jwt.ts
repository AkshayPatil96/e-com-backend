import jwt from "jsonwebtoken";
import { IUser } from "../@types/user.type";
import config from "../config";
import { Response } from "express";
import { redis } from "../server";

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
  const decoded = jwt.verify(token, config.JWT_SECRET!) as any;
  return decoded;
};

export const accessTokenExpire = parseInt("5", 10);
export const refreshTokenExpire = parseInt("7", 10);

export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};
export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "lax",
};

export const signAccessToken = (user: IUser): string => {
  return jwt.sign({ id: user._id }, config.JWT_ACCESS_SECRET!, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

export const signRefreshToken = (user: IUser): string => {
  return jwt.sign({ id: user._id }, config.JWT_REFRESH_SECRET!, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token: string): any => {
  return jwt.verify(token, config.JWT_ACCESS_SECRET!);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET!);
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();

  // upload session to redis
  redis.set(user._id.toString(), JSON.stringify(user));

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
    refreshTokenOptions.secure = true;
  }

  res.cookie("accessToken", accessToken, accessTokenOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    data: user,
    accessToken,
    refreshToken,
  });
};
