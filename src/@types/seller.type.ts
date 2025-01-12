import { Document, Types } from "mongoose";
import { IImage, IMetadataSchema } from "./common.type";

/**
 * ISeller interface represents the structure of a seller document in MongoDB.
 * It extends the Document interface provided by Mongoose.
 */
export interface ISeller extends Document {
  userId: Types.ObjectId; // Reference to the user who is the seller
  storeName: string; // Name of the seller's store
  slug: string; // Slug for the seller's store URL
  storeDescription?: string; // Description of the store
  categories: Types.ObjectId[]; // Array of product IDs listed by the seller
  contactEmail: string; // Seller's contact email
  phoneNumber?: string; // Seller's contact number
  address?: string; // Seller's address
  status: "active" | "suspended" | "pending"; // Status of the seller account
  metadata: IMetadataSchema; // Metadata for the seller
  image: IImage; // Image of the seller
  banner?: IImage; // Banner image for the seller's store
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  isDeleted: boolean; // Flag to indicate if the seller is deleted

  // methods
  isActive(): boolean; // Method to check if the seller is active
  softDelete(): void; // Method to soft delete the seller
  restore(): void; // Method to restore a soft-deleted seller
}
