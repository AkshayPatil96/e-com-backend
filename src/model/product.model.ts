import mongoose, { Document, Model, Query, Schema } from "mongoose";
import { IProduct } from "../@types/product.type";
import ErrorHandler from "../utils/ErrorHandler";
import { convertToSlug } from "../utils/logic";
import ProductVersion from "./productVersion";
import { ImageSchema, metaDataSchema } from "./schema/common.model";
import Variation from "./variation.model";

// Extend the Mongoose Model interface to include the static method
interface IProductModel extends Model<IProduct> {
  findActiveProducts(
    additionalQuery?: Record<string, any>,
  ): Query<IProduct[], IProduct>;
  findActiveOne(query: Record<string, any>): Query<IProduct | null, IProduct>;
}

/**
 * Utility function to validate the discount and generate slug.
 * - Validates that the discount does not exceed the base price.
 * - Generates a slug from the product name.
 *
 * @param product - The product document being saved or updated.
 * @param update - The update object (for updates only).
 */
const validateProductData = (product: IProduct, update?: Partial<IProduct>) => {
  const basePrice = update?.basePrice ?? product.basePrice;
  const discount = update?.discount ?? product.discount;

  if (discount && discount > basePrice) {
    throw new ErrorHandler(
      400,
      "Discount cannot exceed the base price of the product",
    );
  }

  const name = update?.name ?? product.name;
  product.slug = convertToSlug(name);
};

/**
 * Product schema definition with fields and their validation.
 */
const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    variations: [{ type: Schema.Types.ObjectId, ref: "Variation" }],
    images: [ImageSchema],
    basePrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    stockQuantity: { type: Number, required: true },
    soldQuantity: { type: Number, default: 0 },
    sku: { type: String, required: true, unique: true },
    averageRating: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    weight: { type: Number },
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    manufacturer: { type: String },
    tags: { type: [String] },
    metadata: metaDataSchema,
    warranty: { type: String },
    returnPolicy: {
      available: { type: Boolean, default: false },
      policy: { type: String },
    },
    replacementPolicy: {
      available: { type: Boolean, default: false },
      policy: { type: String },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/**
 * Index on relevant fields for query optimization.
 */
productSchema.index({ isDeleted: 1 });
productSchema.index(
  { name: "text", description: "text" },
  { weights: { name: 5, description: 1 } },
);
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ isOnSale: 1, isFeatured: 1 });
productSchema.index({ sku: 1 }, { unique: true });

/**
 * Pre-save middleware to validate and generate slug.
 */
productSchema.pre<IProduct>("save", function (next) {
  validateProductData(this); // Validate and generate slug
  if (this.variations.length === 0 && this.stockQuantity <= 0) {
    throw new ErrorHandler(
      400,
      "Product must have variations or stock quantity greater than zero",
    );
  }

  next();
});

/**
 * Pre-update middleware for findOneAndUpdate, findByIdAndUpdate, and update operations.
 * This handles the validation and slug generation.
 */
productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as Partial<IProduct>;
  const query = this.getQuery();

  if (update.name || update.basePrice || update.discount) {
    const product = new this.model(query); // Create a temporary product object for validation
    validateProductData(product, update); // Validate and generate slug
  }
  next();
});

/**
 * Pre-remove middleware to clean up associated variations when a product is deleted.
 */
productSchema.pre("findOneAndDelete", async function (next) {
  const query = this.getQuery();
  const id = query._id;

  // Ensure variations related to this product are deleted.
  await Variation.deleteMany({ productId: id });

  next();
});

/**
 * Versioning logic: Save a new version before updating.
 */
productSchema.pre("save", async function (next) {
  if (this.isNew) return next(); // Skip for new products

  // Find the latest version number
  const latestVersion = await ProductVersion.findOne({ productId: this._id })
    .sort({ versionNumber: -1 })
    .select("versionNumber")
    .lean();

  const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  // Create a new version of the product
  const newVersion = new ProductVersion({
    productId: this._id,
    versionNumber: newVersionNumber,
    versionData: this.toObject(), // Copy the current product data
    updatedBy: this.updatedBy, // Pass in the correct user ID
  });

  await newVersion.save(); // Save the version
  next();
});

/**
 * Product methods for stock updates, price calculation, version restoration, and more.
 */
productSchema.methods.updateStock = async function (quantity: number) {
  if (quantity < 0 || this.stockQuantity < quantity) {
    throw new ErrorHandler(400, "Insufficient stock quantity");
  }
  this.stockQuantity -= quantity;
  this.soldQuantity += quantity;
  await this.save();
};

productSchema.methods.getFinalPrice = function (): number {
  let finalPrice = this.basePrice;
  if (this.discount) finalPrice -= this.discount;
  return finalPrice < 0 ? 0 : finalPrice; // Ensure final price is non-negative
};

productSchema.methods.markAsFeatured = async function (): Promise<void> {
  this.isFeatured = true;
  await this.save();
};

productSchema.methods.restoreVersion = async function (versionNumber: number) {
  const version = await ProductVersion.findOne({
    productId: this._id,
    versionNumber,
  }).lean();

  if (!version) {
    throw new ErrorHandler(404, `Version ${versionNumber} not found.`);
  }

  this.set(version.versionData); // Restore product data from the version
  await this.save(); // Save the restored product
};

productSchema.methods.softDelete = async function (): Promise<void> {
  this.isDeleted = true;
  await this.save();
};

productSchema.methods.restore = async function (): Promise<void> {
  this.isDeleted = false;
  await this.save();
};

/**
 * Static methods for finding active products.
 */
productSchema.statics.findActiveProducts = function (
  additionalQuery: Record<string, any> = {},
): Query<IProduct[], IProduct> {
  return this.find({ isDeleted: false, isPublished: true, ...additionalQuery });
};

productSchema.statics.findActiveOne = function (
  query: Record<string, any>,
): Query<IProduct | null, IProduct> {
  return this.findOne({ isDeleted: false, isPublished: true, ...query });
};

/**
 * Product model for interacting with the product collection in MongoDB.
 */
const Product: IProductModel = mongoose.model<IProduct, IProductModel>(
  "Product",
  productSchema,
);

export default Product;
