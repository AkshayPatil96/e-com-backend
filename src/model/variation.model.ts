import mongoose, { Document, Schema } from "mongoose";
import { IVariation } from "../@types/variation.type";

/**
 * Variation schema definition with fields and their validation.
 */
const variationSchema = new Schema<IVariation>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true }, // Reference to the product
    color: { type: String }, // Optional product color
    size: { type: String }, // Optional product size
    sku: { type: String, required: true, unique: true }, // Unique SKU for this variation
    price: { type: Number, required: true }, // Price for this variation
    quantity: { type: Number, required: true, min: 0 }, // Available stock quantity
    storage: { type: String }, // Storage capacity for electronic products
    isDeleted: { type: Boolean, default: false }, // Soft delete flag
  },
  { timestamps: true },
);

/**
 * Add indexes to optimize queries on variations.
 */
variationSchema.index({ productId: 1 });
variationSchema.index({ sku: 1 }, { unique: true });
variationSchema.index({ isDeleted: 1 }); // Index for soft delete

/**
 * Pre-save hook to ensure the quantity is not negative.
 */
variationSchema.pre<IVariation>("save", function (next) {
  if (this.quantity < 0) {
    throw new Error("Quantity cannot be negative.");
  }
  next();
});

/**
 * Method to check if the variation has stock available.
 */
variationSchema.methods.isInStock = function (
  requestedQuantity: number,
): boolean {
  return this.quantity >= requestedQuantity; // Check if there is enough stock
};

/**
 * Method to reduce the stock quantity when an order is placed.
 */
variationSchema.methods.reduceStock = async function (
  requestedQuantity: number,
): Promise<void> {
  if (!this.isInStock(requestedQuantity)) {
    throw new Error("Not enough stock available");
  }
  this.quantity -= requestedQuantity; // Reduce stock
  await this.save(); // Save the updated variation
};

/**
 * Method to restock the variation.
 */
variationSchema.methods.restock = async function (
  additionalQuantity: number,
): Promise<void> {
  if (additionalQuantity < 0) {
    throw new Error("Restock quantity cannot be negative.");
  }
  this.quantity += additionalQuantity; // Increase the stock
  await this.save(); // Save the updated variation
};

/**
 * Method to get the current price after any potential discounts.
 */
variationSchema.methods.getFinalPrice = function (
  discount: number = 0,
): number {
  let finalPrice = this.price;
  if (discount) {
    finalPrice -= discount;
  }
  return finalPrice < 0 ? 0 : finalPrice; // Ensure final price is non-negative
};

/**
 * Method to soft delete the variation.
 */
variationSchema.methods.softDelete = async function (): Promise<void> {
  this.isDeleted = true; // Set the isDeleted flag to true
  await this.save(); // Save the updated variation
};

/**
 * Method to restore a soft-deleted variation.
 */
variationSchema.methods.restore = async function (): Promise<void> {
  this.isDeleted = false; // Set the isDeleted flag to false
  await this.save(); // Save the updated variation
};

/**
 * Variation model for interacting with the variation collection in MongoDB.
 */
const Variation = mongoose.model<IVariation>("Variation", variationSchema);

export default Variation;
