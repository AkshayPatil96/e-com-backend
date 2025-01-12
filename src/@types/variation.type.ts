import { Types } from "mongoose";

/**
 * IVariation interface represents the structure of a variation document in MongoDB.
 * It extends the Document interface provided by Mongoose.
 */
export interface IVariation extends Document {
  _id: Types.ObjectId; // Unique identifier for the variation
  productId: Types.ObjectId; // Reference to the associated product
  color?: string; // Color of the product (optional)
  size?: string; // Size of the product (optional)
  sku: string; // Unique SKU for this variation
  price: number; // Price for this specific variation
  quantity: number; // Available stock quantity for this variation
  storage?: string; // Storage capacity (e.g., 16GB, 32GB) for products like RAM or pen drives
  isDeleted: boolean; // Flag to indicate if the variation is deleted
}
