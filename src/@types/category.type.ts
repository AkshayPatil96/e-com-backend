import { Document, Types } from "mongoose";
import { IImage, IMetadataSchema } from "./common.type";

// Category attribute interface for structured filtering
export interface ICategoryAttribute {
  name: string;
  type: "select" | "multiselect" | "range" | "text" | "boolean";
  values?: string[]; // For select/multiselect types
  unit?: string; // For range types (e.g., "cm", "kg")
  isRequired?: boolean;
  isFilterable?: boolean;
  displayOrder?: number;
}

// Category SEO interface
export interface ICategorySEO {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: IImage;
}

// Category settings interface
export interface ICategorySettings {
  allowProducts: boolean; // Whether products can be directly added to this category
  requireApproval: boolean; // Whether products need approval before showing
  commissionRate?: number; // Category-specific commission rate
  featuredProductsLimit?: number; // Limit for featured products
  minPriceRange?: number;
  maxPriceRange?: number;
}

// Interface for Category Schema
export interface ICategory extends Document {
  _id: Types.ObjectId;
  order?: number; // Category display order within same level
  name: string; // Category name
  slug: string; // URL-friendly identifier
  parent?: Types.ObjectId | ICategory; // Reference to Parent Category
  ancestors: Types.ObjectId[]; // Array to store all ancestors up to the top-level category
  level: number; // Hierarchy level (0 for root, 1 for first level, etc.)
  path: string; // Full path for breadcrumb navigation (e.g., "Clothing > Men > Shirts")
  materializedPath: string; // Materialized path for efficient queries (e.g., "/1/23/45/")

  // Content and display
  description?: string; // Category description
  shortDescription?: string; // Brief description for cards/listings
  images: IImage[]; // Category images
  banner?: IImage; // Category banner image
  icon?: IImage; // Category icon for navigation

  // Attributes and filtering
  attributes: ICategoryAttribute[]; // Structured category-specific filters
  brands: Types.ObjectId[]; // Array of brand IDs associated with this category

  // SEO and metadata
  metadata: IMetadataSchema; // Common metadata fields
  seo: ICategorySEO; // SEO-specific fields
  searchKeywords: string[]; // Keywords for search enhancement

  // Business settings
  settings: ICategorySettings; // Category-specific business settings

  // Analytics and metrics
  productCount: number; // Number of active products in this category
  totalProductCount: number; // Total products including subcategories
  viewCount: number; // Number of times category was viewed
  averageRating?: number; // Average rating of products in this category

  // Status and flags
  isActive: boolean; // Active/inactive status
  isDeleted: boolean; // Soft delete flag
  isFeatured: boolean; // Featured category flag
  isPopular: boolean; // Popular category flag
  showInMenu: boolean; // Whether to show in main navigation
  showInHomepage: boolean; // Whether to show on homepage

  // Timestamps and tracking
  createdBy: Types.ObjectId; // Reference to User model
  updatedBy: Types.ObjectId; // Reference to User model
  createdAt: Date;
  updatedAt: Date;

  // methods
  softDelete(): Promise<void>;
  restore(): Promise<void>;
  updateProductCount(): Promise<void>;
  getChildren(): Promise<ICategory[]>;
  getFullHierarchy(): Promise<ICategory[]>;
  isLeafCategory(): Promise<boolean>;
}

// Additional interfaces for API requests
export interface ICreateCategoryBody {
  name: string;
  description?: string;
  shortDescription?: string;
  parent?: string; // Parent category ID
  attributes?: ICategoryAttribute[];
  searchKeywords?: string[];
  settings?: Partial<ICategorySettings>;
  seo?: Partial<ICategorySEO>;
  isFeatured?: boolean;
  showInMenu?: boolean;
  showInHomepage?: boolean;
}

export interface IUpdateCategoryBody {
  name?: string;
  description?: string;
  shortDescription?: string;
  parent?: string;
  attributes?: ICategoryAttribute[];
  searchKeywords?: string[];
  settings?: Partial<ICategorySettings>;
  seo?: Partial<ICategorySEO>;
  isFeatured?: boolean;
  isActive?: boolean;
  showInMenu?: boolean;
  showInHomepage?: boolean;
  order?: number;
}

export interface ICategoryHierarchyResponse {
  _id: string;
  name: string;
  slug: string;
  level: number;
  productCount: number;
  children?: ICategoryHierarchyResponse[];
}

export interface ICategoryFilter {
  level?: number;
  parent?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  showInMenu?: boolean;
  search?: string;
}
