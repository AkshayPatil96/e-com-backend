import Product from "../../product.model";

/**
 * Update brand analytics
 */
export async function updateAnalytics(this: any): Promise<void> {
  // Count active products
  const productCount = await Product.countDocuments({
    brand: this._id,
    isDeleted: false,
  });

  // For now, set basic analytics - will be enhanced when Product model is updated
  this.analytics.productCount = productCount;

  // Update popularity flag based on product count
  this.isPopular = productCount >= 10;

  await this.save();
}
