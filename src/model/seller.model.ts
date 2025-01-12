import mongoose, { Schema, Types, model } from "mongoose";
import { ISeller } from "../@types/seller.type";
import { convertToSlug } from "../utils/logic";
import ErrorHandler from "../utils/ErrorHandler";
import Product from "./product.model";
import { metaDataSchema } from "./schema/common.model";

const deleteCheck = async (id: string | Types.ObjectId, query: any) => {
  const products = await Product.find({ seller: id, status: "active" });
  if (products.length)
    return query.next(
      new ErrorHandler(400, "Cannot delete seller with active products"),
    );
};

/**
 * Seller schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const sellerSchema = new Schema<ISeller>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  storeName: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // Added slug for profile URL
  storeDescription: { type: String },
  categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  contactEmail: { type: String, required: true },
  phoneNumber: { type: String },
  address: {
    firstLine: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postalCode: { type: String },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number] },
    },
  },
  status: {
    type: String,
    enum: ["active", "suspended", "pending"],
    default: "pending",
  },
  metadata: metaDataSchema,
  image: {
    url: { type: String },
    publicId: { type: String },
  },
  banner: {
    url: { type: String },
    publicId: { type: String },
  },
  socialLinks: {
    facebook: { type: String },
    twitter: { type: String },
    instagram: { type: String },
    linkedin: { type: String },
  },
});

// Index for the location field
sellerSchema.index({ "address.location": "2dsphere" });

// Pre-save validation for storeName and slug
sellerSchema.pre<ISeller>("save", function (next) {
  if (this.storeName) {
    this.slug = convertToSlug(this.storeName);

    // Check if the store name is already taken
    Seller.findOne({ slug: this.slug }).then((seller: ISeller | null) => {
      if (
        seller &&
        (seller?._id as string).toString() !== (this._id as string).toString()
      ) {
        return next(new Error("Store name is already taken"));
      }
      next();
    });
  }
  next();
});

/**
 * pre-save to delete a seller by ID.
 * @param sellerId - ID of the seller to delete.
 * @returns The deleted seller.
 * @throws Error if the seller is not found.
 * @throws Error if the seller has active products.
 * @throws Error if the seller has pending orders.
 * @throws Error if the seller has pending payouts.
 */
sellerSchema.pre("findOneAndDelete", async function (next) {
  const query = this.getQuery();
  const categoryId = query._id;

  await deleteCheck(categoryId, query);

  next();
});

/**
 * Instance method to check if the seller is active.
 */
sellerSchema.methods.isActive = function () {
  return this.status === "active";
};

/**
 * Instance method to soft delete a seller.
 * Check if the seller has active products before deletion.
 * Check if the seller has pending orders before deletion.
 * Check if the seller has pending payouts before deletion.
 * Set isDeleted to true if all checks pass.
 */
sellerSchema.methods.softDelete = async function () {
  await deleteCheck(this._id, this);

  this.isDeleted = true;

  return this.save();
};

// Instance method to restore a soft-deleted seller
sellerSchema.methods.restore = function () {
  this.isDeleted = false;
  return this.save();
};

// Static method to find all active sellers
sellerSchema.statics.findAllActive = function () {
  return this.find({ status: "active", isDeleted: false });
};

// Static method to find a seller by user ID
sellerSchema.statics.findByUserId = function (userId: string) {
  return this.findOne({ userId, isDeleted: false });
};

// // Static method for soft delete
// sellerSchema.statics.softDelete = async function (id: string) {
//   return this.findByIdAndUpdate(id, { isDeleted: true });
// };

// // Static method to restore a soft-deleted seller
// sellerSchema.statics.restore = async function (id: string) {
//   return this.findByIdAndUpdate(id, { isDeleted: false });
// };

const Seller = model<ISeller>("Seller", sellerSchema);

export default Seller;
