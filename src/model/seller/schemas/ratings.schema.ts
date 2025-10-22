import { Schema } from "mongoose";
import { ISellerRatings } from "../../../@types/seller.type";

/**
 * Seller ratings schema
 */
export const SellerRatingsSchema = new Schema<ISellerRatings>(
  {
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0, min: 0 },
    ratingBreakdown: {
      5: { type: Number, default: 0, min: 0 },
      4: { type: Number, default: 0, min: 0 },
      3: { type: Number, default: 0, min: 0 },
      2: { type: Number, default: 0, min: 0 },
      1: { type: Number, default: 0, min: 0 },
    },
  },
  { _id: false },
);
