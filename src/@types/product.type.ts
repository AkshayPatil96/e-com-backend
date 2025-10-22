import { Document, Types } from "mongoose";
import { IBrand } from "./brand.type";
import { ICategory } from "./category.type";
import { IImage, IMetadataSchema } from "./common.type";
import { ISeller } from "./seller.type";
import { IVariation } from "./variation.type";

/**
 * Product status enumeration
 */
export enum ProductStatus {
  DRAFT = "draft",
  PENDING = "pending",
  PUBLISHED = "published",
  ARCHIVED = "archived",
  OUT_OF_STOCK = "out_of_stock",
}

/**
 * Product condition enumeration
 */
export enum ProductCondition {
  NEW = "new",
  REFURBISHED = "refurbished",
  USED = "used",
}

/**
 * Product shipping class interface
 */
export interface IProductShipping {
  weight: number; // Weight in grams
  dimensions: {
    length: number; // Length in cm
    width: number; // Width in cm
    height: number; // Height in cm
  };
  shippingClass: string; // Shipping class identifier
  freeShipping: boolean; // Whether shipping is free
  shippingCost?: number; // Fixed shipping cost if applicable
}

/**
 * Product pricing interface
 */
export interface IProductPricing {
  basePrice: number; // Base price
  comparePrice?: number; // Compare at price (MSRP)
  costPrice?: number; // Cost price for profit calculation
  currency: string; // Currency code (USD, EUR, etc.)
  taxIncluded: boolean; // Whether tax is included in price
  taxRate?: number; // Tax rate percentage
}

/**
 * Product inventory interface
 */
export interface IProductInventory {
  stockQuantity: number; // Current stock quantity
  soldQuantity: number; // Total quantity sold
  reservedQuantity: number; // Quantity reserved for pending orders
  reorderLevel: number; // Minimum stock level for reorder alerts
  maxOrderQuantity?: number; // Maximum quantity per order
  trackQuantity: boolean; // Whether to track quantity
  allowBackorder: boolean; // Allow orders when out of stock
}

/**
 * Product SEO interface
 */
export interface IProductSEO {
  metaTitle?: string; // SEO meta title
  metaDescription?: string; // SEO meta description
  metaKeywords?: string[]; // SEO keywords
  focusKeyword?: string; // Primary SEO keyword
  canonicalUrl?: string; // Canonical URL for SEO
}

/**
 * Product analytics interface
 */
export interface IProductAnalytics {
  viewCount: number; // Number of views
  wishlistCount: number; // Number of times added to wishlist
  cartAddCount: number; // Number of times added to cart
  purchaseCount: number; // Number of purchases
  conversionRate: number; // Conversion rate percentage
  lastViewedAt?: Date; // Last viewed timestamp
}

/**
 * Product review interface for individual reviews
 */
export interface IProductReview extends Document {
  _id: Types.ObjectId; // Review ID
  user: Types.ObjectId; // User who wrote the review
  product: Types.ObjectId; // Product being reviewed
  rating: number; // Rating (1-5)
  title?: string; // Review title
  comment: string; // Review comment/text
  images?: IImage[]; // Review images uploaded by user
  isVerifiedPurchase: boolean; // Whether user actually purchased the product
  isRecommended?: boolean; // Whether user recommends the product
  helpfulVotes: number; // Number of helpful votes
  helpfulVotedBy: Types.ObjectId[]; // Users who voted helpful
  reportedCount: number; // Number of times reported
  reportedBy: Array<{
    user: Types.ObjectId;
    reason: string;
    reportedAt: Date;
  }>; // Users who reported and their reasons
  isVisible: boolean; // Whether review is visible (for moderation)
  moderatedBy?: Types.ObjectId; // Admin who moderated the review
  moderatedAt?: Date; // When review was moderated
  moderationReason?: string; // Reason for moderation
  // Additional fields for analytics and tracking
  deviceInfo?: string; // Device information for analytics
  locationInfo?: {
    country?: string;
    region?: string;
  }; // Location information for analytics
  reviewSource?: "website" | "mobile_app" | "imported" | "api"; // Source of the review
  createdAt: Date; // When review was created
  updatedAt: Date; // When review was last updated

  // Virtual properties
  helpfulPercentage?: number; // Calculated helpful percentage
  isReported?: boolean; // Whether review has been reported
  needsModeration?: boolean; // Whether review needs moderation

  // Instance methods
  voteHelpful(userId: Types.ObjectId): Promise<void>; // Vote review as helpful
  removeHelpfulVote(userId: Types.ObjectId): Promise<void>; // Remove helpful vote
  reportReview(userId: Types.ObjectId, reason: string): Promise<void>; // Report review
  moderate(
    moderatorId: Types.ObjectId,
    isVisible: boolean,
    reason?: string,
  ): Promise<void>; // Moderate review
}

/**
 * Product review summary interface
 */
export interface IProductReviewSummary {
  averageRating: number; // Average rating (0-5)
  totalReviews: number; // Total number of reviews
  totalVerifiedReviews: number; // Total verified purchase reviews
  totalRecommendations: number; // Total recommendations
  ratingDistribution: {
    1: number; // Number of 1-star reviews
    2: number; // Number of 2-star reviews
    3: number; // Number of 3-star reviews
    4: number; // Number of 4-star reviews
    5: number; // Number of 5-star reviews
  };
  recentReviews: Types.ObjectId[]; // Latest review IDs for quick access
}

/**
 * Product relations interface
 */
export interface IProductRelations {
  relatedProducts: Types.ObjectId[]; // Related product IDs
  crossSells: Types.ObjectId[]; // Cross-sell product IDs
  upSells: Types.ObjectId[]; // Up-sell product IDs
  bundles: Types.ObjectId[]; // Bundle product IDs
}

/**
 * IProduct interface represents the structure of a product document in MongoDB.
 * It extends the Document interface provided by Mongoose.
 */
export interface IProduct extends Document {
  _id: Types.ObjectId; // Unique identifier for the product
  name: string; // Name of the product
  slug: string; // Slug for the product URL
  description: string; // Description of the product
  shortDescription?: string; // Short description for listings
  brand: Types.ObjectId | IBrand; // Brand reference
  category: Types.ObjectId | ICategory; // Main category of the product
  categories: Types.ObjectId[]; // Additional categories
  variations: Types.ObjectId[] | IVariation[]; // Array of product variations
  images: IImage[]; // Array of image URLs for the product

  // Pricing information
  pricing: IProductPricing; // Pricing details
  discount?: number; // Discount percentage for the product

  // Inventory management
  inventory: IProductInventory; // Inventory details
  sku: string; // Stock Keeping Unit (SKU) of the product

  // Product status and flags
  status: ProductStatus; // Product status
  condition: ProductCondition; // Product condition
  isFeatured: boolean; // Flag to indicate if the product is featured
  isOnSale: boolean; // Flag to indicate if the product is on sale

  // Shipping information
  shipping: IProductShipping; // Shipping details

  // Reviews and ratings
  reviews: IProductReviewSummary; // Review summary

  // Relations
  relations: IProductRelations; // Product relations

  // Seller information
  seller: Types.ObjectId | ISeller; // Reference to the seller of the product
  manufacturer?: string; // Manufacturer of the product

  // Additional fields
  tags: string[]; // Array of tags associated with the product
  attributes: Map<string, string>; // Custom attributes (size, color, material, etc.)

  // SEO
  seo: IProductSEO; // SEO information

  // Analytics
  analytics: IProductAnalytics; // Analytics data

  // Metadata
  metadata?: IMetadataSchema; // Metadata for the product

  // Policies
  warranty?: string; // Warranty information for the product
  returnPolicy?: {
    available: boolean; // Flag to indicate if the product has a return policy
    policy: string; // Return policy for the product
    days: number; // Return period in days
  };
  replacementPolicy?: {
    available: boolean; // Flag to indicate if the product has a replacement policy
    policy: string; // Replacement policy for the product
    days: number; // Replacement period in days
  };

  // User tracking
  createdBy: Types.ObjectId; // Reference to the user who created the product
  updatedBy: Types.ObjectId; // Reference to the user who last updated the product

  // Timestamps
  createdAt: Date; // Timestamp when the product was created
  updatedAt: Date; // Timestamp when the product was last updated
  publishedAt?: Date; // Timestamp when the product was published

  // Soft delete
  isDeleted: boolean; // Flag to indicate if the product is deleted
  deletedAt?: Date; // Timestamp when the product was deleted
  deletedBy?: Types.ObjectId; // User who deleted the product

  // Instance methods
  softDelete(): Promise<void>; // Method to soft delete the product
  restore(): Promise<void>; // Method to restore the soft deleted product
  updateStock(quantity: number, operation: "add" | "subtract"): Promise<void>; // Update stock
  getFinalPrice(): number; // Calculate final price after discounts
  getDiscountAmount(): number; // Calculate discount amount
  getProfitMargin(): number; // Calculate profit margin
  updateAnalytics(
    action: "view" | "cart" | "wishlist" | "purchase",
  ): Promise<void>; // Update analytics
  addToCategory(categoryId: Types.ObjectId): Promise<void>; // Add to category
  removeFromCategory(categoryId: Types.ObjectId): Promise<void>; // Remove from category
  addRelatedProduct(
    productId: Types.ObjectId,
    type: "related" | "crossSell" | "upSell",
  ): Promise<void>; // Add related product
  removeRelatedProduct(
    productId: Types.ObjectId,
    type: "related" | "crossSell" | "upSell",
  ): Promise<void>; // Remove related product
  updateReviewSummary(): Promise<void>; // Update review summary from reviews
  addReview(reviewData: Partial<IProductReview>): Promise<IProductReview>; // Add a new review
  updateReview(
    reviewId: Types.ObjectId,
    updateData: Partial<IProductReview>,
  ): Promise<IProductReview | null>; // Update existing review
  deleteReview(reviewId: Types.ObjectId): Promise<void>; // Delete a review
  getReviews(filters?: {
    rating?: number;
    verified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<IProductReview[]>; // Get product reviews
  moderateReview(
    reviewId: Types.ObjectId,
    moderatorId: Types.ObjectId,
    isVisible: boolean,
  ): Promise<void>; // Moderate review
  voteHelpful(reviewId: Types.ObjectId, userId: Types.ObjectId): Promise<void>; // Vote review as helpful
  reportReview(
    reviewId: Types.ObjectId,
    userId: Types.ObjectId,
    reason: string,
  ): Promise<void>; // Report review
  checkStockAlert(): boolean; // Check if stock is below reorder level
}
