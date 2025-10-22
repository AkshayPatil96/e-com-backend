import { Schema } from "mongoose";
import { IProductPricing } from "../../../@types/product.type";

/**
 * Product Pricing Schema
 */
export const ProductPricingSchema = new Schema<IProductPricing>(
  {
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    comparePrice: {
      type: Number,
      min: [0, "Compare price cannot be negative"],
    },
    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      default: "USD",
      uppercase: true,
      enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"],
    },
    taxIncluded: {
      type: Boolean,
      default: false,
    },
    taxRate: {
      type: Number,
      min: [0, "Tax rate cannot be negative"],
      max: [100, "Tax rate cannot exceed 100%"],
    },
  },
  { _id: false },
);
