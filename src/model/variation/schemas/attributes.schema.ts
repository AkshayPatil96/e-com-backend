import { Schema } from "mongoose";
import type { IVariationAttributes } from "../../../@types/variation.type";

/**
 * Enhanced attributes schema for variations with comprehensive product characteristics
 */
export const VariationAttributesSchema = new Schema<IVariationAttributes>(
  {
    color: {
      name: {
        type: String,
        trim: true,
        maxlength: [50, "Color name cannot exceed 50 characters"],
      },
      code: {
        type: String,
        trim: true,
        validate: {
          validator: function (v: string) {
            return (
              !v ||
              /^#[0-9A-F]{6}$/i.test(v) ||
              /^rgb\(/i.test(v) ||
              /^rgba\(/i.test(v)
            );
          },
          message:
            "Color code must be a valid hex code (#RRGGBB), rgb(), or rgba() format",
        },
      },
      family: {
        type: String,
        trim: true,
        maxlength: [30, "Color family cannot exceed 30 characters"],
      },
    },

    size: {
      value: {
        type: String,
        required: false,
        trim: true,
        maxlength: [20, "Size value cannot exceed 20 characters"],
      },
      type: {
        type: String,
        enum: ["clothing", "shoe", "ring", "custom"],
        default: "clothing",
      },
      measurements: {
        length: { type: Number, min: [0, "Length cannot be negative"] },
        width: { type: Number, min: [0, "Width cannot be negative"] },
        height: { type: Number, min: [0, "Height cannot be negative"] },
        weight: { type: Number, min: [0, "Weight cannot be negative"] },
        unit: {
          type: String,
          enum: ["cm", "inch", "mm", "m", "kg", "lb", "g"],
        },
      },
    },

    material: {
      primary: {
        type: String,
        trim: true,
        maxlength: [100, "Primary material cannot exceed 100 characters"],
      },
      secondary: [
        {
          type: String,
          trim: true,
          maxlength: [100, "Secondary material cannot exceed 100 characters"],
        },
      ],
      composition: [
        {
          material: {
            type: String,
            required: true,
            trim: true,
            maxlength: [50, "Material name cannot exceed 50 characters"],
          },
          percentage: {
            type: Number,
            required: true,
            min: [0, "Percentage cannot be negative"],
            max: [100, "Percentage cannot exceed 100"],
          },
        },
      ],
      care: [
        {
          type: String,
          trim: true,
          maxlength: [200, "Care instruction cannot exceed 200 characters"],
        },
      ],
    },

    style: {
      pattern: {
        type: String,
        trim: true,
        maxlength: [50, "Pattern description cannot exceed 50 characters"],
      },
      texture: {
        type: String,
        trim: true,
        maxlength: [50, "Texture description cannot exceed 50 characters"],
      },
      finish: {
        type: String,
        trim: true,
        maxlength: [50, "Finish description cannot exceed 50 characters"],
      },
      theme: {
        type: String,
        trim: true,
        maxlength: [50, "Theme description cannot exceed 50 characters"],
      },
    },

    compliance: {
      certifications: [
        {
          type: String,
          trim: true,
          maxlength: [50, "Certification cannot exceed 50 characters"],
        },
      ],
      standards: [
        {
          type: String,
          trim: true,
          maxlength: [50, "Standard cannot exceed 50 characters"],
        },
      ],
      origin: {
        type: String,
        trim: true,
        maxlength: [50, "Country of origin cannot exceed 50 characters"],
      },
      careGuarantee: {
        duration: {
          type: Number,
          min: [0, "Guarantee duration cannot be negative"],
        },
        unit: {
          type: String,
          enum: ["days", "months", "years"],
        },
        type: {
          type: String,
          enum: ["manufacturer", "store", "extended"],
        },
        coverage: [
          {
            type: String,
            trim: true,
            maxlength: [
              100,
              "Guarantee coverage description cannot exceed 100 characters",
            ],
          },
        ],
      },
    },

    custom: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: [50, "Custom attribute name cannot exceed 50 characters"],
        },
        value: Schema.Types.Mixed,
        type: {
          type: String,
          enum: ["string", "number", "boolean", "date"],
          required: true,
        },
        unit: {
          type: String,
          trim: true,
          maxlength: [20, "Unit cannot exceed 20 characters"],
        },
      },
    ],

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false, // This is a subdocument schema
  },
);

// Add validation for composition percentages
VariationAttributesSchema.pre("validate", function () {
  if (this.material?.composition && this.material.composition.length > 0) {
    const totalPercentage = this.material.composition.reduce(
      (sum, comp) => sum + comp.percentage,
      0,
    );
    if (totalPercentage > 100) {
      throw new Error("Total material composition cannot exceed 100%");
    }
  }
});
