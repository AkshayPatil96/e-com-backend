import mongoose, { Schema } from "mongoose";
import { IProductReviewSummary } from "../../../@types/product.type";

/**
 * Product Review Summary Schema
 */
export const ProductReviewSummarySchema = new Schema<IProductReviewSummary>(
  {
    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Average rating cannot be negative"],
      max: [5, "Average rating cannot exceed 5"],
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, "Total reviews cannot be negative"],
    },
    totalVerifiedReviews: {
      type: Number,
      default: 0,
      min: [0, "Total verified reviews cannot be negative"],
    },
    totalRecommendations: {
      type: Number,
      default: 0,
      min: [0, "Total recommendations cannot be negative"],
    },
    ratingDistribution: {
      1: {
        type: Number,
        default: 0,
        min: [0, "1-star rating count cannot be negative"],
      },
      2: {
        type: Number,
        default: 0,
        min: [0, "2-star rating count cannot be negative"],
      },
      3: {
        type: Number,
        default: 0,
        min: [0, "3-star rating count cannot be negative"],
      },
      4: {
        type: Number,
        default: 0,
        min: [0, "4-star rating count cannot be negative"],
      },
      5: {
        type: Number,
        default: 0,
        min: [0, "5-star rating count cannot be negative"],
      },
    },
    recentReviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
        validate: {
          validator: function (reviews: mongoose.Types.ObjectId[]) {
            return reviews.length <= 10;
          },
          message: "Cannot store more than 10 recent reviews",
        },
      },
    ],
  },
  { _id: false },
);
