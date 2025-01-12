import mongoose, { Model, model, Query, Schema } from "mongoose";
import { IRecentItem, IUser } from "../@types/user.type";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/index";
import { ImageSchema } from "./schema/common.model";

// Extend the Mongoose Model interface to include the static methods
interface IUserModel extends Model<IUser> {
  findActiveUser(additionalQuery?: Record<string, any>): Query<IUser[], IUser>;
  findActiveOne(query: Record<string, any>): Query<IUser | null, IUser>;
}

/**
 * Recent item schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const RecentItemSchema = new Schema<IRecentItem>(
  {
    recentlyViewedProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    recentlySearchedProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    recentCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    recentBrands: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
    recentSearches: [{ type: String }],
  },
  { _id: false },
);

/**
 * User schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: validator.default.isEmail,
    },
    firstName: {
      type: String,
      required: true,
      set: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    lastName: {
      type: String,
      required: true,
      set: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    gender: { type: String, enum: ["male", "female"] },
    dob: { type: Date },
    profileImage: ImageSchema, // Profile image of the user
    addresses: [
      {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        postalCode: { type: String, required: true },
        isDefault: { type: Boolean, default: false }, // Default address flag
      },
    ],
    phone: { type: String },
    alternatePhone: { type: String },
    loginType: {
      type: String,
      enum: ["email", "google", "facebook"],
      default: "email",
    }, // Login type
    
    role: {
      type: String,
      enum: ["user", "admin", "superadmin", "seller", "delivery"],
      default: "user",
    }, // Role management
    status: {
      type: String,
      enum: ["active", "inactive", "hold", "blocked", "suspended", "pending"],
      default: "active",
    }, // User account status

    resetPasswordToken: { type: String }, // Token for resetting the password
    resetPasswordExpires: { type: Date }, // Expiry date for the reset
    
    recentItems: RecentItemSchema, // Recent items for the user
    isDeleted: { type: Boolean, default: false }, // Soft delete flag
    lastLogin: { type: Date }, // Last login date
  },
  { timestamps: true },
);

// Indexes for improved query performance and to enforce uniqueness
userSchema.index({
  isDeleted: 1,
  email: 1,
  username: 1,
  phone: 1,
  role: 1,
  status: 1,
});

// Virtual for user's full name
userSchema.virtual("name").get(function (this: {
  firstName: string;
  lastName: string;
}) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for user's age
userSchema.virtual("age").get(function (this: { dob?: Date }) {
  if (!this.dob) return undefined;
  const ageDiff = Date.now() - this.dob.getTime();
  const ageDate = new Date(ageDiff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

/**
 * Middleware to hash the password before saving the user document.
 */
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();

  if (this.isNew && this.role === "seller") this.status = "pending";

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * Method to compare the entered password with the hashed password in the database.
 * It returns a boolean value indicating whether the passwords match.
 */
userSchema.methods.comparePassword = async function (
  enteredPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Method to sign the access token for the user.
 * It returns a JWT access token string.
 */
userSchema.methods.signAccessToken = function (): string {
  return jwt.sign({ id: this._id }, config.JWT_ACCESS_SECRET!, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

/**
 * Method to sign the refresh token for the user.
 * It returns a JWT refresh token string.
 */
userSchema.methods.signRefreshToken = function (): string {
  return jwt.sign({ id: this._id }, config.JWT_REFRESH_SECRET!, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * Soft delete a user by setting isDeleted to true.
 * @returns {Promise<void>}
 */
userSchema.methods.softDelete = async function (): Promise<void> {
  this.isDeleted = true;
  await this.save();
};

/**
 * Restore a soft-deleted user by setting isDeleted to false.
 * @returns {Promise<void>}
 */
userSchema.methods.restore = async function (): Promise<void> {
  this.isDeleted = false;
  await this.save();
};

/**
 * Static method to find all active users based on the query.
 * @param {Record<string, any>} additionalQuery - Additional query parameters
 * @returns {Query<IUser[], IUser>}
 */
userSchema.statics.findActiveUser = function (
  additionalQuery: Record<string, any> = {},
): Query<IUser[], IUser> {
  const query = { isDeleted: false, status: "active", ...additionalQuery };
  return this.find(query);
};

/**
 * Static method to find the first active user based on the query.
 * @param {Record<string, any>} query - Query parameters
 * @returns {Query<IUser | null, IUser>}
 */
userSchema.statics.findActiveOne = function (
  query: Record<string, any>,
): Query<IUser | null, IUser> {
  return this.findOne({ isDeleted: false, status: "active", ...query });
};

/**
 * User model for interacting with the user collection in MongoDB.
 * It allows CRUD operations on user documents.
 */
const User: IUserModel = model<IUser, IUserModel>("User", userSchema);

export default User;
