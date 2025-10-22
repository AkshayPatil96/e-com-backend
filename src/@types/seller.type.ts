import { Document, Types } from "mongoose";
import { IImage, IMetadataSchema } from "./common.type";

// Seller address interface
export interface ISellerAddress {
  type: "business" | "pickup" | "billing" | "return";
  label?: string; // Optional label like "Main Store", "Warehouse", etc.
  firstLine: string;
  secondLine?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  _id?: Types.ObjectId;
}

// Business verification interface
export interface IBusinessVerification {
  businessLicense?: {
    number: string;
    document: IImage;
    verified: boolean;
  };
  taxId?: {
    number: string;
    document: IImage;
    verified: boolean;
  };
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    verified: boolean;
  };
  identityVerification?: {
    document: IImage;
    documentType: "passport" | "license" | "nationalId";
    verified: boolean;
  };
}

// Seller policies interface
export interface ISellerPolicies {
  returnPolicy?: {
    acceptReturns: boolean;
    returnWindow: number; // days
    returnConditions: string;
  };
  shippingPolicy?: {
    processingTime: number; // days
    shippingMethods: string[];
    freeShippingThreshold?: number;
  };
  exchangePolicy?: {
    acceptExchanges: boolean;
    exchangeWindow: number; // days
  };
}

// Seller ratings interface
export interface ISellerRatings {
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * ISeller interface represents the structure of a seller document in MongoDB.
 * It extends the Document interface provided by Mongoose.
 */
export interface ISeller extends Document {
  userId: Types.ObjectId; // Reference to the user who is the seller
  storeName: string; // Name of the seller's store
  slug: string; // Slug for the seller's store URL
  storeDescription?: string; // Description of the store
  categories: Types.ObjectId[]; // Array of category IDs the seller operates in
  contactEmail: string; // Seller's contact email
  phoneNumber?: string; // Seller's contact number
  alternatePhone?: string; // Alternative contact number
  addresses: ISellerAddress[]; // Multiple addresses for different purposes
  status: "active" | "suspended" | "pending" | "rejected" | "inactive"; // Status of the seller account
  metadata: IMetadataSchema; // Metadata for the seller
  image?: IImage; // Profile image of the seller
  banner?: IImage; // Banner image for the seller's store
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };

  // Business-related fields
  businessVerification: IBusinessVerification; // Business verification documents
  commissionRate: number; // Commission rate percentage (0-100)
  isVerified: boolean; // Overall verification status

  // Policies and ratings
  policies: ISellerPolicies; // Return, shipping, and exchange policies
  ratings: ISellerRatings; // Seller ratings and reviews

  // Analytics and metrics
  totalSales: number; // Total sales amount
  totalOrders: number; // Total number of orders
  totalProducts: number; // Total number of active products
  joinedDate: Date; // When the seller joined
  lastActiveDate?: Date; // Last activity date

  // Flags
  isDeleted: boolean; // Flag to indicate if the seller is deleted
  isFeatured: boolean; // Flag for featured sellers
  isTopSeller: boolean; // Flag for top-performing sellers

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // methods
  isActive(): boolean; // Method to check if the seller is active
  softDelete(): Promise<void>; // Method to soft delete the seller
  restore(): Promise<void>; // Method to restore a soft-deleted seller
  updateRating(newRating: number): Promise<void>; // Method to update seller rating
  getDefaultAddress(type?: string): ISellerAddress | null; // Get default address
}

// Additional interfaces for API requests
export interface ICreateSellerBody {
  storeName: string;
  storeDescription?: string;
  categories: string[];
  contactEmail: string;
  phoneNumber?: string;
  address: {
    type: "business";
    firstLine: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface IUpdateSellerBody {
  storeName?: string;
  storeDescription?: string;
  categories?: string[];
  contactEmail?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface ISellerVerificationBody {
  businessLicense?: {
    number: string;
    document: string; // File URL or base64
  };
  taxId?: {
    number: string;
    document: string;
  };
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
  };
}
