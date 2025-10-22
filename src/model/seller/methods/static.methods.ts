import { Query } from "mongoose";
import { ISeller } from "../../../@types/seller.type";

/**
 * Static method to find all active sellers
 */
export function findActiveSellers(
  this: any,
  additionalQuery: Record<string, any> = {},
): Query<ISeller[], ISeller> {
  return this.find({
    status: "active",
    isDeleted: false,
    ...additionalQuery,
  });
}

/**
 * Static method to find a seller by user ID
 */
export function findByUserId(
  this: any,
  userId: string,
): Query<ISeller | null, ISeller> {
  return this.findOne({ userId, isDeleted: false });
}

/**
 * Static method to find top sellers
 */
export function findTopSellers(
  this: any,
  limit: number = 10,
): Query<ISeller[], ISeller> {
  return this.find({
    isDeleted: false,
    status: "active",
  })
    .sort({
      isTopSeller: -1,
      "ratings.averageRating": -1,
      totalSales: -1,
    })
    .limit(limit);
}
