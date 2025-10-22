import { Schema } from "mongoose";
import { IProductInventory } from "../../../@types/product.type";

/**
 * Product Inventory Schema
 */
export const ProductInventorySchema = new Schema<IProductInventory>(
  {
    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock quantity cannot be negative"],
      default: 0,
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: [0, "Sold quantity cannot be negative"],
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, "Reserved quantity cannot be negative"],
    },
    reorderLevel: {
      type: Number,
      required: [true, "Reorder level is required"],
      min: [0, "Reorder level cannot be negative"],
      default: 5,
    },
    maxOrderQuantity: {
      type: Number,
      min: [1, "Max order quantity must be at least 1"],
    },
    trackQuantity: {
      type: Boolean,
      default: true,
    },
    allowBackorder: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);
