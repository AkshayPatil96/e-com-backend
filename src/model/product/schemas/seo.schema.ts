import { Schema } from "mongoose";
import { IProductSEO } from "../../../@types/product.type";

/**
 * Product SEO Schema
 */
export const ProductSEOSchema = new Schema<IProductSEO>(
  {
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, "Meta title cannot exceed 60 characters"],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
    metaKeywords: [
      {
        type: String,
        trim: true,
        validate: {
          validator: function (keywords: string[]) {
            return keywords.length <= 10;
          },
          message: "Cannot have more than 10 meta keywords",
        },
      },
    ],
    focusKeyword: {
      type: String,
      trim: true,
      lowercase: true,
    },
    canonicalUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function (url: string) {
          return !url || /^https?:\/\/.+/.test(url);
        },
        message: "Canonical URL must be a valid HTTP/HTTPS URL",
      },
    },
  },
  { _id: false },
);
