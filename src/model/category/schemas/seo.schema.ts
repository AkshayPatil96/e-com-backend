import { Schema } from "mongoose";
import { ICategorySEO } from "../../../@types/category.type";

/**
 * Category SEO schema
 */
export const CategorySEOSchema = new Schema<ICategorySEO>(
  {
    metaTitle: { type: String, trim: true, maxlength: 60 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    metaKeywords: [{ type: String, trim: true }],
    canonicalUrl: { type: String, trim: true },
    ogTitle: { type: String, trim: true, maxlength: 60 },
    ogDescription: { type: String, trim: true, maxlength: 160 },
    ogImage: { type: Schema.Types.Mixed }, // IImage type
  },
  { _id: false },
);
