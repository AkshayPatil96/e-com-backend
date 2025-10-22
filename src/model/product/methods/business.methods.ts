import { IProduct, ProductStatus } from "../../../@types/product.type";

/**
 * Business Logic Instance Methods
 */

/**
 * Check if product is available for purchase
 */
export const isAvailable = function (this: IProduct): boolean {
  if (this.isDeleted || this.status !== ProductStatus.PUBLISHED) {
    return false;
  }

  if (this.inventory.trackQuantity) {
    const availableStock =
      this.inventory.stockQuantity - this.inventory.reservedQuantity;
    return availableStock > 0 || this.inventory.allowBackorder;
  }

  return true;
};

/**
 * Get available stock quantity
 */
export const getAvailableStock = function (this: IProduct): number {
  if (!this.inventory.trackQuantity) {
    return Infinity;
  }

  return Math.max(
    0,
    this.inventory.stockQuantity - this.inventory.reservedQuantity,
  );
};

/**
 * Check if stock is low (below reorder level)
 */
export const isStockLow = function (this: IProduct): boolean {
  if (!this.inventory.trackQuantity) {
    return false;
  }

  const availableStock = Math.max(
    0,
    this.inventory.stockQuantity - this.inventory.reservedQuantity,
  );
  return availableStock <= this.inventory.reorderLevel;
};

/**
 * Get discount price
 */
export const getDiscountPrice = function (this: IProduct): number {
  if (!this.discount || this.discount <= 0) {
    return this.pricing.basePrice;
  }

  const discountAmount = (this.pricing.basePrice * this.discount) / 100;
  return this.pricing.basePrice - discountAmount;
};

/**
 * Check if product is on sale
 */
export const isOnSaleCheck = function (this: IProduct): boolean {
  return (this.discount ?? 0) > 0 && this.isOnSale;
};

/**
 * Update review summary (called when reviews change)
 */
export const updateReviewSummary = async function (
  this: IProduct,
  averageRating: number,
  totalReviews: number,
  ratingDistribution: Record<number, number>,
  totalVerifiedReviews: number = 0,
  totalRecommendations: number = 0,
): Promise<void> {
  this.reviews.averageRating = averageRating;
  this.reviews.totalReviews = totalReviews;
  this.reviews.totalVerifiedReviews = totalVerifiedReviews;
  this.reviews.totalRecommendations = totalRecommendations;
  this.reviews.ratingDistribution = ratingDistribution as any;
  await this.save();
};
