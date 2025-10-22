import mongoose from "mongoose";
import { ISeller } from "../../../@types/seller.type";

/**
 * Pre-save middleware to validate unique store name
 */
export const storeNameValidationMiddleware = async function (
  this: ISeller,
  next: (error?: Error) => void,
) {
  if (this.isModified("storeName")) {
    try {
      // Use mongoose.model to avoid circular dependency
      const SellerModel = mongoose.model("Seller");

      const existingSeller = await SellerModel.findOne({
        slug: this.slug,
        _id: { $ne: this._id },
      });

      if (existingSeller) {
        return next(new Error("Store name is already taken"));
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
};
