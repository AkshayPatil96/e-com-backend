import mongoose, { Model, model, Schema } from "mongoose";
import validator from "validator";
import { IUser } from "../../@types/user.type";
import { ImageSchema } from "../schema/common.model";

// Import schemas
import { AddressSchema, PermissionsSchema, RecentItemSchema } from "./schemas";

// Import middleware
import { addressValidationMiddleware, preSaveMiddleware } from "./middleware";

// Import methods
import {
  comparePassword,
  findActiveOne,
  findActiveUser,
  findByRole,
  restore,
  signAccessToken,
  signRefreshToken,
  softDelete,
} from "./methods";

// Extend the Mongoose Model interface to include the static methods
interface IUserModel extends Model<IUser> {
  findActiveUser(
    additionalQuery?: Record<string, any>,
  ): mongoose.Query<IUser[], IUser>;
  findActiveOne(
    query: Record<string, any>,
  ): mongoose.Query<IUser | null, IUser>;
  findByRole(
    role: string,
    additionalQuery?: Record<string, any>,
  ): mongoose.Query<IUser[], IUser>;
}

/**
 * User schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      validate: {
        validator: function (v: string) {
          return /^[a-zA-Z0-9_.-]+$/.test(v);
        },
        message:
          "Username can only contain letters, numbers, dots, hyphens and underscores",
      },
    },
    password: { type: String, required: true, select: false, minlength: 6 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: validator.default.isEmail,
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
      set: (value: string) =>
        value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
      set: (value: string) =>
        value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      lowercase: true,
    },
    dob: {
      type: Date,
      // validate: {
      //   validator: function (v: Date) {
      //     if (!v) return true; // Optional field
      //     const age = Math.floor(
      //       (Date.now() - v.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      //     );
      //     return age >= 13 && age <= 120; // Age restriction
      //   },
      //   message: "User must be between 13 and 120 years old",
      // },
    },
    profileImage: ImageSchema, // Profile image of the user
    addresses: {
      type: [AddressSchema],
      validate: {
        validator: function (v: any[]) {
          return v.length <= 5; // Limit to 5 addresses
        },
        message: "Maximum 5 addresses allowed",
      },
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Optional field
          return /^\+?[\d\s-()]{10,15}$/.test(v);
        },
        message: "Invalid phone number format",
      },
    },
    alternatePhone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Optional field
          return /^\+?[\d\s-()]{10,15}$/.test(v);
        },
        message: "Invalid alternate phone number format",
      },
    },
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

    resetPasswordToken: { type: String, select: false }, // Token for resetting the password
    resetPasswordExpires: { type: Date, select: false }, // Expiry date for the reset

    recentItems: { type: RecentItemSchema, default: () => ({}) }, // Recent items for the user
    isDeleted: { type: Boolean, default: false }, // Soft delete flag
    lastLogin: { type: Date }, // Last login date
    isTempPassword: { type: Boolean, default: false }, // Indicates if password is temporary
    permissions: {
      type: PermissionsSchema,
      default: () => ({}), // Empty permissions for regular users
    }, // Granular permissions for admins
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for improved query performance and to enforce uniqueness
userSchema.index({ isDeleted: 1, status: 1 });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ loginType: 1 });
userSchema.index({ lastLogin: 1 });
userSchema.index({ createdAt: 1 });

// Compound indexes for common queries
userSchema.index({ role: 1, status: 1, isDeleted: 1 });
userSchema.index({ emailVerified: 1, status: 1 });

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

// Apply middleware
userSchema.pre<IUser>("save", preSaveMiddleware);
userSchema.pre<IUser>("save", addressValidationMiddleware);

// Apply instance methods
userSchema.methods.comparePassword = comparePassword;
userSchema.methods.signAccessToken = signAccessToken;
userSchema.methods.signRefreshToken = signRefreshToken;
userSchema.methods.softDelete = softDelete;
userSchema.methods.restore = restore;

// Apply static methods
userSchema.statics.findActiveUser = findActiveUser;
userSchema.statics.findActiveOne = findActiveOne;
userSchema.statics.findByRole = findByRole;

/**
 * User model for interacting with the user collection in MongoDB.
 * It allows CRUD operations on user documents.
 */
const User: IUserModel = model<IUser, IUserModel>("User", userSchema);

export default User;
