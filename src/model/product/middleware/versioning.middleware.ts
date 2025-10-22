import { Query } from "mongoose";
import { IProduct } from "../../../@types/product.type";
import ProductVersion from "../../productVersion";

/**
 * Post-save middleware for version tracking
 */
export const postSaveMiddleware = async function (
  this: IProduct,
  doc: IProduct,
  next: any,
) {
  try {
    // Only create version if this is not a new document
    if (!this.isNew) {
      // Create a version entry for tracking changes
      await ProductVersion.create({
        productId: doc._id,
        version:
          (await ProductVersion.countDocuments({ productId: doc._id })) + 1,
        changes: doc.toObject(),
        changedBy: doc.updatedBy,
        changeReason: "Product updated",
        createdAt: new Date(),
      });
    }
    next();
  } catch (error) {
    console.error("Error creating product version:", error);
    // Don't fail the main operation if versioning fails
    next();
  }
};

/**
 * Post-update middleware for version tracking
 */
export const postUpdateMiddleware = async function (
  this: Query<any, IProduct>,
  doc: any,
  next: any,
) {
  try {
    if (doc) {
      // Get the updated document
      const updatedDoc = await this.model.findById(doc._id);
      if (updatedDoc) {
        // Create a version entry
        await ProductVersion.create({
          productId: updatedDoc._id,
          version:
            (await ProductVersion.countDocuments({
              productId: updatedDoc._id,
            })) + 1,
          changes: updatedDoc.toObject(),
          changedBy: updatedDoc.updatedBy,
          changeReason: "Product updated via update operation",
          createdAt: new Date(),
        });
      }
    }
    next();
  } catch (error) {
    console.error("Error creating product version:", error);
    // Don't fail the main operation if versioning fails
    next();
  }
};
