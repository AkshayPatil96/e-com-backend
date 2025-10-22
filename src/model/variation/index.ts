import { Schema, model } from "mongoose";
import type { IEnhancedVariation } from "../../@types/variation.type";

// Import enhanced schemas
import {
  VariationAnalyticsSchema,
  VariationAttributesSchema,
  VariationInventorySchema,
  VariationPricingSchema,
  VariationSEOSchema,
  type IVariationAnalytics,
  type IVariationAttributes,
  type IVariationInventory,
  type IVariationPricing,
  type IVariationSEO,
} from "./schemas";

// Import middleware
import {
  postSaveMiddleware,
  postUpdateMiddleware,
  preRemoveMiddleware,
  preSaveMiddleware,
  preUpdateMiddleware,
} from "./middleware/pre-save.middleware";

import {
  inventoryPostSaveMiddleware,
  inventoryPreSaveMiddleware,
  inventoryPreUpdateMiddleware,
} from "./middleware/inventory.middleware";

// Import methods
import { instanceMethods } from "./methods/instance.methods";
import { staticMethods } from "./methods/static.methods";

// Import utilities
import { analyticsUtils } from "./utils/analytics.utils";
import { seoUtils } from "./utils/seo.utils";

/**
 * Enhanced variation schema with all features
 */
const EnhancedVariationSchema = new Schema<IEnhancedVariation>(
  {
    // Core fields (maintaining backward compatibility)
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
      index: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      index: true,
    },

    // Legacy fields (for backward compatibility)
    color: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
    storage: {
      type: String,
      trim: true,
    },

    // Enhanced schema fields
    pricing: {
      type: VariationPricingSchema,
      default: () => ({}),
    },
    inventory: {
      type: VariationInventorySchema,
      default: () => ({}),
    },
    attributes: {
      type: VariationAttributesSchema,
      default: () => ({}),
    },
    analytics: {
      type: VariationAnalyticsSchema,
      default: () => ({}),
    },
    seo: {
      type: VariationSEOSchema,
      default: () => ({}),
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletionReason: String,

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Add compound indexes for better query performance
EnhancedVariationSchema.index({ productId: 1, isDeleted: 1 });
EnhancedVariationSchema.index({
  productId: 1,
  "attributes.color.name": 1,
  isDeleted: 1,
});
EnhancedVariationSchema.index({
  productId: 1,
  "attributes.size.value": 1,
  isDeleted: 1,
});
EnhancedVariationSchema.index({ "pricing.basePrice": 1, isDeleted: 1 });
EnhancedVariationSchema.index({ "inventory.quantity": 1, isDeleted: 1 });
EnhancedVariationSchema.index({ "analytics.performance.popularityScore": -1 });
EnhancedVariationSchema.index({ "seo.metadata.slug": 1 });

// Add text index for search
EnhancedVariationSchema.index({
  sku: "text",
  "attributes.color.name": "text",
  "attributes.size.value": "text",
  "seo.metadata.keywords": "text",
  "seo.searchOptimization.searchKeywords": "text",
  // Legacy fields
  color: "text",
  size: "text",
  storage: "text",
});

// Add pre-save middleware
EnhancedVariationSchema.pre("save", preSaveMiddleware);
EnhancedVariationSchema.pre("save", inventoryPreSaveMiddleware);

// Add pre-update middleware
EnhancedVariationSchema.pre(
  ["updateOne", "findOneAndUpdate"],
  preUpdateMiddleware,
);
EnhancedVariationSchema.pre(
  ["updateOne", "findOneAndUpdate"],
  inventoryPreUpdateMiddleware,
);

// Add post-save middleware
EnhancedVariationSchema.post("save", function (doc: any, next: Function) {
  postSaveMiddleware.call(doc, next);
});
EnhancedVariationSchema.post("save", function (doc: any, next: Function) {
  inventoryPostSaveMiddleware.call(doc, next);
});

// Add post-update middleware
EnhancedVariationSchema.post(
  ["updateOne", "findOneAndUpdate"],
  postUpdateMiddleware,
);

// Add pre-remove middleware
EnhancedVariationSchema.pre(
  ["deleteOne", "findOneAndDelete"],
  preRemoveMiddleware,
);

// Add instance methods
Object.keys(instanceMethods).forEach((methodName) => {
  EnhancedVariationSchema.methods[methodName] = (instanceMethods as any)[
    methodName
  ];
});

// Add static methods
Object.keys(staticMethods).forEach((methodName) => {
  EnhancedVariationSchema.statics[methodName] = (staticMethods as any)[
    methodName
  ];
});

// Add virtual for backward compatibility
EnhancedVariationSchema.virtual("displayPrice").get(function () {
  return this.pricing?.basePrice || this.price || 0;
});

EnhancedVariationSchema.virtual("inStock").get(function () {
  return (this.inventory?.quantity || this.quantity || 0) > 0;
});

EnhancedVariationSchema.virtual("availableStock").get(function () {
  if (this.inventory) {
    return Math.max(
      0,
      this.inventory.quantity - (this.inventory.reservedQuantity || 0),
    );
  }
  return this.quantity || 0;
});

// Create and export the model
export const EnhancedVariation = model<IEnhancedVariation>(
  "Variation",
  EnhancedVariationSchema,
);

// Export for backward compatibility
export const Variation = EnhancedVariation;

// Export types and utilities
export type {
  IVariationAnalytics,
  IVariationAttributes,
  IVariationInventory,
  IVariationPricing,
  IVariationSEO,
};

export { analyticsUtils, seoUtils };

// Export schema for testing or extending
export { EnhancedVariationSchema };

export default EnhancedVariation;
