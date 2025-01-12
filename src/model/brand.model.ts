import mongoose, { Document, Schema } from "mongoose";
import { convertToSlug } from "../utils/logic";
import { ImageSchema } from "./schema/common.model";
import { IBrand } from "../@types/brand.type";
import Category from "./category.model";
import ErrorHandler from "../utils/ErrorHandler";
import Product from "./product.model";

const brandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    logo: { type: ImageSchema },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => /^https?:\/\//.test(v),
        message: "Website must be a valid URL",
      },
    },
    categories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Pre-save hook to update the updatedAt timestamp
brandSchema.pre<IBrand>("save", function (next) {
  if (this.name) this.slug = convertToSlug(this.name);
  next();
});

// Indexing the name field for better search performance
brandSchema.index({ name: 1 });

/**
 * Soft delete a category by setting isDeleted to true.
 * If associated with products, it throws an error.
 * If associated with categories, it removes the brand from the categories.
 * If not associated with any products, it proceeds with deletion.
 *  @throws {Error} If brand has associated products
 * @returns {Promise<void>}
 * @throws {Error} If brand has associated products
 *
 */
brandSchema.methods.softDelete = async function (): Promise<void> {
  const products = await Product.find({ brand: this._id }).exec();
  if (products.length)
    throw new ErrorHandler(400, "Cannot delete brand associated with products");

  await Category.updateMany(
    { brands: this._id },
    { $pull: { brands: this._id } },
  ).exec();

  this.isDeleted = true;
  await this.save();
};

/**
 * Restore a soft-deleted category by setting isDeleted to false.
 */
brandSchema.methods.restore = async function (): Promise<void> {
  this.isDeleted = false;
  await this.save();
};

/**
 * Pre-delete middleware to prevent deletion of brands with associated products.
 * If associated with products, it throws an error.
 * If associated with categories, it removes the brand from the categories.
 * If not associated with any products, it proceeds with deletion.
 * @param next
 * @returns
 * @throws {Error} If brand has associated products
 */
brandSchema.pre("findOneAndDelete", async function (next) {
  const query = this.getQuery();
  const brandId = query._id;

  const products = await Product.find({ brand: brandId }).exec();
  if (products.length)
    return next(
      new ErrorHandler(400, "Cannot delete brand with associated products"),
    );

  await Category.updateMany(
    { brands: brandId },
    { $pull: { brands: brandId } },
  ).exec();

  next();
});

const Brand = mongoose.model<IBrand>("Brand", brandSchema);

export default Brand;
