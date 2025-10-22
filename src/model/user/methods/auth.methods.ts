import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../../../config/index";

/**
 * Method to compare the entered password with the hashed password in the database.
 * It returns a boolean value indicating whether the passwords match.
 */
export function comparePassword(
  this: any,
  enteredPassword: string,
): Promise<boolean> {
  return bcrypt.compare(enteredPassword, this.password);
}

/**
 * Method to sign the access token for the user.
 * It returns a JWT access token string.
 */
export function signAccessToken(this: any): string {
  return jwt.sign({ id: this._id }, config.JWT_ACCESS_SECRET!, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

/**
 * Method to sign the refresh token for the user.
 * It returns a JWT refresh token string.
 */
export function signRefreshToken(this: any): string {
  return jwt.sign({ id: this._id }, config.JWT_REFRESH_SECRET!, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
}
