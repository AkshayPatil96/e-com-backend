/**
 * Instance methods for variation model
 * These methods are available on individual variation documents
 */

/**
 * Calculate the final price for this variation including discounts, taxes, and bulk pricing
 */
export function calculateFinalPrice(
  this: any,
  quantity: number = 1,
  options: {
    includeTax?: boolean;
    applyDiscounts?: boolean;
    customerType?: "retail" | "wholesale" | "vip";
  } = {},
) {
  const {
    includeTax = true,
    applyDiscounts = true,
    customerType = "retail",
  } = options;

  let basePrice = this.pricing?.basePrice || this.price || 0; // Fallback to legacy price field

  if (!basePrice) return 0;

  // Apply sale price if active and discounts are enabled
  if (applyDiscounts && this.pricing?.isOnSale && this.pricing?.salePrice) {
    basePrice = this.pricing.salePrice;
  }

  // Apply bulk pricing if applicable
  if (this.pricing?.bulkPricing && quantity > 1) {
    const applicableTier = this.pricing.bulkPricing
      .filter((tier: any) => quantity >= tier.quantity)
      .sort((a: any, b: any) => b.quantity - a.quantity)[0];

    if (applicableTier) {
      basePrice = applicableTier.price;
    }
  }

  // Apply customer type discounts
  if (applyDiscounts && customerType !== "retail") {
    const discountRate = customerType === "wholesale" ? 0.1 : 0.05; // 10% wholesale, 5% VIP
    basePrice = basePrice * (1 - discountRate);
  }

  // Apply tax if required
  if (includeTax && this.pricing?.taxRate) {
    const taxAmount = basePrice * (this.pricing.taxRate / 100);
    basePrice += taxAmount;
  }

  return Math.round(basePrice * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if variation is currently in stock
 */
export function isInStock(this: any, requestedQuantity: number = 1): boolean {
  if (!this.inventory) {
    // Fallback to legacy quantity field
    return (this.quantity || 0) >= requestedQuantity;
  }

  const availableQuantity =
    this.inventory.quantity - (this.inventory.reservedQuantity || 0);
  return availableQuantity >= requestedQuantity;
}

/**
 * Get available quantity for purchase
 */
export function getAvailableQuantity(this: any): number {
  if (!this.inventory) {
    // Fallback to legacy quantity field
    return this.quantity || 0;
  }

  return Math.max(
    0,
    this.inventory.quantity - (this.inventory.reservedQuantity || 0),
  );
}

/**
 * Check if variation is on sale
 */
export function isOnSale(this: any): boolean {
  if (!this.pricing?.salePrice) return false;

  // Check if explicitly marked as on sale
  if (this.pricing.isOnSale === false) return false;

  // Check sale period if defined
  if (this.pricing.saleStartDate && this.pricing.saleEndDate) {
    const now = new Date();
    return now >= this.pricing.saleStartDate && now <= this.pricing.saleEndDate;
  }

  // If no explicit dates, check if sale price is lower than base price
  return this.pricing.salePrice < this.pricing.basePrice;
}

/**
 * Get discount percentage if on sale
 */
export function getDiscountPercentage(this: any): number {
  if (!this.isOnSale() || !this.pricing?.salePrice) return 0;

  const basePrice = this.pricing.basePrice;
  const salePrice = this.pricing.salePrice;

  return Math.round(((basePrice - salePrice) / basePrice) * 100);
}

/**
 * Get profit margin for this variation
 */
export function getProfitMargin(this: any): number {
  if (!this.pricing?.costPrice || !this.pricing?.basePrice) return 0;

  const costPrice = this.pricing.costPrice;
  const sellingPrice = this.pricing.basePrice;

  if (costPrice <= 0) return 0;

  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 100);
}

/**
 * Check if variation needs reordering
 */
export function needsReorder(this: any): boolean {
  if (!this.inventory) return false;

  return this.inventory.quantity <= (this.inventory.reorderPoint || 0);
}

/**
 * Get display name for the variation
 */
export function getDisplayName(this: any): string {
  const parts: string[] = [];

  // Add color if available
  if (this.attributes?.color?.name || this.color) {
    parts.push(this.attributes?.color?.name || this.color);
  }

  // Add size if available
  if (this.attributes?.size?.value || this.size) {
    parts.push(this.attributes?.size?.value || this.size);
  }

  // Add storage if available
  if (this.attributes?.technical?.storage || this.storage) {
    parts.push(this.attributes?.technical?.storage || this.storage);
  }

  return parts.length > 0 ? parts.join(" - ") : "Default Variation";
}

/**
 * Get variation's SEO URL slug
 */
export function getUrlSlug(this: any): string {
  if (this.seo?.metadata?.slug) {
    return this.seo.metadata.slug;
  }

  // Generate slug from display name
  const displayName = this.getDisplayName();
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get variation attributes as a formatted object
 */
export function getAttributes(this: any): Record<string, any> {
  const attributes: Record<string, any> = {};

  // Legacy support
  if (this.color) attributes.color = this.color;
  if (this.size) attributes.size = this.size;
  if (this.storage) attributes.storage = this.storage;

  // Enhanced attributes
  if (this.attributes) {
    if (this.attributes.color) {
      attributes.color = {
        name: this.attributes.color.name,
        code: this.attributes.color.code,
        family: this.attributes.color.family,
      };
    }

    if (this.attributes.size) {
      attributes.size = {
        value: this.attributes.size.value,
        type: this.attributes.size.type,
        measurements: this.attributes.size.measurements,
      };
    }

    if (this.attributes.material) {
      attributes.material = this.attributes.material;
    }

    if (this.attributes.technical) {
      attributes.technical = this.attributes.technical;
    }
  }

  return attributes;
}

/**
 * Check if variation matches search criteria
 */
export function matchesSearch(this: any, searchTerm: string): boolean {
  const term = searchTerm.toLowerCase();

  // Check SKU
  if (this.sku && this.sku.toLowerCase().includes(term)) return true;

  // Check color
  if (
    this.attributes?.color?.name &&
    this.attributes.color.name.toLowerCase().includes(term)
  )
    return true;
  if (this.color && this.color.toLowerCase().includes(term)) return true;

  // Check size
  if (
    this.attributes?.size?.value &&
    this.attributes.size.value.toLowerCase().includes(term)
  )
    return true;
  if (this.size && this.size.toLowerCase().includes(term)) return true;

  // Check storage/technical specs
  if (
    this.attributes?.technical?.storage &&
    this.attributes.technical.storage.toLowerCase().includes(term)
  )
    return true;
  if (this.storage && this.storage.toLowerCase().includes(term)) return true;

  // Check SEO keywords
  if (this.seo?.metadata?.keywords) {
    return this.seo.metadata.keywords.some((keyword: string) =>
      keyword.toLowerCase().includes(term),
    );
  }

  // Check search optimization terms
  if (this.seo?.searchOptimization) {
    const searchFields = [
      ...this.seo.searchOptimization.searchKeywords,
      ...this.seo.searchOptimization.synonyms,
      ...this.seo.searchOptimization.autoSuggestTerms,
    ];

    return searchFields.some((field: string) =>
      field.toLowerCase().includes(term),
    );
  }

  return false;
}

/**
 * Get variation's current popularity score
 */
export function getPopularityScore(this: any): number {
  if (this.analytics?.performance?.popularityScore) {
    return this.analytics.performance.popularityScore;
  }

  // Calculate basic popularity score based on available data
  let score = 0;

  if (this.analytics?.engagement) {
    score += Math.min(this.analytics.engagement.views / 100, 30); // Max 30 points for views
    score += Math.min(this.analytics.engagement.addToCartCount * 2, 20); // Max 20 points for cart adds
    score += Math.min(this.analytics.engagement.wishlistCount * 3, 15); // Max 15 points for wishlist
  }

  if (this.analytics?.sales) {
    score += Math.min(this.analytics.sales.totalSold / 10, 25); // Max 25 points for sales
    score += Math.min(this.analytics.sales.totalRevenue / 1000, 10); // Max 10 points for revenue
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Soft delete the variation
 */
export function softDelete(this: any, reason?: string): Promise<any> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletionReason = reason;

  // Update inventory status
  if (this.inventory) {
    this.inventory.stockStatus = "discontinued";
  }

  return this.save();
}

/**
 * Restore a soft-deleted variation
 */
export function restore(this: any): Promise<any> {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletionReason = undefined;

  // Restore inventory status
  if (this.inventory) {
    this.inventory.stockStatus =
      this.inventory.quantity > 0 ? "in_stock" : "out_of_stock";
  }

  return this.save();
}

/**
 * Get variation summary for API responses
 */
export function getSummary(
  this: any,
  includeAnalytics: boolean = false,
): Record<string, any> {
  const summary: Record<string, any> = {
    id: this._id,
    sku: this.sku,
    displayName: this.getDisplayName(),
    price: this.calculateFinalPrice(),
    originalPrice: this.pricing?.basePrice || this.price,
    isOnSale: this.isOnSale(),
    inStock: this.isInStock(),
    availableQuantity: this.getAvailableQuantity(),
    attributes: this.getAttributes(),
  };

  if (this.isOnSale()) {
    summary.discountPercentage = this.getDiscountPercentage();
  }

  if (includeAnalytics && this.analytics) {
    summary.analytics = {
      popularityScore: this.getPopularityScore(),
      totalSold: this.analytics.sales?.totalSold || 0,
      averageRating: this.analytics.customerBehavior?.averageRating,
      reviewCount: this.analytics.customerBehavior?.reviewCount || 0,
    };
  }

  return summary;
}

// Export all instance methods
export const instanceMethods = {
  calculateFinalPrice,
  isInStock,
  getAvailableQuantity,
  isOnSale,
  getDiscountPercentage,
  getProfitMargin,
  needsReorder,
  getDisplayName,
  getUrlSlug,
  getAttributes,
  matchesSearch,
  getPopularityScore,
  softDelete,
  restore,
  getSummary,
};
