import { Schema } from "mongoose";
import { IBrandBusinessInfo } from "../../../@types/brand.type";

/**
 * Brand business information schema
 */
export const BrandBusinessInfoSchema = new Schema<IBrandBusinessInfo>(
  {
    foundingYear: {
      type: Number,
      min: [1800, "Founding year cannot be earlier than 1800"],
      max: [new Date().getFullYear(), "Founding year cannot be in the future"],
    },
    originCountry: { type: String, trim: true, maxlength: 100 },
    headquarters: { type: String, trim: true, maxlength: 200 },
    parentCompany: { type: String, trim: true, maxlength: 100 },
    legalName: { type: String, trim: true, maxlength: 200 },
    registrationNumber: { type: String, trim: true, maxlength: 50 },
    taxId: { type: String, trim: true, maxlength: 50 },
  },
  { _id: false },
);
