import mongoose, { Schema, Document } from "mongoose";
import { IProductVersion } from "../@types/productVersion";

const productVersionSchema = new Schema<IProductVersion>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    versionNumber: { type: Number, required: true },
    versionData: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const ProductVersion = mongoose.model<IProductVersion>(
  "ProductVersion",
  productVersionSchema,
);

export default ProductVersion;
