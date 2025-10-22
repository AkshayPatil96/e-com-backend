import mongoose from "mongoose";
import ErrorHandler from "../../../utils/ErrorHandler";
import Category from "../../category.model";
import Product from "../../product.model";

/**
 * Soft delete a brand by setting isDeleted to true.
 * Removes brand from categories and checks for associated products.
 */
export async function softDelete(this: any): Promise<void> {
  // Check for associated active products
  const products = await Product.find({
    brand: this._id,
    isDeleted: false,
  }).exec();

  if (products.length) {
    throw new ErrorHandler(
      400,
      "Cannot delete brand with associated active products",
    );
  }

  // Remove brand from all categories
  await Category.updateMany(
    { brands: this._id },
    { $pull: { brands: this._id } },
  ).exec();

  this.isDeleted = true;
  await this.save();
}

/**
 * Restore a soft-deleted brand by setting isDeleted to false.
 */
export async function restore(this: any): Promise<void> {
  this.isDeleted = false;
  await this.save();
}

/**
 * Add brand to a category
 */
export async function addToCategory(
  this: any,
  categoryId: string,
): Promise<void> {
  if (!this.categories.includes(categoryId as any)) {
    this.categories.push(categoryId as any);
    await this.save();

    // Add brand to category as well
    await Category.findByIdAndUpdate(categoryId, {
      $addToSet: { brands: this._id },
    });
  }
}

/**
 * Remove brand from a category
 */
export async function removeFromCategory(
  this: any,
  categoryId: string,
): Promise<void> {
  this.categories = this.categories.filter(
    (id: mongoose.Types.ObjectId) => id.toString() !== categoryId,
  );
  await this.save();

  // Remove brand from category as well
  await Category.findByIdAndUpdate(categoryId, { $pull: { brands: this._id } });
}
