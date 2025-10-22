import { Schema } from "mongoose";
import { IProductAnalytics } from "../../../@types/product.type";

/**
 * Product Analytics Schema
 */
export const ProductAnalyticsSchema = new Schema<IProductAnalytics>(
  {
    viewCount: {
      type: Number,
      default: 0,
      min: [0, "View count cannot be negative"],
    },
    wishlistCount: {
      type: Number,
      default: 0,
      min: [0, "Wishlist count cannot be negative"],
    },
    cartAddCount: {
      type: Number,
      default: 0,
      min: [0, "Cart add count cannot be negative"],
    },
    purchaseCount: {
      type: Number,
      default: 0,
      min: [0, "Purchase count cannot be negative"],
    },
    conversionRate: {
      type: Number,
      default: 0,
      min: [0, "Conversion rate cannot be negative"],
      max: [100, "Conversion rate cannot exceed 100%"],
    },
    lastViewedAt: {
      type: Date,
    },
  },
  { _id: false },
);
