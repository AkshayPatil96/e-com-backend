import { Document, Types } from "mongoose";
import { IImage } from "./common.type";

// Define a string union type for roles
type UserRole = "user" | "admin" | "super admin" | "seller" | "delivery";

// types for RecentItems
export interface IRecentItem {
  recentlyViewedProducts: Types.ObjectId[];
  recentlySearchedProducts: Types.ObjectId[];
  recentCategories: Types.ObjectId[];
  recentBrands: Types.ObjectId[];
  recentSearches: string[];
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
  firstName: string; // User's first name
  lastName: string; // User's last name
  gender: "male" | "female"; // Optional
  dob: Date; // Date of birth
  addresses?: {
    // Array of user addresses
    street: string; // Street address
    city: string; // City
    state: string; // State
    country: string; // Country
    postalCode: string; // Postal code
    isDefault: boolean; // Flag to indicate if it's the default address
  }[];
  alternatePhone?: string; // Optional alternate phone number
  loginType: "email" | "google" | "facebook"; // Type of login used by the user
  phone?: string; // Optional phone number of the user
  role: UserRole; // Role of the user, default is 'user'
  profileImage?: IImage; // Profile image of the user
  recentItems: IRecentItem; // Recent items for the user
  resetPasswordToken?: string; // Token for resetting the password
  resetPasswordExpires?: Date; // Expiry date for the reset
  isDeleted: boolean; // Flag to indicate if the user is deleted
  status: "active" | "inactive" | "hold" | "blocked" | "suspended" | "pending"; // Status of the user
  lastLogin?: Date; // Last login date of the user

  // methods
  comparePassword(enteredPassword: string): Promise<boolean>;
  signAccessToken(): string;
  signRefreshToken(): string;
  softDelete(): Promise<void>;
  restore(): Promise<void>;
}

export interface IRegisterUserBody {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
}

export interface ILoginUserBody {
  email: string;
  password: string;
}
