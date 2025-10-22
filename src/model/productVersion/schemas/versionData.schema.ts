/**
 * Version Data Schema
 * Comprehensive schema for product version data management
 */

import { Schema } from "mongoose";
import { IVersionData } from "../../../@types/productVersion";

export const versionDataSchema = new Schema<IVersionData>(
  {
    // Core product data at this version
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    price: {
      basePrice: {
        type: Number,
        required: [true, "Base price is required"],
        min: [0, "Price cannot be negative"],
      },
      salePrice: {
        type: Number,
        min: [0, "Sale price cannot be negative"],
        validate: {
          validator: function (this: IVersionData, value: number) {
            return !value || value <= this.price.basePrice;
          },
          message: "Sale price cannot be higher than base price",
        },
      },
      currency: {
        type: String,
        default: "USD",
        enum: ["USD", "EUR", "GBP", "INR", "CAD", "AUD"],
        uppercase: true,
      },
    },

    // Category and classification
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    subcategory: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },

    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Brand is required"],
    },

    // Product specifications
    specifications: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },

    // Product attributes and features
    attributes: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        value: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ["text", "number", "boolean", "date", "url"],
          default: "text",
        },
      },
    ],

    // Media and assets
    media: {
      images: [
        {
          url: {
            type: String,
            required: true,
          },
          alt: {
            type: String,
            default: "",
          },
          isPrimary: {
            type: Boolean,
            default: false,
          },
          order: {
            type: Number,
            default: 0,
          },
        },
      ],
      videos: [
        {
          url: {
            type: String,
            required: true,
          },
          thumbnail: String,
          duration: Number,
          title: String,
        },
      ],
      documents: [
        {
          url: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            enum: ["manual", "warranty", "specification", "certificate"],
            required: true,
          },
          size: Number,
        },
      ],
    },

    // Inventory information
    inventory: {
      sku: {
        type: String,
        required: [true, "SKU is required"],
        unique: true,
        trim: true,
        uppercase: true,
      },
      stock: {
        type: Number,
        required: [true, "Stock quantity is required"],
        min: [0, "Stock cannot be negative"],
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
        min: [0, "Low stock threshold cannot be negative"],
      },
      trackInventory: {
        type: Boolean,
        default: true,
      },
    },

    // SEO and marketing
    seo: {
      metaTitle: {
        type: String,
        maxlength: [60, "Meta title cannot exceed 60 characters"],
      },
      metaDescription: {
        type: String,
        maxlength: [160, "Meta description cannot exceed 160 characters"],
      },
      keywords: [
        {
          type: String,
          trim: true,
        },
      ],
      slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
    },

    // Product status and visibility
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "discontinued"],
      default: "draft",
    },

    visibility: {
      type: String,
      enum: ["public", "private", "hidden"],
      default: "private",
    },

    // Shipping and dimensions
    shipping: {
      weight: {
        type: Number,
        min: [0, "Weight cannot be negative"],
      },
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
          type: String,
          enum: ["cm", "in"],
          default: "cm",
        },
      },
      shippingClass: {
        type: String,
        enum: ["standard", "heavy", "fragile", "hazardous"],
        default: "standard",
      },
    },

    // Variations reference
    variations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Variation",
      },
    ],

    // Tags and labels
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Additional metadata
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
  },
  {
    _id: false,
    timestamps: false,
  },
);

// Indexes for better performance
versionDataSchema.index({ "inventory.sku": 1 });
versionDataSchema.index({ category: 1, brand: 1 });
versionDataSchema.index({ "seo.slug": 1 });
versionDataSchema.index({ status: 1, visibility: 1 });
versionDataSchema.index({ "price.basePrice": 1 });

// Validation middleware
versionDataSchema.pre("validate", function () {
  // Ensure at least one primary image
  if (this.media?.images?.length > 0) {
    const primaryImages = this.media.images.filter((img) => img.isPrimary);
    if (primaryImages.length === 0) {
      this.media.images[0].isPrimary = true;
    } else if (primaryImages.length > 1) {
      // Keep only the first primary image
      this.media.images.forEach((img, index) => {
        if (index > 0) img.isPrimary = false;
      });
    }
  }

  // Generate slug if not provided
  if (!this.seo?.slug && this.title) {
    this.seo = this.seo || {};
    this.seo.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }
});

export default versionDataSchema;
