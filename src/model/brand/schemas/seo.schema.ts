import { Schema } from "mongoose";
import { IBrandSEO } from "../../../@types/brand.type";
import { ImageSchema } from "../../schema/common.model";

/**
 * Brand SEO schema
 */
export const BrandSEOSchema = new Schema<IBrandSEO>(
  {
    metaTitle: { type: String, trim: true, maxlength: 60 },
    metaDescription: { type: String, trim: true, maxlength: 160 },
    metaKeywords: [{ type: String, trim: true }],
    canonicalUrl: { type: String, trim: true },
    ogTitle: { type: String, trim: true, maxlength: 60 },
    ogDescription: { type: String, trim: true, maxlength: 160 },
    ogImage: ImageSchema,
  },
  { _id: false },
);
