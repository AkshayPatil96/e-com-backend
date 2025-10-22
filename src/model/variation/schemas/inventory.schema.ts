import { Schema } from "mongoose";

/**
 * Enhanced inventory schema for variations with comprehensive stock management
 */
export interface IVariationInventory {
  quantity: number; // Current stock quantity
  reservedQuantity: number; // Quantity reserved for pending orders
  availableQuantity: number; // Available quantity (calculated field)
  reorderPoint: number; // Minimum stock level before reordering
  maxStockLevel?: number; // Maximum stock level to maintain
  lastRestockDate?: Date; // Last time stock was replenished
  restockQuantity?: number; // Last restock amount
  stockLocation?: string; // Warehouse/storage location
  trackInventory: boolean; // Whether to track inventory for this variation
  allowBackorders: boolean; // Whether to allow orders when out of stock
  backorderLimit?: number; // Maximum backorder quantity allowed
  lowStockThreshold: number; // Threshold for low stock alerts
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | "discontinued"; // Current stock status
  stockMovements: {
    type: "in" | "out" | "adjustment" | "reserved" | "unreserved";
    quantity: number;
    reason: string;
    date: Date;
    reference?: string; // Order ID, adjustment ID, etc.
  }[]; // Stock movement history
  demandForecast?: {
    period: "daily" | "weekly" | "monthly";
    expectedDemand: number;
    confidenceLevel: number; // 0-100%
    lastUpdated: Date;
  }; // Demand forecasting data
}

export const VariationInventorySchema = new Schema<IVariationInventory>(
  {
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Quantity cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, "Reserved quantity cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Reserved quantity must be an integer",
      },
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: [0, "Available quantity cannot be negative"],
    },
    reorderPoint: {
      type: Number,
      required: true,
      default: 5,
      min: [0, "Reorder point cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Reorder point must be an integer",
      },
    },
    maxStockLevel: {
      type: Number,
      min: [0, "Max stock level cannot be negative"],
      validate: {
        validator: function (this: IVariationInventory, value: number) {
          return !value || value >= this.reorderPoint;
        },
        message:
          "Max stock level must be greater than or equal to reorder point",
      },
    },
    lastRestockDate: {
      type: Date,
    },
    restockQuantity: {
      type: Number,
      min: [0, "Restock quantity cannot be negative"],
    },
    stockLocation: {
      type: String,
      trim: true,
      maxlength: [100, "Stock location cannot exceed 100 characters"],
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
    allowBackorders: {
      type: Boolean,
      default: false,
    },
    backorderLimit: {
      type: Number,
      min: [0, "Backorder limit cannot be negative"],
      validate: {
        validator: function (this: IVariationInventory, value: number) {
          return !this.allowBackorders || (value && value > 0);
        },
        message: "Backorder limit is required when backorders are allowed",
      },
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      default: 10,
      min: [0, "Low stock threshold cannot be negative"],
    },
    stockStatus: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock", "discontinued"],
      default: "in_stock",
    },
    stockMovements: [
      {
        type: {
          type: String,
          enum: ["in", "out", "adjustment", "reserved", "unreserved"],
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          validate: {
            validator: Number.isInteger,
            message: "Movement quantity must be an integer",
          },
        },
        reason: {
          type: String,
          required: true,
          trim: true,
          maxlength: [200, "Movement reason cannot exceed 200 characters"],
        },
        date: {
          type: Date,
          required: true,
          default: Date.now,
        },
        reference: {
          type: String,
          trim: true,
          maxlength: [100, "Movement reference cannot exceed 100 characters"],
        },
      },
    ],
    demandForecast: {
      period: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
      },
      expectedDemand: {
        type: Number,
        min: [0, "Expected demand cannot be negative"],
      },
      confidenceLevel: {
        type: Number,
        min: [0, "Confidence level cannot be less than 0"],
        max: [100, "Confidence level cannot exceed 100"],
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { _id: false },
);
