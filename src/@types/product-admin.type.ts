import { Types } from "mongoose";
import { IProduct, ProductCondition, ProductStatus } from "./product.type";

/**
 * Product admin filters interface for listing and filtering products
 */
export interface IProductAdminFilters {
  page: number;
  limit: number;
  search: string;
  status: "all" | ProductStatus;
  condition: "all" | ProductCondition;
  category: string | undefined;
  brand: string | undefined;
  seller: string | undefined;
  featured: "all" | "featured" | "not-featured";
  onSale: "all" | "on-sale" | "not-on-sale";
  inStock: "all" | "in-stock" | "out-of-stock" | "low-stock";
  isDeleted: boolean;
  sortBy:
    | "name"
    | "createdAt"
    | "updatedAt"
    | "basePrice"
    | "stockQuantity"
    | "soldQuantity"
    | "averageRating"
    | "viewCount";
  sortOrder: "asc" | "desc";
  minPrice: number | undefined;
  maxPrice: number | undefined;
  minStock: number | undefined;
  maxStock: number | undefined;
  minRating: number | undefined;
  maxRating: number | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

/**
 * Product admin list item interface for admin panel display
 */
export interface IProductAdminItem {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  condition: ProductCondition;
  isFeatured: boolean;
  isOnSale: boolean;
  isDeleted: boolean;
  image?: {
    url: string;
    alt: string;
  };
  brand: {
    _id: string;
    name: string;
    slug: string;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  seller: {
    _id: string;
    storeName: string;
    slug: string;
  };
  pricing: {
    basePrice: number;
    comparePrice?: number;
    currency: string;
  };
  inventory: {
    stockQuantity: number;
    soldQuantity: number;
    reservedQuantity: number;
  };
  reviews: {
    averageRating: number;
    totalReviews: number;
  };
  analytics: {
    viewCount: number;
    wishlistCount: number;
    cartAddCount: number;
    purchaseCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  updatedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Product admin list response interface
 */
export interface IProductAdminListResponse {
  data: IProductAdminItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: IProductAdminFilters;
}

/**
 * Create product admin body interface
 */
export interface ICreateProductAdminBody {
  name: string;
  description: string;
  shortDescription?: string;
  brand: string; // Brand ID
  category: string; // Primary category ID
  categories?: string[]; // Additional category IDs
  variations?: string[]; // Variation IDs
  images?: any[]; // Image objects
  
  // Pricing
  pricing: {
    basePrice: number;
    comparePrice?: number;
    costPrice?: number;
    currency: string;
    taxIncluded: boolean;
    taxRate?: number;
  };
  discount?: number;
  
  // Inventory
  inventory: {
    stockQuantity: number;
    reorderLevel: number;
    maxOrderQuantity?: number;
    trackQuantity: boolean;
    allowBackorder: boolean;
  };
  sku?: string; // Optional - will auto-generate if not provided
  
  // Status and flags
  status: ProductStatus;
  condition: ProductCondition;
  isFeatured?: boolean;
  isOnSale?: boolean;
  
  // Shipping
  shipping: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    shippingClass: string;
    freeShipping: boolean;
    shippingCost?: number;
  };
  
  // Seller
  seller: string; // Seller ID
  manufacturer?: string;
  
  // Additional fields
  tags?: string[];
  attributes?: Record<string, string>;
  
  // SEO
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    focusKeyword?: string;
    canonicalUrl?: string;
  };
  
  // Policies
  warranty?: string;
  returnPolicy?: {
    available: boolean;
    policy?: string;
    days?: number;
  };
  replacementPolicy?: {
    available: boolean;
    policy?: string;
    days?: number;
  };
}

/**
 * Update product admin body interface
 */
export interface IUpdateProductAdminBody {
  name?: string;
  description?: string;
  shortDescription?: string;
  brand?: string;
  category?: string;
  categories?: string[];
  variations?: string[];
  images?: any[];
  
  // Pricing
  pricing?: {
    basePrice: number;
    comparePrice?: number;
    costPrice?: number;
    currency: string;
    taxIncluded: boolean;
    taxRate?: number;
  };
  discount?: number;
  
  // Inventory
  inventory?: {
    stockQuantity: number;
    reorderLevel: number;
    maxOrderQuantity?: number;
    trackQuantity: boolean;
    allowBackorder: boolean;
  };
  sku?: string;
  
  // Status and flags
  status?: ProductStatus;
  condition?: ProductCondition;
  isFeatured?: boolean;
  isOnSale?: boolean;
  
  // Shipping
  shipping?: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    shippingClass: string;
    freeShipping: boolean;
    shippingCost?: number;
  };
  
  // Seller
  seller?: string;
  manufacturer?: string;
  
  // Additional fields
  tags?: string[];
  attributes?: Record<string, string>;
  
  // SEO
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    focusKeyword?: string;
    canonicalUrl?: string;
  };
  
  // Policies
  warranty?: string;
  returnPolicy?: {
    available: boolean;
    policy?: string;
    days?: number;
  };
  replacementPolicy?: {
    available: boolean;
    policy?: string;
    days?: number;
  };
}

/**
 * Product search item interface for search results
 */
export interface IProductSearchItem {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  condition: ProductCondition;
  image?: {
    url: string;
    alt: string;
  };
  brand: {
    _id: string;
    name: string;
  };
  category: {
    _id: string;
    name: string;
  };
  seller: {
    _id: string;
    storeName: string;
  };
  pricing: {
    basePrice: number;
    currency: string;
  };
  inventory: {
    stockQuantity: number;
  };
}

/**
 * Product search response interface
 */
export interface IProductSearchResponse {
  results: IProductSearchItem[];
  pagination: {
    currentPage: number;
    totalCount: number;
    count: number;
    hasMore: boolean;
  };
  query: string;
}

/**
 * Product statistics interface for admin dashboard
 */
export interface IProductStatistics {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  featuredProducts: number;
  onSaleProducts: number;
  totalValue: number;
  averagePrice: number;
  topCategories: Array<{
    _id: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  topBrands: Array<{
    _id: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  topSellers: Array<{
    _id: string;
    storeName: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    action: string;
    productId: string;
    productName: string;
    performedBy: string;
    performedAt: Date;
  }>;
}

/**
 * Product bulk action body interface
 */
export interface IProductBulkActionBody {
  productIds: string[];
  action:
    | "publish"
    | "unpublish"
    | "archive"
    | "restore"
    | "delete"
    | "feature"
    | "unfeature"
    | "enable-sale"
    | "disable-sale"
    | "update-status"
    | "update-category"
    | "update-brand"
    | "update-seller";
  data?: {
    status?: ProductStatus;
    category?: string;
    brand?: string;
    seller?: string;
    isFeatured?: boolean;
    isOnSale?: boolean;
  };
}

/**
 * Product bulk action result interface
 */
export interface IProductBulkActionResult {
  success: number;
  failed: number;
  errors: Array<{
    productId: string;
    error: string;
  }>;
}