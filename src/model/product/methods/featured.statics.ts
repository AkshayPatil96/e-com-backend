import { Query } from "mongoose";
import { IProduct, ProductStatus } from "../../../@types/product.type";

/**
 * Featured Product Static Methods
 */

/**
 * Find featured products
 */
export const findFeatured = function (
  this: any,
  limit: number = 10,
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    isFeatured: true,
  })
    .populate("brand category seller", "name slug logo")
    .sort({ "analytics.viewCount": -1, "reviews.averageRating": -1 })
    .limit(limit);
};

/**
 * Find products on sale
 */
export const findOnSale = function (
  this: any,
  limit: number = 20,
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    isOnSale: true,
    discount: { $gt: 0 },
  })
    .populate("brand category seller", "name slug logo")
    .sort({ discount: -1, "reviews.averageRating": -1 })
    .limit(limit);
};

/**
 * Find best selling products
 */
export const findBestSelling = function (
  this: any,
  limit: number = 10,
  days: number = 30,
): Query<IProduct[], IProduct> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
  })
    .populate("brand category seller", "name slug logo")
    .sort({ "inventory.soldQuantity": -1, "analytics.purchaseCount": -1 })
    .limit(limit);
};

/**
 * Find trending products (high view count recently)
 */
export const findTrending = function (
  this: any,
  limit: number = 10,
  days: number = 7,
): Query<IProduct[], IProduct> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    "analytics.lastViewedAt": { $gte: dateThreshold },
  })
    .populate("brand category seller", "name slug logo")
    .sort({ "analytics.viewCount": -1, "reviews.averageRating": -1 })
    .limit(limit);
};

/**
 * Find recently added products
 */
export const findRecentlyAdded = function (
  this: any,
  limit: number = 10,
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
  })
    .populate("brand category seller", "name slug logo")
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Find products with high ratings
 */
export const findHighRated = function (
  this: any,
  minRating: number = 4,
  limit: number = 20,
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    "reviews.averageRating": { $gte: minRating },
    "reviews.totalReviews": { $gte: 5 }, // At least 5 reviews
  })
    .populate("brand category seller", "name slug logo")
    .sort({ "reviews.averageRating": -1, "reviews.totalReviews": -1 })
    .limit(limit);
};
