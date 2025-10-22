import { Query } from "mongoose";
import { IProduct, ProductStatus } from "../../../@types/product.type";

/**
 * Search and Filter Static Methods
 */

/**
 * Search products with text and filters
 */
export const searchProducts = function (
  this: any,
  searchTerm: string,
  filters: Record<string, any> = {},
): Query<IProduct[], IProduct> {
  const query: Record<string, any> = {
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    ...filters,
  };

  // Add text search if searchTerm is provided
  if (searchTerm && searchTerm.trim()) {
    query.$text = { $search: searchTerm };
  }

  const searchQuery = this.find(query);

  // Sort by text score if text search is used, otherwise by relevance
  if (searchTerm && searchTerm.trim()) {
    searchQuery.sort({ score: { $meta: "textScore" } });
  } else {
    searchQuery.sort({
      "reviews.averageRating": -1,
      "analytics.viewCount": -1,
    });
  }

  return searchQuery.populate("brand category seller", "name slug logo");
};

/**
 * Find products with price range
 */
export const findByPriceRange = function (
  this: any,
  minPrice: number,
  maxPrice: number,
  additionalQuery: Record<string, any> = {},
): Query<IProduct[], IProduct> {
  return this.find({
    isDeleted: false,
    status: ProductStatus.PUBLISHED,
    "pricing.basePrice": { $gte: minPrice, $lte: maxPrice },
    ...additionalQuery,
  })
    .populate("brand category seller", "name slug logo")
    .sort({ "pricing.basePrice": 1 });
};
