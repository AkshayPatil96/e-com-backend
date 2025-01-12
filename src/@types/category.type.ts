import { Document, Types } from "mongoose";
import { IImage, IMetadataSchema } from "./common.type";

// Interface for Category Schema
export interface ICategory extends Document {
  _id: Types.ObjectId;
  order: number; // Category order
  name: string;
  slug: string;
  parent?: Types.ObjectId | ICategory; // Reference to Parent Category
  ancestors: Types.ObjectId[]; // Array to store all ancestors up to the top-level category
  path: string; // Full path for breadcrumb navigation (e.g., "Clothing > Men > Shirts")
  attributes?: any; // Category-specific filters or attributes (e.g., size, color, brand)
  metadata: IMetadataSchema; // Common metadata fields
  brands: Types.ObjectId[]; // Array of brand IDs
  images: IImage[]; // Category images
  banner: IImage; // Category banner image
  description?: string; // Category description
  searchKeywords: string[]; // Keywords for search
  isDeleted: boolean; // Soft delete flag
  isFeatured: boolean; // Featured category flag
  createdBy: Types.ObjectId; // Reference to User model
  updatedBy: Types.ObjectId; // Reference to User model

  // methods
  softDelete(): Promise<void>;
  restore(): Promise<void>;
}
