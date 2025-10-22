import { IProduct, ProductStatus } from "../../../@types/product.type";

/**
 * Analytics Instance Methods
 */

/**
 * Add to cart analytics
 */
export const incrementCartAdd = async function (this: IProduct): Promise<void> {
  this.analytics.cartAddCount += 1;
  this.analytics.lastViewedAt = new Date();
  await this.save();
};

/**
 * Add to wishlist analytics
 */
export const incrementWishlist = async function (
  this: IProduct,
): Promise<void> {
  this.analytics.wishlistCount += 1;
  await this.save();
};

/**
 * Remove from wishlist analytics
 */
export const decrementWishlist = async function (
  this: IProduct,
): Promise<void> {
  this.analytics.wishlistCount = Math.max(0, this.analytics.wishlistCount - 1);
  await this.save();
};

/**
 * Increment view count
 */
export const incrementView = async function (this: IProduct): Promise<void> {
  this.analytics.viewCount += 1;
  this.analytics.lastViewedAt = new Date();

  // Update conversion rate
  if (this.analytics.viewCount > 0) {
    this.analytics.conversionRate =
      (this.analytics.purchaseCount / this.analytics.viewCount) * 100;
  }

  await this.save();
};

/**
 * Record a purchase
 */
export const recordPurchase = async function (
  this: IProduct,
  quantity: number = 1,
): Promise<void> {
  this.analytics.purchaseCount += quantity;
  this.inventory.soldQuantity += quantity;

  // Update conversion rate
  if (this.analytics.viewCount > 0) {
    this.analytics.conversionRate =
      (this.analytics.purchaseCount / this.analytics.viewCount) * 100;
  }

  await this.save();
};
