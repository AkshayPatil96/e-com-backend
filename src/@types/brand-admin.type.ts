import { Document, ObjectId } from "mongoose";

/**
 * Brand SEO interface
 */
export interface IBrandSEO {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

/**
 * Brand analytics interface
 */
export interface IBrandAnalytics {
  productCount: number;
  totalSales: number;
  viewCount: number;
  rating: number;
  reviewCount: number;
  monthlyViews: number;
  conversionRate: number;
}

/**
 * Brand social media interface
 */
export interface IBrandSocialMedia {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
}

/**
 * Brand business info interface
 */
export interface IBrandBusinessInfo {
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  registrationNumber?: string;
  taxId?: string;
}

/**
 * Core Brand interface extending Document
 */
export interface IBrand extends Document {
  _id: ObjectId;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  logo?: string;
  banner?: string;

  // Business Information
  businessInfo?: IBrandBusinessInfo;

  // Social Media & Web Presence
  socialMedia?: IBrandSocialMedia;

  // SEO
  seo?: IBrandSEO;

  // Display & Status
  isActive: boolean;
  isFeatured: boolean;
  showInMenu: boolean;
  showInHomepage: boolean;
  order: number;

  // Analytics (auto-populated)
  analytics: IBrandAnalytics;

  // Soft delete
  isDeleted: boolean;

  // Audit fields
  createdBy: ObjectId;
  updatedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Admin create brand request body
 */
export interface ICreateBrandAdminBody {
  name: string;
  description: string;
  shortDescription?: string;
  categories?: string[];
  logo?: string;
  banner?: string;
  businessInfo?: IBrandBusinessInfo;
  socialMedia?: IBrandSocialMedia;
  seo?: IBrandSEO;
  order?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  showInMenu?: boolean;
  showInHomepage?: boolean;
}

/**
 * Admin update brand request body
 */
export interface IUpdateBrandAdminBody extends Partial<ICreateBrandAdminBody> {
  slug?: string;
}

/**
 * Brand admin filters for listing
 */
export interface IBrandAdminFilters {
  page: number;
  limit: number;
  search: string;
  status: "all" | "active" | "inactive";
  featured: "all" | "featured" | "not-featured";
  isDeleted: boolean;
  sortBy: "name" | "createdAt" | "order" | "productCount" | "viewCount";
  sortOrder: "asc" | "desc";
  showInMenu?: boolean;
  showInHomepage?: boolean;
}

/**
 * Brand admin list item response
 */
export interface IBrandAdminItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  logo?: string;
  banner?: string;
  businessInfo?: IBrandBusinessInfo;
  socialMedia?: IBrandSocialMedia;
  seo?: IBrandSEO;
  isActive: boolean;
  isFeatured: boolean;
  showInMenu: boolean;
  showInHomepage: boolean;
  order: number;
  analytics: IBrandAnalytics;
  isDeleted: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;

  // Enhanced fields for admin
  createdByName?: string;
  updatedByName?: string;
}

/**
 * Brand admin list response with pagination
 */
export interface IBrandAdminListResponse {
  data: IBrandAdminItem[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  statistics?: IBrandStatistics;
}

/**
 * Brand statistics for admin dashboard
 */
export interface IBrandStatistics {
  totalBrands: number;
  activeBrands: number;
  inactiveBrands: number;
  featuredBrands: number;
  deletedBrands: number;
  brandsWithMostProducts: Array<{
    _id: string;
    name: string;
    productCount: number;
  }>;
  averageProductsPerBrand: number;
  brandsWithoutProducts: number;
  topPerformingBrands: Array<{
    _id: string;
    name: string;
    viewCount: number;
    productCount: number;
  }>;
}

/**
 * Brand hierarchy item for admin
 */
export interface IBrandHierarchyAdminItem {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  showInMenu: boolean;
  productCount: number;
  order: number;
}

/**
 * Bulk actions interface
 */
export interface IBrandBulkActionBody {
  brandIds: string[];
  action:
    | "activate"
    | "deactivate"
    | "delete"
    | "restore"
    | "feature"
    | "unfeature";
}

/**
 * Brand search result item
 */
export interface IBrandSearchItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logo?: string;
  isActive: boolean;
  isFeatured: boolean;
  productCount: number;
}

/**
 * Brand search response with pagination
 */
export interface IBrandSearchResponse {
  results: IBrandSearchItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
    count: number;
  };
  query: string;
}
