import mongoose, { Model, Schema } from "mongoose";
import {
  IProduct,
  ProductCondition,
  ProductStatus,
} from "../../@types/product.type";
import { ImageSchema, metaDataSchema } from "../schema/common.model";

// Import schemas
import {
  ProductAnalyticsSchema,
  ProductInventorySchema,
  ProductPricingSchema,
  ProductRelationsSchema,
  ProductReviewSummarySchema,
  ProductSEOSchema,
  ProductShippingSchema,
} from "./schemas";

// Import middleware
import {
  postSaveMiddleware,
  postUpdateMiddleware,
  preSaveMiddleware,
  preUpdateMiddleware,
} from "./middleware";

// Import methods
import * as InstanceMethods from "./methods";

// Extend the Mongoose Model interface to include static methods
interface IProductModel extends Model<IProduct> {
  findActiveProducts(additionalQuery?: Record<string, any>): any;
  findActiveOne(query: Record<string, any>): any;
  findByCategory(categoryId: string): any;
  findByBrand(brandId: string): any;
  findBySeller(sellerId: string, includeDeleted?: boolean): any;
  findFeatured(limit?: number): any;
  findOnSale(limit?: number): any;
  findBestSelling(limit?: number, days?: number): any;
  findTrending(limit?: number, days?: number): any;
  findRecentlyAdded(limit?: number): any;
  findHighRated(minRating?: number, limit?: number): any;
  searchProducts(searchTerm: string, filters?: Record<string, any>): any;
  findByPriceRange(
    minPrice: number,
    maxPrice: number,
    additionalQuery?: Record<string, any>,
  ): any;
  findLowStock(): any;
  findNeedingReorder(): any;
}

/**
 * Product schema definition with fields and their validation
 */
const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Product slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Brand is required"],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    variations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Variation",
      },
    ],
    images: [ImageSchema],

    // Pricing information
    pricing: {
      type: ProductPricingSchema,
      required: [true, "Pricing information is required"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },

    // Inventory management
    inventory: {
      type: ProductInventorySchema,
      required: [true, "Inventory information is required"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Product status and flags
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.DRAFT,
      required: true,
    },
    condition: {
      type: String,
      enum: Object.values(ProductCondition),
      default: ProductCondition.NEW,
      required: true,
    },
    isFeatured: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },

    // Shipping information
    shipping: {
      type: ProductShippingSchema,
      required: [true, "Shipping information is required"],
    },

    // Reviews and ratings
    reviews: {
      type: ProductReviewSummarySchema,
      default: () => ({}),
    },

    // Relations
    relations: {
      type: ProductRelationsSchema,
      default: () => ({}),
    },

    // Seller information
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: [true, "Seller is required"],
    },
    manufacturer: {
      type: String,
      trim: true,
    },

    // Additional fields
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 20;
        },
        message: "Cannot have more than 20 tags",
      },
    },
    attributes: {
      type: Map,
      of: String,
      default: new Map(),
    },

    // SEO
    seo: {
      type: ProductSEOSchema,
      default: () => ({}),
    },

    // Analytics
    analytics: {
      type: ProductAnalyticsSchema,
      default: () => ({}),
    },

    // Metadata
    metadata: metaDataSchema,

    // Policies
    warranty: {
      type: String,
      trim: true,
    },
    returnPolicy: {
      available: { type: Boolean, default: false },
      policy: { type: String, trim: true },
      days: { type: Number, min: 0, max: 365 },
    },
    replacementPolicy: {
      available: { type: Boolean, default: false },
      policy: { type: String, trim: true },
      days: { type: Number, min: 0, max: 365 },
    },

    // User tracking
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Updater is required"],
    },

    // Timestamps
    publishedAt: { type: Date },

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

/**
 * MIDDLEWARE
 */
productSchema.pre<IProduct>("save", preSaveMiddleware);
productSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  preUpdateMiddleware,
);
productSchema.post<IProduct>("save", postSaveMiddleware);
productSchema.post(["findOneAndUpdate", "updateOne"], postUpdateMiddleware);

/**
 * INSTANCE METHODS
 */
// Product Management
productSchema.methods.softDelete = InstanceMethods.softDelete;
productSchema.methods.restore = InstanceMethods.restore;
productSchema.methods.updateStock = InstanceMethods.updateStock;
productSchema.methods.reserveStock = InstanceMethods.reserveStock;
productSchema.methods.releaseReservedStock =
  InstanceMethods.releaseReservedStock;

// Analytics
productSchema.methods.incrementCartAdd = InstanceMethods.incrementCartAdd;
productSchema.methods.incrementWishlist = InstanceMethods.incrementWishlist;
productSchema.methods.decrementWishlist = InstanceMethods.decrementWishlist;
productSchema.methods.incrementView = InstanceMethods.incrementView;
productSchema.methods.recordPurchase = InstanceMethods.recordPurchase;

// Business Logic
productSchema.methods.isAvailable = InstanceMethods.isAvailable;
productSchema.methods.getAvailableStock = InstanceMethods.getAvailableStock;
productSchema.methods.isStockLow = InstanceMethods.isStockLow;
productSchema.methods.getDiscountPrice = InstanceMethods.getDiscountPrice;
productSchema.methods.isOnSaleCheck = InstanceMethods.isOnSaleCheck;
productSchema.methods.updateReviewSummary = InstanceMethods.updateReviewSummary;

/**
 * STATIC METHODS
 */
// Basic Queries
productSchema.statics.findActiveProducts = InstanceMethods.findActiveProducts;
productSchema.statics.findActiveOne = InstanceMethods.findActiveOne;
productSchema.statics.findByCategory = InstanceMethods.findByCategory;
productSchema.statics.findByBrand = InstanceMethods.findByBrand;
productSchema.statics.findBySeller = InstanceMethods.findBySeller;

// Featured Products
productSchema.statics.findFeatured = InstanceMethods.findFeatured;
productSchema.statics.findOnSale = InstanceMethods.findOnSale;
productSchema.statics.findBestSelling = InstanceMethods.findBestSelling;
productSchema.statics.findTrending = InstanceMethods.findTrending;
productSchema.statics.findRecentlyAdded = InstanceMethods.findRecentlyAdded;
productSchema.statics.findHighRated = InstanceMethods.findHighRated;

// Search and Filter
productSchema.statics.searchProducts = InstanceMethods.searchProducts;
productSchema.statics.findByPriceRange = InstanceMethods.findByPriceRange;

// Operational
productSchema.statics.findLowStock = InstanceMethods.findLowStock;
productSchema.statics.findNeedingReorder = InstanceMethods.findNeedingReorder;

/**
 * INDEXES FOR QUERY OPTIMIZATION
 */
productSchema.index({ isDeleted: 1, status: 1 });
productSchema.index({ category: 1, status: 1, isDeleted: 1 });
productSchema.index({ brand: 1, status: 1, isDeleted: 1 });
productSchema.index({ seller: 1, status: 1, isDeleted: 1 });
productSchema.index({ isFeatured: 1, status: 1, isDeleted: 1 });
productSchema.index({ isOnSale: 1, status: 1, isDeleted: 1 });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ "pricing.basePrice": 1 });
productSchema.index({ "inventory.stockQuantity": 1 });
productSchema.index({ "reviews.averageRating": 1 });
productSchema.index({ tags: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ "analytics.viewCount": -1 });

// Text search index
productSchema.index(
  {
    name: "text",
    description: "text",
    shortDescription: "text",
    tags: "text",
  },
  {
    weights: {
      name: 10,
      shortDescription: 5,
      description: 3,
      tags: 2,
    },
    name: "product_text_index",
  },
);

// Compound indexes for performance
productSchema.index({
  category: 1,
  "pricing.basePrice": 1,
  status: 1,
  isDeleted: 1,
});
productSchema.index({
  brand: 1,
  "reviews.averageRating": -1,
  status: 1,
  isDeleted: 1,
});

/**
 * Product model for interacting with the product collection in MongoDB.
 */
const Product: IProductModel = mongoose.model<IProduct, IProductModel>(
  "Product",
  productSchema,
);

export default Product;
