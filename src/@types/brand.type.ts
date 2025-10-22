import { Document, Types } from "mongoose";
import { IImage } from "./common.type";

// Brand SEO interface
export interface IBrandSEO {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: IImage;
}

// Brand social media interface
export interface IBrandSocialMedia {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

// Brand analytics interface
export interface IBrandAnalytics {
  productCount: number;
  totalSales: number;
  averageRating: number;
  totalRatings: number;
  viewCount: number;
  searchCount: number;
  conversionRate: number;
}

// Brand business information interface
export interface IBrandBusinessInfo {
  foundingYear?: number;
  originCountry?: string;
  headquarters?: string;
  parentCompany?: string;
  legalName?: string;
  registrationNumber?: string;
  taxId?: string;
}

export interface IBrand extends Document {
  _id: Types.ObjectId;
  name: string; // Brand name
  slug: string; // URL-friendly identifier
  description?: string; // Brand description
  shortDescription?: string; // Brief description for cards/listings

  // Visual assets
  logo?: IImage; // Primary brand logo
  banner?: IImage; // Brand banner image
  images?: IImage[]; // Additional brand images

  // Business information
  businessInfo: IBrandBusinessInfo; // Company details
  socialMedia: IBrandSocialMedia; // Social media links

  // SEO and metadata
  seo: IBrandSEO; // SEO-specific fields
  searchKeywords: string[]; // Keywords for search enhancement

  // Relationships
  categories: Types.ObjectId[]; // Associated categories
  parent?: Types.ObjectId; // Parent brand (for brand families)

  // Analytics and metrics
  analytics: IBrandAnalytics; // Brand performance metrics

  // Status and flags
  isActive: boolean; // Active/inactive status
  isVerified: boolean; // Verified brand status
  isDeleted: boolean; // Soft delete flag
  isFeatured: boolean; // Featured brand flag
  isPopular: boolean; // Popular brand flag
  isPremium: boolean; // Premium brand flag

  // Display settings
  showInHomepage: boolean; // Whether to show on homepage
  displayOrder?: number; // Display order in listings

  // Timestamps and tracking
  createdBy: Types.ObjectId; // Reference to User model
  updatedBy: Types.ObjectId; // Reference to User model
  createdAt: Date;
  updatedAt: Date;

  // methods
  softDelete(): Promise<void>;
  restore(): Promise<void>;
  updateAnalytics(): Promise<void>;
  addToCategory(categoryId: string): Promise<void>;
  removeFromCategory(categoryId: string): Promise<void>;
}

// Additional interfaces for API requests
export interface ICreateBrandBody {
  name: string;
  description?: string;
  shortDescription?: string;
  categories: string[];
  businessInfo?: Partial<IBrandBusinessInfo>;
  socialMedia?: Partial<IBrandSocialMedia>;
  seo?: Partial<IBrandSEO>;
  searchKeywords?: string[];
  parent?: string; // Parent brand ID
  isFeatured?: boolean;
  isPremium?: boolean;
  showInHomepage?: boolean;
}

export interface IUpdateBrandBody {
  name?: string;
  description?: string;
  shortDescription?: string;
  categories?: string[];
  businessInfo?: Partial<IBrandBusinessInfo>;
  socialMedia?: Partial<IBrandSocialMedia>;
  seo?: Partial<IBrandSEO>;
  searchKeywords?: string[];
  parent?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isPremium?: boolean;
  showInHomepage?: boolean;
  displayOrder?: number;
}

export interface IBrandFilter {
  category?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  originCountry?: string;
  search?: string;
  minProductCount?: number;
  minRating?: number;
}

export interface IBrandResponse {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: IImage;
  analytics: IBrandAnalytics;
  isVerified: boolean;
  isFeatured: boolean;
  isPremium: boolean;
}
