import { Document, Types } from "mongoose";

// ============================
// ENHANCED VARIATION TYPES
// ============================

/**
 * Enhanced pricing schema for variations with comprehensive business logic
 */
export interface IVariationPricing {
  basePrice: number; // Base price of the variation
  salePrice?: number; // Sale/discounted price (if on sale)
  costPrice?: number; // Cost price for profit calculations
  msrp?: number; // Manufacturer's Suggested Retail Price
  margin?: number; // Profit margin percentage
  currency: string; // Currency code (e.g., 'USD', 'EUR')
  taxRate?: number; // Tax rate percentage
  isOnSale: boolean; // Whether variation is on sale
  saleStartDate?: Date; // Sale start date
  saleEndDate?: Date; // Sale end date
  minOrderQuantity: number; // Minimum order quantity
  maxOrderQuantity?: number; // Maximum order quantity per order
  bulkPricing?: {
    quantity: number;
    price: number;
    discountPercentage?: number;
  }[]; // Bulk pricing tiers
}

/**
 * Enhanced inventory schema for variations with comprehensive stock management
 */
export interface IVariationInventory {
  quantity: number; // Current stock quantity
  reservedQuantity: number; // Quantity reserved for pending orders
  availableQuantity: number; // Available quantity (calculated field)
  reorderPoint: number; // Minimum stock level before reordering
  maxStockLevel?: number; // Maximum stock level to maintain
  lastRestockDate?: Date; // Last time stock was replenished
  restockQuantity?: number; // Last restock amount
  stockLocation?: string; // Warehouse/storage location
  trackInventory: boolean; // Whether to track inventory for this variation
  allowBackorders: boolean; // Whether to allow orders when out of stock
  backorderLimit?: number; // Maximum backorder quantity allowed
  lowStockThreshold: number; // Threshold for low stock alerts
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | "discontinued"; // Current stock status
  stockMovements: {
    type: "in" | "out" | "adjustment" | "reserved" | "unreserved";
    quantity: number;
    reason: string;
    date: Date;
    reference?: string; // Order ID, adjustment ID, etc.
  }[]; // Stock movement history
  demandForecast?: {
    period: "daily" | "weekly" | "monthly";
    expectedDemand: number;
    confidenceLevel: number; // 0-100%
    lastUpdated: Date;
  }; // Demand forecasting data
}

/**
 * Enhanced attributes schema for variations with comprehensive product characteristics
 */
export interface IVariationAttributes {
  // Physical attributes
  color?: {
    name: string; // Color name (e.g., "Red", "Ocean Blue")
    code?: string; // Color code (e.g., "#FF0000", "RGB(255,0,0)")
    family?: string; // Color family (e.g., "Blue", "Red")
  };
  size?: {
    value: string; // Size value (e.g., "M", "32", "10.5")
    type: "clothing" | "shoe" | "ring" | "custom"; // Size type
    measurements?: {
      length?: number;
      width?: number;
      height?: number;
      weight?: number;
      unit: "cm" | "inch" | "mm" | "m" | "kg" | "lb" | "g";
    };
  };
  material?: {
    primary: string; // Primary material (e.g., "Cotton", "Leather")
    secondary?: string[]; // Secondary materials
    composition?: {
      material: string;
      percentage: number;
    }[]; // Material composition breakdown
    care?: string[]; // Care instructions
  };

  // Technical specifications
  technical?: {
    storage?: string; // Storage capacity (e.g., "64GB", "1TB")
    memory?: string; // RAM (e.g., "8GB", "16GB")
    processor?: string; // CPU/Processor info
    display?: {
      size: string; // Display size (e.g., "6.1 inch")
      resolution: string; // Resolution (e.g., "1920x1080")
      type: string; // Display type (e.g., "OLED", "LCD")
    };
    connectivity?: string[]; // Connectivity options (e.g., ["WiFi", "Bluetooth", "5G"])
    battery?: {
      capacity: string; // Battery capacity (e.g., "4000mAh")
      type: string; // Battery type (e.g., "Li-ion")
    };
    os?: string; // Operating system
    model?: string; // Model number/name
    brand?: string; // Brand name for this specific variation
  };

  // Style and design attributes
  style?: {
    pattern?: string; // Pattern (e.g., "Solid", "Striped", "Floral")
    texture?: string; // Texture (e.g., "Smooth", "Rough", "Matte")
    finish?: string; // Finish (e.g., "Glossy", "Matte", "Brushed")
    theme?: string; // Theme or collection name
  };

  // Compliance and certifications
  compliance?: {
    certifications?: string[]; // Certifications (e.g., ["CE", "FCC", "RoHS"])
    standards?: string[]; // Standards compliance
    origin?: string; // Country of origin
    warranty?: {
      duration: number; // Warranty duration
      unit: "days" | "months" | "years"; // Duration unit
      type: "manufacturer" | "store" | "extended"; // Warranty type
      coverage?: string[]; // What's covered
    };
  };

  // Custom attributes for flexibility
  custom?: {
    name: string;
    value: string | number | boolean;
    type: "string" | "number" | "boolean" | "date";
    unit?: string; // Unit for numeric values
  }[];

  // Last updated timestamp
  lastUpdated: Date;
}

/**
 * Analytics schema for variations with comprehensive performance tracking
 */
export interface IVariationAnalytics {
  // Sales analytics
  sales: {
    totalSold: number; // Total quantity sold
    totalRevenue: number; // Total revenue generated
    averageOrderValue: number; // Average order value
    conversionRate?: number; // Conversion rate (views to purchases)
    returnRate?: number; // Return/refund rate
    lastSaleDate?: Date; // Date of last sale
    bestSellingPeriod?: {
      start: Date;
      end: Date;
      quantity: number;
    }; // Best performing period
  };

  // View and engagement analytics
  engagement: {
    views: number; // Total page views
    uniqueViews: number; // Unique page views
    addToCartCount: number; // Times added to cart
    wishlistCount: number; // Times added to wishlist
    shareCount: number; // Times shared on social media
    averageTimeOnPage?: number; // Average time spent on product page (seconds)
    bounceRate?: number; // Bounce rate percentage
    lastViewDate?: Date; // Date of last view
  };

  // Performance metrics
  performance: {
    rank?: number; // Ranking among variations of the same product
    popularityScore: number; // Calculated popularity score (0-100)
    trendingScore?: number; // Trending score based on recent activity
    seasonalityIndex?: number; // Seasonality index (how seasonal this variation is)
    competitiveIndex?: number; // How competitive this variation is in the market
  };

  // Customer behavior analytics
  customerBehavior: {
    averageRating?: number; // Average customer rating
    totalRatings: number; // Total number of ratings
    reviewCount: number; // Total number of reviews
    recommendationRate?: number; // Percentage of customers who recommend
    repeatPurchaseRate?: number; // Percentage of repeat purchases
    customerSegments?: {
      segment: string; // Customer segment name
      percentage: number; // Percentage of sales to this segment
    }[];
  };

  // Geographic analytics
  geographic?: {
    topCountries?: {
      country: string;
      sales: number;
      percentage: number;
    }[];
    topCities?: {
      city: string;
      country: string;
      sales: number;
    }[];
    shippingZones?: {
      zone: string;
      deliveryTime: number; // Average delivery time in days
      cost: number; // Average shipping cost
    }[];
  };

  // Time-based analytics
  temporal: {
    dailyAverages?: {
      views: number;
      sales: number;
      revenue: number;
    };
    weeklyTrends?: {
      week: Date;
      views: number;
      sales: number;
      revenue: number;
    }[];
    monthlyTrends?: {
      month: Date;
      views: number;
      sales: number;
      revenue: number;
    }[];
    seasonalPatterns?: {
      season: "spring" | "summer" | "fall" | "winter";
      salesMultiplier: number; // Sales multiplier for this season
    }[];
  };

  // Inventory analytics
  inventory: {
    turnoverRate?: number; // Inventory turnover rate
    daysToSellOut?: number; // Estimated days to sell current stock
    restockFrequency?: number; // How often restocked (per month)
    wastePercentage?: number; // Percentage of expired/damaged stock
    optimalStockLevel?: number; // AI-calculated optimal stock level
  };

  // Marketing analytics
  marketing?: {
    campaignPerformance?: {
      campaignId: string;
      campaignName: string;
      clicks: number;
      conversions: number;
      cost: number;
      revenue: number;
      roi: number; // Return on investment
    }[];
    channelPerformance?: {
      channel: string; // Marketing channel (e.g., "google_ads", "facebook")
      sales: number;
      cost: number;
      roi: number;
    }[];
    keywordPerformance?: {
      keyword: string;
      impressions: number;
      clicks: number;
      conversions: number;
    }[];
  };

  // Last updated timestamp
  lastUpdated: Date;
  nextUpdateDue?: Date; // When next analytics update is due
}

/**
 * SEO and marketing schema for variations with comprehensive digital marketing features
 */
export interface IVariationSEO {
  // SEO metadata
  metadata: {
    title?: string; // Custom SEO title for this variation
    description?: string; // Meta description
    keywords: string[]; // SEO keywords specific to this variation
    slug?: string; // URL slug for this variation
    canonicalUrl?: string; // Canonical URL to prevent duplicate content
    robotsDirective?:
      | "index,follow"
      | "noindex,follow"
      | "index,nofollow"
      | "noindex,nofollow";
    structuredData?: Record<string, any>; // JSON-LD structured data
  };

  // Social media optimization
  socialMedia: {
    ogTitle?: string; // Open Graph title
    ogDescription?: string; // Open Graph description
    ogImage?: string; // Open Graph image URL
    ogType?: string; // Open Graph type
    twitterTitle?: string; // Twitter card title
    twitterDescription?: string; // Twitter card description
    twitterImage?: string; // Twitter card image
    twitterCard?: "summary" | "summary_large_image" | "app" | "player";
    pinterestDescription?: string; // Pinterest-specific description
    instagramHashtags?: string[]; // Instagram hashtags
  };

  // Search optimization
  searchOptimization: {
    searchKeywords: string[]; // Internal search keywords
    autoSuggestTerms: string[]; // Terms for autocomplete/autosuggest
    synonyms: string[]; // Alternative terms that should match this variation
    misspellings: string[]; // Common misspellings to catch
    searchRanking?: number; // Manual search ranking boost/penalty
    categoryRelevance: {
      category: string;
      relevanceScore: number; // 0-100 relevance to this category
    }[];
  };

  // Content optimization
  content: {
    alternativeNames: string[]; // Alternative product names
    marketingNames: string[]; // Marketing/brand names
    technicalNames: string[]; // Technical/industry names
    translations?: {
      language: string; // ISO language code
      title: string;
      description: string;
      keywords: string[];
    }[];
    featuredBenefits: string[]; // Key selling points for this variation
    useCases: string[]; // Common use cases or applications
  };

  // Performance tracking
  performance: {
    searchImpressions: number; // How many times shown in search results
    searchClicks: number; // How many times clicked from search
    searchCTR?: number; // Click-through rate from search
    organicTraffic?: number; // Organic search traffic
    paidTraffic?: number; // Paid search traffic
    socialTraffic?: number; // Social media traffic
    referralTraffic?: number; // Referral traffic
    lastIndexed?: Date; // Last time indexed by search engines
  };

  // Marketing campaigns
  campaigns?: {
    active: {
      campaignId: string;
      campaignName: string;
      type: "ppc" | "display" | "social" | "email" | "influencer" | "affiliate";
      startDate: Date;
      endDate?: Date;
      budget?: number;
      targetAudience?: string[];
      keywords?: string[];
      performance?: {
        impressions: number;
        clicks: number;
        conversions: number;
        cost: number;
        revenue: number;
      };
    }[];
    historical: {
      campaignId: string;
      campaignName: string;
      type: "ppc" | "display" | "social" | "email" | "influencer" | "affiliate";
      startDate: Date;
      endDate: Date;
      finalPerformance: {
        impressions: number;
        clicks: number;
        conversions: number;
        cost: number;
        revenue: number;
        roi: number;
      };
    }[];
  };

  // Local SEO (for physical stores)
  local?: {
    isAvailableInStore: boolean;
    storeLocations?: string[]; // Store IDs where available
    localKeywords?: string[]; // Location-specific keywords
    geoTargeting?: {
      countries: string[];
      regions: string[];
      cities: string[];
    };
  };

  // Technical SEO
  technical: {
    imageAlt?: string; // Alt text for main product image
    imageMetadata?: {
      copyright?: string;
      photographer?: string;
      location?: string;
    };
    loadingPriority?: "high" | "normal" | "low"; // Image loading priority
    lazyLoading?: boolean; // Whether to lazy load images
    compression?: {
      webp?: boolean;
      avif?: boolean;
      quality?: number;
    };
  };

  // Last updated timestamps
  lastUpdated: Date;
  lastOptimized?: Date; // Last time SEO was manually optimized
  nextReviewDue?: Date; // When SEO should be reviewed next
}

// ============================
// COMBINED INTERFACES
// ============================

/**
 * Combined interface for all variation schemas
 */
export interface IVariationSchemas {
  pricing: IVariationPricing;
  inventory: IVariationInventory;
  attributes: IVariationAttributes;
  analytics: IVariationAnalytics;
  seo: IVariationSEO;
}

/**
 * Enhanced variation interface combining legacy and new features
 */
export interface IEnhancedVariation extends Document {
  // Core fields (maintaining backward compatibility)
  _id: Types.ObjectId; // Unique identifier for the variation
  productId: Types.ObjectId; // Reference to the associated product
  sku: string; // Unique SKU for this variation

  // Legacy fields (for backward compatibility)
  color?: string; // Color of the product (optional) - legacy
  size?: string; // Size of the product (optional) - legacy
  price?: number; // Price for this specific variation - legacy
  quantity?: number; // Available stock quantity for this variation - legacy
  storage?: string; // Storage capacity (e.g., 16GB, 32GB) - legacy

  // Enhanced schema fields
  pricing?: IVariationPricing; // Enhanced pricing data
  inventory?: IVariationInventory; // Enhanced inventory management
  attributes?: IVariationAttributes; // Rich product attributes
  analytics?: IVariationAnalytics; // Performance analytics
  seo?: IVariationSEO; // SEO optimization data

  // Soft delete and metadata
  isDeleted: boolean; // Flag to indicate if the variation is deleted
  deletedAt?: Date; // When was it deleted
  deletionReason?: string; // Reason for deletion

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;

  // Instance methods (will be added by schema)
  calculateFinalPrice?: (quantity?: number, options?: any) => number;
  isInStock?: (requestedQuantity?: number) => boolean;
  getAvailableQuantity?: () => number;
  isOnSale?: () => boolean;
  getDiscountPercentage?: () => number;
  getProfitMargin?: () => number;
  needsReorder?: () => boolean;
  getDisplayName?: () => string;
  getUrlSlug?: () => string;
  getAttributes?: () => Record<string, any>;
  matchesSearch?: (searchTerm: string) => boolean;
  getPopularityScore?: () => number;
  softDelete?: (reason?: string) => Promise<IEnhancedVariation>;
  restore?: () => Promise<IEnhancedVariation>;
  getSummary?: (includeAnalytics?: boolean) => Record<string, any>;
}

/**
 * Legacy IVariation interface for backward compatibility
 * This maintains the original structure while extending Document properly
 */
export interface IVariation extends Document {
  _id: Types.ObjectId; // Unique identifier for the variation
  productId: Types.ObjectId; // Reference to the associated product
  color?: string; // Color of the product (optional)
  size?: string; // Size of the product (optional)
  sku: string; // Unique SKU for this variation
  price: number; // Price for this specific variation
  quantity: number; // Available stock quantity for this variation
  storage?: string; // Storage capacity (e.g., 16GB, 32GB) for products like RAM or pen drives
  isDeleted: boolean; // Flag to indicate if the variation is deleted

  // Legacy methods
  isInStock?: (requestedQuantity: number) => boolean;
  reduceStock?: (requestedQuantity: number) => Promise<void>;
  restock?: (additionalQuantity: number) => Promise<void>;
  getFinalPrice?: (discount?: number) => number;
  softDelete?: () => Promise<void>;
  restore?: () => Promise<void>;
}

// ============================
// UTILITY TYPES
// ============================

/**
 * Search criteria interface for advanced variation searching
 */
export interface IVariationSearchCriteria {
  searchTerm?: string;
  priceRange?: { min?: number; max?: number };
  colors?: string[];
  sizes?: string[];
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  categories?: string[];
  attributes?: Record<string, any>;
  sortBy?: "price" | "popularity" | "relevance" | "newest";
  sortOrder?: "asc" | "desc";
  limit?: number;
  skip?: number;
}

/**
 * Bulk update interfaces
 */
export interface IVariationPricingUpdate {
  id: string;
  basePrice?: number;
  salePrice?: number;
  isOnSale?: boolean;
}

export interface IVariationInventoryUpdate {
  id: string;
  quantity?: number;
  reorderPoint?: number;
}

/**
 * Analytics report interface
 */
export interface IVariationAnalyticsReport {
  period: "daily" | "weekly" | "monthly";
  generatedAt: Date;
  performance: {
    popularityScore: number;
    trendingScore: number;
    seasonalityIndex: number;
  };
  sales: {
    totalSold: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
    returnRate: number;
  };
  engagement: {
    totalViews: number;
    uniqueViews: number;
    addToCartRate: number;
    wishlistRate: number;
  };
  customerFeedback: {
    averageRating: number;
    totalRatings: number;
    totalReviews: number;
    recommendationRate: number;
  };
  inventory: {
    turnoverRate: number;
    daysToSellOut: number;
    optimalStockLevel: number;
  };
}

/**
 * Demand prediction interface
 */
export interface IVariationDemandPrediction {
  predictedDemand: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
  seasonalityFactor: number;
}

// All types are already exported with their declarations above
