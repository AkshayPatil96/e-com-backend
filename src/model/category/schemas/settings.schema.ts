import { Schema } from "mongoose";
import { ICategorySettings } from "../../../@types/category.type";

/**
 * Category settings schema
 */
export const CategorySettingsSchema = new Schema<ICategorySettings>(
  {
    allowProducts: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    commissionRate: { type: Number, min: 0, max: 100 },
    featuredProductsLimit: { type: Number, min: 0, default: 10 },
    minPriceRange: { type: Number, min: 0 },
    maxPriceRange: { type: Number, min: 0 },
  },
  { _id: false },
);
