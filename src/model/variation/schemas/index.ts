// Export all variation schemas
export { VariationAnalyticsSchema } from "./analytics.schema";
export { VariationAttributesSchema } from "./attributes.schema";
export { VariationInventorySchema } from "./inventory.schema";
export { VariationPricingSchema } from "./pricing.schema";
export { VariationSEOSchema } from "./seo.schema";

// Import types from centralized @types file
import type {
  IVariationAnalytics,
  IVariationAttributes,
  IVariationInventory,
  IVariationPricing,
  IVariationSEO,
  IVariationSchemas,
} from "../../../@types/variation.type";

// Re-export the interfaces from @types
export type {
  IVariationAnalytics,
  IVariationAttributes,
  IVariationInventory,
  IVariationPricing,
  IVariationSEO,
  IVariationSchemas,
};

// Schema validation helpers
export const VariationSchemaValidators = {
  pricing: {
    validateSalePrice: (basePrice: number, salePrice: number): boolean => {
      return salePrice > 0 && salePrice < basePrice;
    },
    validateBulkPricing: (tiers: IVariationPricing["bulkPricing"]): boolean => {
      if (!tiers || tiers.length === 0) return true;

      // Check that minimum quantities are in ascending order
      for (let i = 1; i < tiers.length; i++) {
        if (tiers[i].quantity <= tiers[i - 1].quantity) {
          return false;
        }
      }

      // Check that prices are in descending order (bulk discount)
      for (let i = 1; i < tiers.length; i++) {
        if (tiers[i].price >= tiers[i - 1].price) {
          return false;
        }
      }

      return true;
    },
    calculateFinalPrice: (
      pricing: IVariationPricing,
      quantity: number = 1,
    ): number => {
      let basePrice = pricing.basePrice;

      // Apply sale price if active
      if (pricing.salePrice && pricing.isOnSale) {
        const now = new Date();
        if (pricing.saleStartDate && pricing.saleEndDate) {
          if (now >= pricing.saleStartDate && now <= pricing.saleEndDate) {
            basePrice = pricing.salePrice;
          }
        } else if (pricing.isOnSale) {
          basePrice = pricing.salePrice;
        }
      }

      // Apply bulk pricing if applicable
      if (pricing.bulkPricing && quantity > 1) {
        const applicableTier = pricing.bulkPricing
          .filter((tier: any) => quantity >= tier.quantity)
          .sort((a: any, b: any) => b.quantity - a.quantity)[0];

        if (applicableTier) {
          basePrice = applicableTier.price;
        }
      }

      // Apply tax if specified
      if (pricing.taxRate) {
        const taxAmount = basePrice * (pricing.taxRate / 100);
        return basePrice + taxAmount;
      }

      return basePrice;
    },
  },

  inventory: {
    isInStock: (inventory: IVariationInventory): boolean => {
      return inventory.quantity > 0;
    },
    getAvailableQuantity: (inventory: IVariationInventory): number => {
      return Math.max(0, inventory.quantity - inventory.reservedQuantity);
    },
    shouldReorder: (inventory: IVariationInventory): boolean => {
      return inventory.quantity <= inventory.reorderPoint;
    },
    calculateTurnoverRate: (inventory: IVariationInventory): number => {
      if (!inventory.stockMovements || inventory.stockMovements.length === 0)
        return 0;

      const sales = inventory.stockMovements
        .filter((m: any) => m.type === "out")
        .reduce((sum: number, m: any) => sum + m.quantity, 0);

      const avgInventory = inventory.quantity + sales / 2;
      return avgInventory > 0 ? sales / avgInventory : 0;
    },
  },

  attributes: {
    validateColorCode: (code: string): boolean => {
      return /^#[0-9A-F]{6}$/i.test(code);
    },
    validateSizeOrder: (sizes: IVariationAttributes["size"]): boolean => {
      if (!sizes || !sizes.value) return true;

      const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
      const numericSizes = /^\d+$/;

      // Check if size follows a valid pattern
      const isNumeric = numericSizes.test(sizes.value);
      const isStandard = sizeOrder.includes(sizes.value);

      return isNumeric || isStandard;
    },
    calculateWeight: (attributes: IVariationAttributes): number => {
      if (attributes.size?.measurements?.weight) {
        return attributes.size.measurements.weight;
      }

      // Estimate weight based on dimensions and materials
      const measurements = attributes.size?.measurements;
      if (measurements?.length && measurements?.width && measurements?.height) {
        const volume =
          measurements.length * measurements.width * measurements.height;
        const materialDensity =
          attributes.material?.composition?.find((m) => m.material)
            ?.percentage || 1;
        return volume * materialDensity * 0.001; // Convert to reasonable weight units
      }

      return 0;
    },
  },

  analytics: {
    calculateConversionRate: (analytics: IVariationAnalytics): number => {
      const views = analytics.engagement.views;
      const sales = analytics.sales.totalSold;
      return views > 0 ? (sales / views) * 100 : 0;
    },
    calculateAverageOrderValue: (analytics: IVariationAnalytics): number => {
      const revenue = analytics.sales.totalRevenue;
      const orders = analytics.sales.totalSold;
      return orders > 0 ? revenue / orders : 0;
    },
    calculatePopularityScore: (analytics: IVariationAnalytics): number => {
      const viewsWeight = 0.3;
      const salesWeight = 0.4;
      const engagementWeight = 0.3;

      const normalizedViews = Math.min(analytics.engagement.views / 1000, 100);
      const normalizedSales = Math.min(analytics.sales.totalSold / 100, 100);
      const normalizedEngagement = Math.min(
        (analytics.engagement.addToCartCount +
          analytics.engagement.wishlistCount) /
          50,
        100,
      );

      return (
        normalizedViews * viewsWeight +
        normalizedSales * salesWeight +
        normalizedEngagement * engagementWeight
      );
    },
  },

  seo: {
    validateSlug: (slug: string): boolean => {
      return (
        /^[a-z0-9-]+$/.test(slug) &&
        !slug.startsWith("-") &&
        !slug.endsWith("-")
      );
    },
    generateSlug: (title: string): string => {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    },
    calculateSEOScore: (seo: IVariationSEO): number => {
      let score = 0;

      // Basic metadata (30 points)
      if (seo.metadata.title) score += 10;
      if (seo.metadata.description) score += 10;
      if (seo.metadata.keywords && seo.metadata.keywords.length > 0)
        score += 10;

      // Social media optimization (20 points)
      if (seo.socialMedia.ogTitle && seo.socialMedia.ogDescription) score += 10;
      if (seo.socialMedia.ogImage) score += 10;

      // Content optimization (25 points)
      if (
        seo.content.alternativeNames &&
        seo.content.alternativeNames.length > 0
      )
        score += 5;
      if (
        seo.content.featuredBenefits &&
        seo.content.featuredBenefits.length > 0
      )
        score += 10;
      if (seo.content.useCases && seo.content.useCases.length > 0) score += 10;

      // Search optimization (15 points)
      if (
        seo.searchOptimization.searchKeywords &&
        seo.searchOptimization.searchKeywords.length > 0
      )
        score += 10;
      if (
        seo.searchOptimization.synonyms &&
        seo.searchOptimization.synonyms.length > 0
      )
        score += 5;

      // Technical SEO (10 points)
      if (seo.technical.imageAlt) score += 5;
      if (seo.metadata.slug) score += 5;

      return score;
    },
  },
};

// Schema combination utilities
export const VariationSchemaUtils = {
  // Create default schemas for a new variation
  createDefaults: (): Partial<IVariationSchemas> => ({
    pricing: {
      basePrice: 0,
      currency: "USD",
      isOnSale: false,
      minOrderQuantity: 1,
    },
    inventory: {
      quantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      reorderPoint: 10,
      trackInventory: true,
      allowBackorders: false,
      lowStockThreshold: 5,
      stockStatus: "out_of_stock",
      stockMovements: [],
    },
    attributes: {
      lastUpdated: new Date(),
    },
    analytics: {
      sales: {
        totalSold: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
      engagement: {
        views: 0,
        uniqueViews: 0,
        addToCartCount: 0,
        wishlistCount: 0,
        shareCount: 0,
      },
      performance: {
        popularityScore: 0,
      },
      customerBehavior: {
        totalRatings: 0,
        reviewCount: 0,
      },
      temporal: {},
      inventory: {},
      lastUpdated: new Date(),
    },
    seo: {
      metadata: {
        keywords: [],
        robotsDirective: "index,follow",
      },
      socialMedia: {
        twitterCard: "summary_large_image",
      },
      searchOptimization: {
        searchKeywords: [],
        autoSuggestTerms: [],
        synonyms: [],
        misspellings: [],
        categoryRelevance: [],
      },
      content: {
        alternativeNames: [],
        marketingNames: [],
        technicalNames: [],
        featuredBenefits: [],
        useCases: [],
      },
      performance: {
        searchImpressions: 0,
        searchClicks: 0,
      },
      technical: {
        loadingPriority: "normal",
        lazyLoading: true,
        compression: {
          webp: true,
          avif: false,
          quality: 80,
        },
      },
      lastUpdated: new Date(),
    },
  }),

  // Validate all schemas together
  validateSchemas: (
    schemas: Partial<IVariationSchemas>,
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (schemas.pricing) {
      if (schemas.pricing.salePrice && schemas.pricing.basePrice) {
        if (
          !VariationSchemaValidators.pricing.validateSalePrice(
            schemas.pricing.basePrice,
            schemas.pricing.salePrice,
          )
        ) {
          errors.push("Sale price must be less than base price");
        }
      }

      if (schemas.pricing.bulkPricing) {
        if (
          !VariationSchemaValidators.pricing.validateBulkPricing(
            schemas.pricing.bulkPricing,
          )
        ) {
          errors.push(
            "Bulk pricing tiers must have ascending quantities and descending prices",
          );
        }
      }
    }

    if (schemas.attributes) {
      if (schemas.attributes.color?.code) {
        if (
          !VariationSchemaValidators.attributes.validateColorCode(
            schemas.attributes.color.code,
          )
        ) {
          errors.push("Color code must be a valid hex color");
        }
      }

      if (schemas.attributes.size) {
        if (
          !VariationSchemaValidators.attributes.validateSizeOrder(
            schemas.attributes.size,
          )
        ) {
          errors.push("Size order must follow a consistent pattern");
        }
      }
    }

    if (schemas.seo?.metadata?.slug) {
      if (
        !VariationSchemaValidators.seo.validateSlug(schemas.seo.metadata.slug)
      ) {
        errors.push(
          "SEO slug must contain only lowercase letters, numbers, and hyphens",
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};
