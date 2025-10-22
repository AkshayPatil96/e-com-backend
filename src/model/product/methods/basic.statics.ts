import { Query } from "mongoose";
import { IProduct, ProductStatus } from "../../../@types/product.type";

/**
 * Basic Query Static Methods
 */

/**
 * Find active products (not deleted and published)
 */
export const findActiveProducts = function (
  this: any,
  additionalQuery: Record<string, any> = {},
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    ...additionalQuery,
  }).populate("brand category seller", "name slug logo");
};

/**
 * Find one active product
 */
export const findActiveOne = function (
  this: any,
  query: Record<string, any>,
): Query<IProduct | null, IProduct> {
  return this.findOne({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    ...query,
  }).populate("brand category seller variations", "name slug logo description");
};

/**
 * Find products by category
 */
export const findByCategory = function (
  this: any,
  categoryId: string,
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    $or: [{ category: categoryId }, { categories: { $in: [categoryId] } }],
  })
    .populate("brand category seller", "name slug logo")
    .sort({ "reviews.averageRating": -1, createdAt: -1 });
};

/**
 * Find products by brand
 */
export const findByBrand = function (
  this: any,
  brandId: string,
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    brand: brandId,
  })
    .populate("brand category seller", "name slug logo")
    .sort({ "reviews.averageRating": -1, createdAt: -1 });
};

/**
 * Find products by seller
 */
export const findBySeller = function (
  this: any,
  sellerId: string,
  includeDeleted: boolean = false,
): Query<IProduct[], IProduct> {
  const query: Record<string, any> = { seller: sellerId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  return this.find(query)
    .populate("brand category", "name slug")
    .sort({ createdAt: -1 });
};
