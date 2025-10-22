import mongoose, { Model, model, Schema, Types } from "mongoose";
import validator from "validator";
import { ISeller } from "../../@types/seller.type";
import {
  ImageSchema,
  metaDataSchema,
  SellerAddressSchema,
  SocialMediaSchema,
} from "../schema/common.model";

// Import schemas
import {
  BusinessVerificationSchema,
  SellerPoliciesSchema,
  SellerRatingsSchema,
} from "./schemas";

// Import middleware
import {
  preDeleteMiddleware,
  preSaveSlugMiddleware,
  storeNameValidationMiddleware,
} from "./middleware";

// Import methods
import {
  findActiveSellers,
  findByUserId,
  findTopSellers,
  getDefaultAddress,
  isActive,
  restore,
  softDelete,
  updateRating,
} from "./methods";

// Extend the Mongoose Model interface to include static methods
interface ISellerModel extends Model<ISeller> {
  findActiveSellers(
    additionalQuery?: Record<string, any>,
  ): mongoose.Query<ISeller[], ISeller>;
  findByUserId(userId: string): mongoose.Query<ISeller | null, ISeller>;
  findTopSellers(limit?: number): mongoose.Query<ISeller[], ISeller>;
}

/**
 * Seller schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const sellerSchema = new Schema<ISeller>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One seller account per user
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Store name must be at least 3 characters"],
      maxlength: [100, "Store name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: [true, "Seller slug is required"],
      unique: true,
      lowercase: true,
    },
    storeDescription: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    categories: {
      type: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      validate: {
        validator: function (v: Types.ObjectId[]) {
          return v.length <= 10; // Limit categories
        },
        message: "Maximum 10 categories allowed",
      },
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: validator.default.isEmail,
    },
    phoneNumber: {
      type: String,
      trim: true,
      validate: validator.isMobilePhone,
    },
    alternatePhone: {
      type: String,
      trim: true,
      validate: validator.default.isMobilePhone,
    },
    addresses: {
      type: [SellerAddressSchema],
      validate: {
        validator: function (v: any[]) {
          return v.length <= 10; // Limit addresses
        },
        message: "Maximum 10 addresses allowed",
      },
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending", "rejected", "inactive"],
      default: "pending",
    },
    metadata: metaDataSchema,
    image: {
      type: ImageSchema,
      default: undefined,
    },
    banner: {
      type: ImageSchema,
      default: undefined,
    },
    socialLinks: {
      type: SocialMediaSchema,
      default: () => ({}),
    },

    // Business-related fields
    businessVerification: {
      type: BusinessVerificationSchema,
      default: () => ({}),
    },
    commissionRate: {
      type: Number,
      default: 5, // 5% default commission
      min: [0, "Commission rate cannot be negative"],
      max: [50, "Commission rate cannot exceed 50%"],
    },
    isVerified: { type: Boolean, default: false },

    // Policies and ratings
    policies: { type: SellerPoliciesSchema, default: () => ({}) },
    ratings: { type: SellerRatingsSchema, default: () => ({}) },

    // Analytics and metrics
    totalSales: { type: Number, default: 0, min: 0 },
    totalOrders: { type: Number, default: 0, min: 0 },
    totalProducts: { type: Number, default: 0, min: 0 },
    joinedDate: { type: Date, default: Date.now },
    lastActiveDate: { type: Date },

    // Flags
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isTopSeller: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for improved query performance
sellerSchema.index({ userId: 1 }, { unique: true });
sellerSchema.index({ slug: 1 }, { unique: true });
sellerSchema.index({ status: 1, isDeleted: 1 });
sellerSchema.index({ categories: 1 });
sellerSchema.index({ isVerified: 1 });
sellerSchema.index({ isFeatured: 1 });
sellerSchema.index({ isTopSeller: 1 });
sellerSchema.index({ "ratings.averageRating": 1 });
sellerSchema.index({ totalSales: 1 });
sellerSchema.index({ lastActiveDate: 1 });

// Geospatial index for location-based queries
sellerSchema.index({ "addresses.location": "2dsphere" });

// Apply middleware
sellerSchema.pre<ISeller>("save", preSaveSlugMiddleware);
sellerSchema.pre<ISeller>("save", storeNameValidationMiddleware);
sellerSchema.pre("findOneAndDelete", preDeleteMiddleware);

// Apply instance methods
sellerSchema.methods.isActive = isActive;
sellerSchema.methods.softDelete = softDelete;
sellerSchema.methods.restore = restore;
sellerSchema.methods.updateRating = updateRating;
sellerSchema.methods.getDefaultAddress = getDefaultAddress;

// Apply static methods
sellerSchema.statics.findActiveSellers = findActiveSellers;
sellerSchema.statics.findByUserId = findByUserId;
sellerSchema.statics.findTopSellers = findTopSellers;

const Seller: ISellerModel = model<ISeller, ISellerModel>(
  "Seller",
  sellerSchema,
);

export default Seller;
