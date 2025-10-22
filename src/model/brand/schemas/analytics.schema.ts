import { Schema } from "mongoose";
import { IBrandAnalytics } from "../../../@types/brand.type";

/**
 * Brand analytics schema
 */
export const BrandAnalyticsSchema = new Schema<IBrandAnalytics>(
  {
    productCount: { type: Number, default: 0, min: 0 },
    totalSales: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
    searchCount: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false },
);
