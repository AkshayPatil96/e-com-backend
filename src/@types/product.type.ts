import { Document, Types } from "mongoose";
import { IImage, IMetadataSchema } from "./common.type";
import { ICategory } from "./category.type";
import { IVariation } from "./variation.type";

/**
 * IProduct interface represents the structure of a product document in MongoDB.
 * It extends the Document interface provided by Mongoose.
 */
export interface IProduct extends Document {
  _id: Types.ObjectId; // Unique identifier for the product
  name: string; // Name of the product
  slug: string; // Slug for the product URL
  description: string; // Description of the product
  brand: string; // Brand of the product
  category: ICategory; // Main category of the product
  variations: IVariation[]; // Array of product variations
  images: IImage[]; // Array of image URLs for the product
  basePrice: number; // Base price of the product
  discount?: number; // Discount percentage for the product
  stockQuantity: number; // Available stock quantity of the product
  soldQuantity: number; // Total quantity sold of the product
  sku: string; // Stock Keeping Unit (SKU) of the product
  averageRating: number; // Average rating of the product
  isFeatured?: boolean; // Flag to indicate if the product is featured
  isOnSale?: boolean; // Flag to indicate if the product is on sale
  isPublished?: boolean; // Flag to indicate if the product is published
  weight?: number; // Weight of the product in grams
  dimensions?: {
    length: number; // Length of the product in centimeters
    width: number; // Width of the product in centimeters
    height: number; // Height of the product in centimeters
  };
  seller: Types.ObjectId; // Reference to the seller of the product
  manufacturer?: string; // Manufacturer of the product
  tags?: string[]; // Array of tags associated with the product
  metadata?: IMetadataSchema; // Metadata for the product
  warranty?: string; // Warranty information for the product
  returnPolicy?: {
    available: boolean; // Flag to indicate if the product has a return policy
    policy: string; // Return policy for the product
  };
  replacementPolicy?: {
    available: boolean; // Flag to indicate if the product has a replacement policy
    policy: string; // Replacement policy for the product
  };
  createdBy: Types.ObjectId; // Reference to the user who created the product
  updatedBy: Types.ObjectId; // Reference to the user who last updated the product

  createdAt: Date; // Timestamp when the product was created
  updatedAt: Date; // Timestamp when the product was last updated
  isDeleted: boolean; // Flag to indicate if the product is deleted

  // methods
  softDelete(): void; // Method to soft delete the product
  restore(): void; // Method to restore the soft deleted product
}
