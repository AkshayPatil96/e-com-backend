import mongoose from "mongoose";
import { IProduct, ProductStatus } from "../../../@types/product.type";

/**
 * Product Management Instance Methods
 */

/**
 * Soft delete a product
 */
export const softDelete = async function (
  this: IProduct,
  deletedBy: mongoose.Types.ObjectId,
): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.status = ProductStatus.ARCHIVED;
  await this.save();
};

/**
 * Restore a soft-deleted product
 */
export const restore = async function (this: IProduct): Promise<void> {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.status = ProductStatus.DRAFT; // Restore to draft for review
  await this.save();
};

/**
 * Update stock quantity
 */
export const updateStock = async function (
  this: IProduct,
  quantity: number,
  operation: "add" | "subtract" | "set" = "set",
): Promise<void> {
  const currentStock = this.inventory.stockQuantity;

  switch (operation) {
    case "add":
      this.inventory.stockQuantity = currentStock + quantity;
      break;
    case "subtract":
      this.inventory.stockQuantity = Math.max(0, currentStock - quantity);
      break;
    case "set":
      this.inventory.stockQuantity = Math.max(0, quantity);
      break;
  }

  await this.save();
};

/**
 * Reserve stock for pending orders
 */
export const reserveStock = async function (
  this: IProduct,
  quantity: number,
): Promise<boolean> {
  const availableStock =
    this.inventory.stockQuantity - this.inventory.reservedQuantity;

  if (availableStock >= quantity) {
    this.inventory.reservedQuantity += quantity;
    await this.save();
    return true;
  }

  return false;
};

/**
 * Release reserved stock
 */
export const releaseReservedStock = async function (
  this: IProduct,
  quantity: number,
): Promise<void> {
  this.inventory.reservedQuantity = Math.max(
    0,
    this.inventory.reservedQuantity - quantity,
  );
  await this.save();
};
