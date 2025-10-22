import { Query } from "mongoose";
import { IProduct } from "../../../@types/product.type";

/**
 * Operational Static Methods
 */

/**
 * Find low stock products
 */
export const findLowStock = function (this: any): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    "inventory.trackQuantity": true,
    $expr: {
      $lte: [
        {
          $subtract: [
            "$inventory.stockQuantity",
            "$inventory.reservedQuantity",
          ],
        },
        "$inventory.reorderLevel",
      ],
    },
  }).populate("seller", "name email");
};

/**
 * Find products needing reorder
 */
export const findNeedingReorder = function (
  this: any,
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    "inventory.trackQuantity": true,
    $expr: {
      $lt: [
        {
          $subtract: [
            "$inventory.stockQuantity",
            "$inventory.reservedQuantity",
          ],
        },
        "$inventory.reorderLevel",
      ],
    },
  }).populate("seller brand", "name email");
};
