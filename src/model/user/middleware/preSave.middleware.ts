import bcrypt from "bcryptjs";
import { IUser } from "../../../@types/user.type";

/**
 * Pre-save middleware to hash password and set initial seller status
 */
export const preSaveMiddleware = async function (
  this: IUser,
  next: () => void,
) {
  if (!this.isModified("password")) return next();

  // Auto-set seller status to pending
  if (this.isNew && this.role === "seller") this.status = "pending";

  // Hash password
  this.password = await bcrypt.hash(this.password, 12);
  next();
};
