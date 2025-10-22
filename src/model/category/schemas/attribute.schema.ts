import { Schema } from "mongoose";
import { ICategoryAttribute } from "../../../@types/category.type";

/**
 * Category attribute schema
 */
export const CategoryAttributeSchema = new Schema<ICategoryAttribute>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["select", "multiselect", "range", "text", "boolean"],
      required: true,
    },
    values: [{ type: String, trim: true }], // For select/multiselect
    unit: { type: String, trim: true }, // For range types
    isRequired: { type: Boolean, default: false },
    isFilterable: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: true },
);
