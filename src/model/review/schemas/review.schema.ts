import { Schema } from "mongoose";
import { IProductReview } from "../../../@types/product.type";
import { ImageSchema } from "../../schema/common.model";

/**
 * Product Review Schema for individual reviews
 * Handles user reviews, ratings, helpful votes, and moderation
 */
export const ReviewSchema = new Schema<IProductReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Review title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      minlength: [10, "Review comment must be at least 10 characters"],
      maxlength: [1000, "Review comment cannot exceed 1000 characters"],
    },
    images: {
      type: [ImageSchema],
      validate: {
        validator: function (images: any[]) {
          return images.length <= 5;
        },
        message: "Cannot upload more than 5 images per review",
      },
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    isRecommended: {
      type: Boolean,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: [0, "Helpful votes cannot be negative"],
      index: true,
    },
    helpfulVotedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ], // Track who voted helpful to prevent duplicate votes
    reportedCount: {
      type: Number,
      default: 0,
      min: [0, "Reported count cannot be negative"],
      index: true,
    },
    reportedBy: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        reason: {
          type: String,
          required: [true, "Report reason is required"],
          trim: true,
          maxlength: [200, "Report reason cannot exceed 200 characters"],
        },
        reportedAt: {
          type: Date,
          default: Date.now,
          required: true,
        },
      },
    ], // Track who reported and why
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: {
      type: Date,
    },
    moderationReason: {
      type: String,
      trim: true,
      maxlength: [300, "Moderation reason cannot exceed 300 characters"],
    },
    // Additional useful fields for analytics
    deviceInfo: {
      type: String,
      trim: true,
    },
    locationInfo: {
      country: String,
      region: String,
    },
    reviewSource: {
      type: String,
      enum: ["website", "mobile_app", "imported", "api"],
      default: "website",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/**
 * Indexes for query optimization
 */
ReviewSchema.index({ product: 1, isVisible: 1 });
ReviewSchema.index({ user: 1 });
ReviewSchema.index({ product: 1, rating: 1 });
ReviewSchema.index({ product: 1, isVerifiedPurchase: 1 });
ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ helpfulVotes: -1 });
ReviewSchema.index({ reportedCount: 1 });

// Compound index for efficient filtering
ReviewSchema.index({
  product: 1,
  isVisible: 1,
  isVerifiedPurchase: 1,
  rating: 1,
});

// Index for moderation queries
ReviewSchema.index({
  isVisible: 1,
  reportedCount: 1,
  moderatedAt: 1,
});

// Text index for searching reviews
ReviewSchema.index({
  title: "text",
  comment: "text",
});

/**
 * Virtual properties
 */
ReviewSchema.virtual("helpfulPercentage").get(function () {
  const totalVotes = this.helpfulVotedBy.length;
  return totalVotes > 0 ? (this.helpfulVotes / totalVotes) * 100 : 0;
});

ReviewSchema.virtual("isReported").get(function () {
  return this.reportedCount > 0;
});

ReviewSchema.virtual("needsModeration").get(function () {
  return this.reportedCount >= 3 && this.isVisible && !this.moderatedAt;
});
