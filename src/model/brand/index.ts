import mongoose, { Model, Query, Schema } from "mongoose";
import { IBrand } from "../../@types/brand.type";
import { ImageSchema } from "../schema/common.model";

// Import schemas
import {
  BrandAnalyticsSchema,
  BrandBusinessInfoSchema,
  BrandSEOSchema,
  BrandSocialMediaSchema,
} from "./schemas";

// Import middleware
import { preDeleteMiddleware, preSaveMiddleware } from "./middleware";

// Import methods
import {
  addToCategory,
  findActiveBrands,
  findActiveOne,
  findByCategory,
  findFeaturedBrands,
  findPopularBrands,
  removeFromCategory,
  restore,
  softDelete,
  updateAnalytics,
} from "./methods";

// Extend the Mongoose Model interface to include static methods
interface IBrandModel extends Model<IBrand> {
  findActiveBrands(
    additionalQuery?: Record<string, any>,
  ): Query<IBrand[], IBrand>;
  findActiveOne(query: Record<string, any>): Query<IBrand | null, IBrand>;
  findByCategory(categoryId: string): Query<IBrand[], IBrand>;
  findPopularBrands(limit?: number): Query<IBrand[], IBrand>;
  findFeaturedBrands(): Query<IBrand[], IBrand>;
}

const brandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [2, "Brand name must be at least 2 characters"],
      maxlength: [100, "Brand name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },

    // Visual assets
    logo: ImageSchema,
    banner: ImageSchema,
    images: [ImageSchema],

    // Business information and social media
    businessInfo: { type: BrandBusinessInfoSchema, default: () => ({}) },
    socialMedia: { type: BrandSocialMediaSchema, default: () => ({}) },

    // SEO and metadata
    seo: { type: BrandSEOSchema, default: () => ({}) },
    searchKeywords: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 50; // Limit keywords
        },
        message: "Maximum 50 search keywords allowed",
      },
    },

    // Relationships
    categories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      validate: {
        validator: function (v: mongoose.Types.ObjectId[]) {
          return v.length >= 1 && v.length <= 20; // At least 1, max 20 categories
        },
        message: "Brand must be associated with 1-20 categories",
      },
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      validate: {
        validator: async function (parentId: mongoose.Types.ObjectId) {
          if (!parentId) return true;

          // Prevent self-reference
          if (parentId.toString() === (this as IBrand)._id?.toString()) {
            return false;
          }

          // Check if parent exists and is active
          const BrandModel = mongoose.model("Brand");
          const parent = await BrandModel.findOne({
            _id: parentId,
            isDeleted: false,
          });
          return !!parent;
        },
        message: "Invalid parent brand",
      },
    },

    // Analytics and metrics
    analytics: { type: BrandAnalyticsSchema, default: () => ({}) },

    // Status and flags
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },

    // Display settings
    showInHomepage: { type: Boolean, default: false },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, "Display order cannot be negative"],
    },

    // Timestamps and tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Comprehensive indexing for improved query performance
brandSchema.index({ name: 1 });
brandSchema.index({ slug: 1 }, { unique: true });
brandSchema.index({ isDeleted: 1, isActive: 1 });
brandSchema.index({ categories: 1 });
brandSchema.index({ isFeatured: 1, isActive: 1 });
brandSchema.index({ isPopular: 1, isActive: 1 });
brandSchema.index({ isPremium: 1, isActive: 1 });
brandSchema.index({ isVerified: 1, isActive: 1 });
brandSchema.index({ showInHomepage: 1, isActive: 1 });
brandSchema.index({ "analytics.productCount": -1 });
brandSchema.index({ "analytics.totalSales": -1 });
brandSchema.index({ "analytics.averageRating": -1 });
brandSchema.index({ "analytics.viewCount": -1 });
brandSchema.index({ "businessInfo.originCountry": 1 });
brandSchema.index({ displayOrder: 1, name: 1 });

// Text search index
brandSchema.index(
  {
    name: "text",
    description: "text",
    searchKeywords: "text",
    "seo.metaTitle": "text",
    "seo.metaDescription": "text",
    "businessInfo.legalName": "text",
  },
  {
    weights: {
      name: 10,
      searchKeywords: 8,
      "seo.metaTitle": 6,
      "businessInfo.legalName": 5,
      description: 3,
      "seo.metaDescription": 1,
    },
    name: "brand_text_index",
  },
);

// Apply middleware
brandSchema.pre<IBrand>("save", preSaveMiddleware);
brandSchema.pre("findOneAndDelete", preDeleteMiddleware);

// Apply instance methods
brandSchema.methods.softDelete = softDelete;
brandSchema.methods.restore = restore;
brandSchema.methods.updateAnalytics = updateAnalytics;
brandSchema.methods.addToCategory = addToCategory;
brandSchema.methods.removeFromCategory = removeFromCategory;

// Apply static methods
brandSchema.statics.findActiveBrands = findActiveBrands;
brandSchema.statics.findActiveOne = findActiveOne;
brandSchema.statics.findByCategory = findByCategory;
brandSchema.statics.findPopularBrands = findPopularBrands;
brandSchema.statics.findFeaturedBrands = findFeaturedBrands;

const Brand: IBrandModel = mongoose.model<IBrand, IBrandModel>(
  "Brand",
  brandSchema,
);

export default Brand;
