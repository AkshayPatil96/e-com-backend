import { Query } from "mongoose";
import { IBrand } from "../../../@types/brand.type";

/**
 * Static method to find all active brands
 */
export function findActiveBrands(
  this: any,
  additionalQuery: Record<string, any> = {},
): Query<IBrand[], IBrand> {
  const query = { isDeleted: false, isActive: true, ...additionalQuery };
  return this.find(query).sort({ displayOrder: 1, name: 1 });
}

/**
 * Static method to find the first active brand
 */
export function findActiveOne(
  this: any,
  query: Record<string, any>,
): Query<IBrand | null, IBrand> {
  return this.findOne({ ...query, isDeleted: false, isActive: true });
}

/**
 * Static method to find brands by category
 */
export function findByCategory(
  this: any,
  categoryId: string,
): Query<IBrand[], IBrand> {
  return this.find({
    categories: categoryId,
    isDeleted: false,
    isActive: true,
  }).sort({ displayOrder: 1, name: 1 });
}

/**
 * Static method to find popular brands
 */
export function findPopularBrands(
  this: any,
  limit: number = 10,
): Query<IBrand[], IBrand> {
  return this.find({
    isDeleted: false,
    isActive: true,
    isPopular: true,
  })
    .sort({
      "analytics.productCount": -1,
      "analytics.averageRating": -1,
      name: 1,
    })
    .limit(limit);
}

/**
 * Static method to find featured brands
 */
export function findFeaturedBrands(this: any): Query<IBrand[], IBrand> {
  return this.find({
    isDeleted: false,
    isActive: true,
    isFeatured: true,
  }).sort({ displayOrder: 1, name: 1 });
}
