import { Schema } from "mongoose";
import { IProductShipping } from "../../../@types/product.type";

/**
 * Product Shipping Schema
 */
export const ProductShippingSchema = new Schema<IProductShipping>(
  {
    weight: {
      type: Number,
      required: [true, "Weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    dimensions: {
      length: {
        type: Number,
        required: [true, "Length is required"],
        min: [0, "Length cannot be negative"],
      },
      width: {
        type: Number,
        required: [true, "Width is required"],
        min: [0, "Width cannot be negative"],
      },
      height: {
        type: Number,
        required: [true, "Height is required"],
        min: [0, "Height cannot be negative"],
      },
    },
    shippingClass: {
      type: String,
      required: [true, "Shipping class is required"],
      trim: true,
      enum: ["standard", "express", "overnight", "free", "heavy", "fragile"],
    },
    freeShipping: {
      type: Boolean,
      default: false,
    },
    shippingCost: {
      type: Number,
      min: [0, "Shipping cost cannot be negative"],
    },
  },
  { _id: false },
);
