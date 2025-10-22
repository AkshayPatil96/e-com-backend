import { ISeller, ISellerAddress } from "./seller.type";

// ================================
// ADMIN FILTERS AND SEARCH
// ================================

export interface ISellerAdminFilters {
  page: number;
  limit: number;
  search: string;
  status: "all" | "active" | "suspended" | "pending" | "rejected" | "inactive";
  verified: "all" | "verified" | "unverified";
  featured: "all" | "featured" | "not-featured";
  isDeleted: boolean;
  sortBy: "storeName" | "createdAt" | "joinedDate" | "totalSales" | "totalOrders" | "averageRating";
  sortOrder: "asc" | "desc";
  categories?: string; // Filter by categories
  minSales?: number;
  maxSales?: number;
  minRating?: number;
  maxRating?: number;
}

export interface ISellerAdminItem {
  _id: string;
  storeName: string;
  slug: string;
  contactEmail: string;
  phoneNumber?: string;
  status: ISeller["status"];
  isVerified: boolean;
  isDeleted: boolean;
  isFeatured: boolean;
  isTopSeller: boolean;
  image?: {
    url: string;
    alt?: string;
  };
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  averageRating: number;
  totalRatings: number;
  commissionRate: number;
  joinedDate: Date;
  lastActiveDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISellerAdminListResponse {
  data: ISellerAdminItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ISellerSearchItem {
  _id: string;
  storeName: string;
  slug: string;
  contactEmail: string;
  status: ISeller["status"];
  isVerified: boolean;
  image?: {
    url: string;
    alt?: string;
  };
}

export interface ISellerSearchResponse {
  results: ISellerSearchItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    hasMore: boolean;
    count: number;
  };
  query: string;
}

// ================================
// SELLER STATISTICS
// ================================

export interface ISellerStatistics {
  totalSellers: number;
  activeSellers: number;
  pendingSellers: number;
  suspendedSellers: number;
  verifiedSellers: number;
  featuredSellers: number;
  topSellers: number;
  deletedSellers: number;
  totalSales: number;
  averageCommissionRate: number;
  newSellersThisMonth: number;
  newSellersLastMonth: number;
  statusBreakdown: {
    active: number;
    suspended: number;
    pending: number;
    rejected: number;
    inactive: number;
  };
  verificationBreakdown: {
    verified: number;
    unverified: number;
  };
}

// ================================
// CRUD OPERATIONS
// ================================

export interface ICreateSellerAdminBody {
  userId?: string; // Reference to user
  storeName: string;
  slug: string;
  storeDescription?: string;
  categories: string[];
  contactEmail: string;
  phoneNumber?: string;
  alternatePhone?: string;
  addresses: ISellerAddress[];
  image?: any; // Image data from upload
  banner?: any; // Banner data from upload
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  commissionRate?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  isTopSeller?: boolean;
  status?: ISeller["status"];
  policies?: {
    returnPolicy?: {
      acceptReturns: boolean;
      returnWindow: number;
      returnConditions: string;
    };
    shippingPolicy?: {
      processingTime: number;
      shippingMethods: string[];
      freeShippingThreshold?: number;
    };
    exchangePolicy?: {
      acceptExchanges: boolean;
      exchangeWindow: number;
    };
  };
}

export interface IUpdateSellerAdminBody {
  storeName?: string;
  storeDescription?: string;
  categories?: string[];
  contactEmail?: string;
  phoneNumber?: string;
  alternatePhone?: string;
  addresses?: ISellerAddress[];
  image?: any;
  banner?: any;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  commissionRate?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
  isTopSeller?: boolean;
  status?: ISeller["status"];
  policies?: {
    returnPolicy?: {
      acceptReturns: boolean;
      returnWindow: number;
      returnConditions: string;
    };
    shippingPolicy?: {
      processingTime: number;
      shippingMethods: string[];
      freeShippingThreshold?: number;
    };
    exchangePolicy?: {
      acceptExchanges: boolean;
      exchangeWindow: number;
    };
  };
}

// ================================
// BULK ACTIONS
// ================================

export interface ISellerBulkActionBody {
  sellerIds: string[];
  action: "activate" | "suspend" | "delete" | "restore" | "verify" | "unverify" | "feature" | "unfeature" | "approve" | "reject";
}

export interface ISellerBulkActionResult {
  success: number;
  failed: number;
  errors: string[];
}

// ================================
// VERIFICATION AND APPROVAL
// ================================

export interface ISellerVerificationUpdate {
  isVerified: boolean;
  verificationNotes?: string;
  businessVerification?: {
    businessLicense?: {
      verified: boolean;
      notes?: string;
    };
    taxId?: {
      verified: boolean;
      notes?: string;
    };
    bankAccount?: {
      verified: boolean;
      notes?: string;
    };
    identityVerification?: {
      verified: boolean;
      notes?: string;
    };
  };
}

export interface ISellerApprovalUpdate {
  status: "approved" | "rejected";
  approvalNotes?: string;
  commissionRate?: number;
}

// ================================
// ANALYTICS AND REPORTING
// ================================

export interface ISellerPerformanceMetrics {
  sellerId: string;
  storeName: string;
  salesData: {
    totalSales: number;
    monthlyGrowth: number;
    averageOrderValue: number;
    totalOrders: number;
  };
  productData: {
    totalProducts: number;
    activeProducts: number;
    soldProducts: number;
    lowStockProducts: number;
  };
  customerData: {
    totalCustomers: number;
    repeatCustomers: number;
    customerSatisfaction: number;
  };
  financials: {
    revenue: number;
    commission: number;
    payoutsPending: number;
    payoutsCompleted: number;
  };
}

export interface ISellerAnalyticsReport {
  sellerId: string;
  period: "week" | "month" | "quarter" | "year";
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: ISellerPerformanceMetrics;
  trends: {
    salesTrend: Array<{ date: Date; value: number }>;
    ordersTrend: Array<{ date: Date; value: number }>;
    ratingTrend: Array<{ date: Date; value: number }>;
  };
}