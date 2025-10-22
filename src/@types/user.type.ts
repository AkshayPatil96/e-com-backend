import { Document, Types } from "mongoose";
import { IImage } from "./common.type";

// Define a string union type for roles
type UserRole = "user" | "admin" | "superadmin" | "seller" | "delivery";

// Address interface for user addresses
export interface IAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  label?: string; // Optional label like "Home", "Work", etc.
  _id?: Types.ObjectId;
}

// types for RecentItems
export interface IRecentItem {
  recentlyViewedProducts: Types.ObjectId[];
  recentlySearchedProducts: Types.ObjectId[];
  recentCategories: Types.ObjectId[];
  recentBrands: Types.ObjectId[];
  recentSearches: string[];
}

// Admin permissions interface for granular access control
export interface IUserPermissions {
  // Brand permissions
  brands: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
    canArchive: boolean;
    canRestore: boolean;
  };

  // Category permissions
  categories: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
    canArchive: boolean;
    canRestore: boolean;
  };

  // Product permissions
  products: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
    canApprove: boolean; // For seller products
    canArchive: boolean;
    canRestore: boolean;
  };

  // User management permissions
  users: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
    canBan: boolean;
    canArchive: boolean;
    canRestore: boolean;
  };

  // Seller management permissions
  sellers: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
    canApprove: boolean; // For seller verification
    canSuspend: boolean;
    canArchive: boolean;
    canRestore: boolean;
  };

  // Order permissions
  orders: {
    canView: boolean;
    canEdit: boolean;
    canCancel: boolean;
    canRefund: boolean;
    canArchive: boolean;
    canRestore: boolean;
  };

  // Admin management permissions
  admins: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canView: boolean;
    canManagePermissions: boolean;
    canArchive: boolean;
    canRestore: boolean;
  };

  // Reports and analytics
  reports: {
    canView: boolean;
    canExport: boolean;
  };
}

/**
 * IUser interface represents the structure of a user document in MongoDB.
 * It extends the Document interface provided by Mongoose.
 */
export interface IUser extends Document {
  _id: Types.ObjectId; // Unique identifier for the user
  username: string; // Unique username for the user
  password: string; // User's password (hashed for security)
  email: string; // Unique email address for user identification
  emailVerified: boolean; // Flag to indicate if email is verified
  emailVerificationToken?: string; // Token for email verification
  emailVerificationExpires?: Date; // Expiry date for email verification
  firstName: string; // User's first name
  lastName: string; // User's last name
  gender?: "male" | "female"; // Optional gender
  dob?: Date; // Optional date of birth
  addresses?: IAddress[]; // Array of user addresses
  alternatePhone?: string; // Optional alternate phone number
  loginType: "email" | "google" | "facebook"; // Type of login used by the user
  phone?: string; // Optional phone number of the user
  role: UserRole; // Role of the user, default is 'user'
  profileImage?: IImage; // Profile image of the user
  recentItems?: IRecentItem; // Recent items for the user
  resetPasswordToken?: string; // Token for resetting the password
  resetPasswordExpires?: Date; // Expiry date for the reset
  isDeleted: boolean; // Flag to indicate if the user is deleted
  status: "active" | "inactive" | "hold" | "blocked" | "suspended" | "pending"; // Status of the user
  lastLogin?: Date; // Last login date of the user
  isTempPassword?: boolean; // Indicates if password is temporary
  permissions?: IUserPermissions; // Granular permissions for admins
  createdAt: Date; // Document creation date
  updatedAt: Date; // Document last update date

  // Virtual properties
  name: string; // Full name (firstName + lastName)
  age?: number; // Calculated age from DOB

  // methods
  comparePassword(enteredPassword: string): Promise<boolean>;
  signAccessToken(): string;
  signRefreshToken(): string;
  softDelete(): Promise<void>;
  restore(): Promise<void>;
}

export interface IRegisterUserBody {
  email: string; // Required: Primary identifier
  password: string; // Required: Authentication
  firstName: string; // Required: Basic profile info
  lastName: string; // Required: Basic profile info
  phone?: string; // Optional: Can be added later
  // Removed optional fields that can be added in profile update:
  // username - auto-generated from email
  // gender, dob, addresses - can be added later via profile update
}

export interface ILoginUserBody {
  email: string;
  password: string;
}

// Additional interfaces for better type safety
export interface IUpdateUserBody {
  username?: string;
  firstName?: string;
  lastName?: string;
  gender?: "male" | "female";
  dob?: string;
  phone?: string;
  alternatePhone?: string;
}

export interface IChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface IForgotPasswordBody {
  email: string;
}

export interface IResetPasswordBody {
  token: string;
  newPassword: string;
}

export interface IUserSearchItem {
  _id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
}

export interface IUserSearchResponse {
  results: IUserSearchItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    hasMore: boolean;
  };
}
