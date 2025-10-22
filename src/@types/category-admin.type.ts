import { Document, Types } from "mongoose";
import { ICategory } from "./category.type";

// Admin-specific category filter interface
export interface ICategoryAdminFilters {
  page: number;
  limit: number;
  search: string;
  status: "all" | "active" | "inactive";
  featured: "all" | "featured" | "not-featured";
  parent: string | "root" | "all";
  level: number | null;
  isDeleted: boolean;
  sortBy: "name" | "createdAt" | "order" | "productCount" | "viewCount";
  sortOrder: "asc" | "desc";
  showInMenu?: boolean;
  showInHomepage?: boolean;
}

// Admin list response interface
export interface ICategoryAdminListResponse {
  data: ICategoryAdminItem[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  statistics?: ICategoryStatistics;
}

// Enhanced category item for admin list
export interface ICategoryAdminItem
  extends Omit<
    ICategory,
    "ancestors" | "attributes" | "brands" | "metadata" | "settings"
  > {
  hasChildren: boolean;
  childrenCount: number;
  parentName?: string;
  createdByName?: string;
  updatedByName?: string;
  hierarchyPath?: string[];
}

// Admin create category request
export interface ICreateCategoryAdminBody {
  name: string;
  description?: string;
  shortDescription?: string;
  parent?: string;
  order?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  showInMenu?: boolean;
  showInHomepage?: boolean;
  searchKeywords?: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
  };
  settings?: {
    allowProducts?: boolean;
    requireApproval?: boolean;
    featuredProductsLimit?: number;
    commissionRate?: number;
  };
}

// Admin update category request
export interface IUpdateCategoryAdminBody
  extends Partial<ICreateCategoryAdminBody> {
  slug?: string;
  level?: number;
  ancestors?: string[];
  path?: string;
  materializedPath?: string;
}

// Bulk actions interface
export interface ICategoryBulkActionBody {
  categoryIds: string[];
  action:
    | "activate"
    | "deactivate"
    | "delete"
    | "restore"
    | "feature"
    | "unfeature";
}

// Category hierarchy tree item for admin
export interface ICategoryHierarchyAdminItem {
  _id: string;
  name: string;
  slug: string;
  level: number;
  productCount: number;
  totalProductCount: number;
  isActive: boolean;
  isFeatured: boolean;
  showInMenu: boolean;
  order: number;
  children: ICategoryHierarchyAdminItem[];
}

// Statistics interface
export interface ICategoryStatistics {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  featuredCategories: number;
  deletedCategories: number;
  rootCategories: number;
  leafCategories: number;
  averageProductsPerCategory: number;
  categoriesWithoutProducts: number;
  categoriesWithMostProducts: {
    _id: string;
    name: string;
    productCount: number;
  }[];
}

// Move category request
export interface IMoveCategoryBody {
  newParentId?: string; // null or undefined for root level
  newOrder?: number;
}

// Category export format
export interface ICategoryExportItem {
  id: string;
  name: string;
  slug: string;
  parentName: string;
  level: number;
  path: string;
  description: string;
  productCount: number;
  isActive: string;
  isFeatured: string;
  showInMenu: string;
  showInHomepage: string;
  createdAt: string;
  updatedAt: string;
}
