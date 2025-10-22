/**
 * SEO utilities for variation model
 * Functions to optimize and manage SEO-related data
 */

/**
 * Generate SEO-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate meta title for variation
 */
export function generateMetaTitle(
  variation: any,
  productName?: string,
): string {
  const parts: string[] = [];

  if (productName) {
    parts.push(productName);
  }

  // Add variation specifics
  if (variation.attributes?.color?.name || variation.color) {
    parts.push(variation.attributes?.color?.name || variation.color);
  }

  if (variation.attributes?.size?.value || variation.size) {
    parts.push(variation.attributes?.size?.value || variation.size);
  }

  if (variation.attributes?.technical?.storage || variation.storage) {
    parts.push(variation.attributes?.technical?.storage || variation.storage);
  }

  // Add price if on sale
  if (variation.pricing?.isOnSale && variation.pricing?.salePrice) {
    parts.push(`$${variation.pricing.salePrice}`);
  }

  const title = parts.join(" - ");

  // Ensure title is within SEO limits (50-60 characters)
  return title.length <= 60 ? title : title.substring(0, 57) + "...";
}

/**
 * Generate meta description for variation
 */
export function generateMetaDescription(
  variation: any,
  productDescription?: string,
): string {
  const parts: string[] = [];

  if (productDescription) {
    parts.push(productDescription.substring(0, 100));
  }

  // Add variation details
  const varDetails: string[] = [];

  if (variation.attributes?.color?.name || variation.color) {
    varDetails.push(
      `Color: ${variation.attributes?.color?.name || variation.color}`,
    );
  }

  if (variation.attributes?.size?.value || variation.size) {
    varDetails.push(
      `Size: ${variation.attributes?.size?.value || variation.size}`,
    );
  }

  if (variation.attributes?.material?.primary) {
    varDetails.push(`Material: ${variation.attributes.material.primary}`);
  }

  if (varDetails.length) {
    parts.push(varDetails.join(", "));
  }

  // Add pricing info
  if (variation.pricing?.isOnSale && variation.pricing?.salePrice) {
    const discount = Math.round(
      ((variation.pricing.basePrice - variation.pricing.salePrice) /
        variation.pricing.basePrice) *
        100,
    );
    parts.push(`${discount}% off - now $${variation.pricing.salePrice}`);
  } else if (variation.pricing?.basePrice || variation.price) {
    parts.push(
      `Starting at $${variation.pricing?.basePrice || variation.price}`,
    );
  }

  // Add stock status
  if (variation.inventory?.quantity > 0 || variation.quantity > 0) {
    parts.push("In stock");
  }

  const description = parts.join(". ");

  // Ensure description is within SEO limits (150-160 characters)
  return description.length <= 160
    ? description
    : description.substring(0, 157) + "...";
}

/**
 * Generate SEO keywords for variation
 */
export function generateSEOKeywords(
  variation: any,
  productKeywords: string[] = [],
): string[] {
  const keywords = new Set([...productKeywords]);

  // Add variation-specific keywords
  if (variation.attributes?.color?.name || variation.color) {
    const color = variation.attributes?.color?.name || variation.color;
    keywords.add(color.toLowerCase());
    keywords.add(`${color.toLowerCase()} color`);

    if (variation.attributes?.color?.family) {
      keywords.add(variation.attributes.color.family.toLowerCase());
    }
  }

  if (variation.attributes?.size?.value || variation.size) {
    const size = variation.attributes?.size?.value || variation.size;
    keywords.add(size.toLowerCase());
    keywords.add(`size ${size.toLowerCase()}`);
  }

  if (variation.attributes?.material?.primary) {
    const material = variation.attributes.material.primary;
    keywords.add(material.toLowerCase());
    keywords.add(`${material.toLowerCase()} material`);
  }

  if (variation.attributes?.technical?.storage || variation.storage) {
    const storage =
      variation.attributes?.technical?.storage || variation.storage;
    keywords.add(storage.toLowerCase());
    keywords.add(`${storage.toLowerCase()} storage`);
  }

  // Add brand keywords
  if (variation.attributes?.technical?.brand) {
    keywords.add(variation.attributes.technical.brand.toLowerCase());
  }

  // Add price-related keywords
  if (variation.pricing?.isOnSale) {
    keywords.add("sale");
    keywords.add("discount");
    keywords.add("deal");
  }

  // Add availability keywords
  if (variation.inventory?.quantity > 0 || variation.quantity > 0) {
    keywords.add("in stock");
    keywords.add("available");
  }

  return Array.from(keywords).slice(0, 20); // Limit to 20 keywords
}

/**
 * Generate structured data (Schema.org) for variation
 */
export function generateStructuredData(variation: any, product: any): any {
  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "Product",
    sku: variation.sku,
    name: generateMetaTitle(variation, product?.name),
    description: generateMetaDescription(variation, product?.description),
    brand: {
      "@type": "Brand",
      name:
        variation.attributes?.technical?.brand || product?.brand || "Unknown",
    },
    offers: {
      "@type": "Offer",
      price: variation.pricing?.basePrice || variation.price || 0,
      priceCurrency: variation.pricing?.currency || "USD",
      availability:
        variation.inventory?.quantity > 0 || variation.quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: product?.seller?.name || "Store",
      },
    },
  } as any;

  // Add sale price if on sale
  if (variation.pricing?.isOnSale && variation.pricing?.salePrice) {
    structuredData.offers.priceValidUntil = variation.pricing.saleEndDate;
    structuredData.offers.price = variation.pricing.salePrice;
  }

  // Add color information
  if (variation.attributes?.color?.name || variation.color) {
    structuredData.color = variation.attributes?.color?.name || variation.color;
  }

  // Add size information
  if (variation.attributes?.size?.value || variation.size) {
    structuredData.size = variation.attributes?.size?.value || variation.size;
  }

  // Add material information
  if (variation.attributes?.material?.primary) {
    structuredData.material = variation.attributes.material.primary;
  }

  // Add rating information if available
  if (variation.analytics?.customerBehavior?.averageRating) {
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: variation.analytics.customerBehavior.averageRating,
      ratingCount: variation.analytics.customerBehavior.totalRatings || 1,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return structuredData;
}

/**
 * Calculate SEO score for variation
 */
export function calculateSEOScore(variation: any): number {
  let score = 0;
  const maxScore = 100;

  // Check basic SEO elements (40 points)
  if (variation.seo?.metadata?.title) score += 10;
  if (variation.seo?.metadata?.description) score += 10;
  if (variation.seo?.metadata?.keywords?.length > 0) score += 10;
  if (variation.seo?.metadata?.slug) score += 10;

  // Check social media optimization (20 points)
  if (variation.seo?.socialMedia?.ogTitle) score += 5;
  if (variation.seo?.socialMedia?.ogDescription) score += 5;
  if (variation.seo?.socialMedia?.ogImage) score += 10;

  // Check content optimization (20 points)
  if (variation.seo?.content?.alternativeNames?.length > 0) score += 5;
  if (variation.seo?.content?.featuredBenefits?.length > 0) score += 5;
  if (variation.seo?.content?.useCases?.length > 0) score += 5;
  if (variation.seo?.searchOptimization?.searchKeywords?.length > 0) score += 5;

  // Check technical SEO (10 points)
  if (variation.seo?.technical?.imageAlt) score += 5;
  if (variation.seo?.metadata?.robotsDirective === "index,follow") score += 5;

  // Check performance metrics (10 points)
  if (variation.seo?.performance?.searchImpressions > 0) score += 5;
  if (variation.seo?.performance?.searchCTR > 1) score += 5;

  return Math.min(score, maxScore);
}

/**
 * Optimize SEO data for variation
 */
export function optimizeSEOData(variation: any, product: any): any {
  const optimizedSEO = variation.seo || {};

  // Initialize SEO structure if not exists
  if (!optimizedSEO.metadata) optimizedSEO.metadata = {};
  if (!optimizedSEO.socialMedia) optimizedSEO.socialMedia = {};
  if (!optimizedSEO.content) optimizedSEO.content = {};
  if (!optimizedSEO.searchOptimization) optimizedSEO.searchOptimization = {};
  if (!optimizedSEO.technical) optimizedSEO.technical = {};

  // Auto-generate missing SEO elements
  if (!optimizedSEO.metadata.title) {
    optimizedSEO.metadata.title = generateMetaTitle(variation, product?.name);
  }

  if (!optimizedSEO.metadata.description) {
    optimizedSEO.metadata.description = generateMetaDescription(
      variation,
      product?.description,
    );
  }

  if (!optimizedSEO.metadata.slug) {
    optimizedSEO.metadata.slug = generateSlug(optimizedSEO.metadata.title);
  }

  if (
    !optimizedSEO.metadata.keywords ||
    optimizedSEO.metadata.keywords.length === 0
  ) {
    optimizedSEO.metadata.keywords = generateSEOKeywords(
      variation,
      product?.keywords,
    );
  }

  // Auto-generate social media optimization
  if (!optimizedSEO.socialMedia.ogTitle) {
    optimizedSEO.socialMedia.ogTitle = optimizedSEO.metadata.title;
  }

  if (!optimizedSEO.socialMedia.ogDescription) {
    optimizedSEO.socialMedia.ogDescription = optimizedSEO.metadata.description;
  }

  // Set up search optimization keywords
  if (
    !optimizedSEO.searchOptimization.searchKeywords ||
    optimizedSEO.searchOptimization.searchKeywords.length === 0
  ) {
    optimizedSEO.searchOptimization.searchKeywords =
      optimizedSEO.metadata.keywords;
  }

  // Generate auto-suggest terms
  if (!optimizedSEO.searchOptimization.autoSuggestTerms) {
    optimizedSEO.searchOptimization.autoSuggestTerms =
      generateAutoSuggestTerms(variation);
  }

  // Generate synonyms
  if (!optimizedSEO.searchOptimization.synonyms) {
    optimizedSEO.searchOptimization.synonyms = generateSynonyms(variation);
  }

  // Set technical SEO defaults
  if (!optimizedSEO.technical.imageAlt) {
    optimizedSEO.technical.imageAlt = `${optimizedSEO.metadata.title} - Product Image`;
  }

  // Update structured data
  optimizedSEO.metadata.structuredData = generateStructuredData(
    variation,
    product,
  );

  // Update timestamp
  optimizedSEO.lastUpdated = new Date();
  optimizedSEO.lastOptimized = new Date();

  return optimizedSEO;
}

/**
 * Generate auto-suggest terms for search
 */
function generateAutoSuggestTerms(variation: any): string[] {
  const terms: string[] = [];

  if (variation.attributes?.color?.name || variation.color) {
    const color = variation.attributes?.color?.name || variation.color;
    terms.push(color.toLowerCase());
  }

  if (variation.attributes?.size?.value || variation.size) {
    const size = variation.attributes?.size?.value || variation.size;
    terms.push(size.toLowerCase());
  }

  if (variation.attributes?.material?.primary) {
    terms.push(variation.attributes.material.primary.toLowerCase());
  }

  if (variation.attributes?.technical?.storage || variation.storage) {
    terms.push(
      (
        variation.attributes?.technical?.storage || variation.storage
      ).toLowerCase(),
    );
  }

  return terms;
}

/**
 * Generate synonyms for search optimization
 */
function generateSynonyms(variation: any): string[] {
  const synonyms: string[] = [];

  // Color synonyms
  if (variation.attributes?.color?.name || variation.color) {
    const color = (
      variation.attributes?.color?.name || variation.color
    ).toLowerCase();
    const colorSynonyms: { [key: string]: string[] } = {
      red: ["crimson", "scarlet", "cherry"],
      blue: ["navy", "azure", "cobalt"],
      green: ["emerald", "olive", "forest"],
      black: ["charcoal", "ebony", "onyx"],
      white: ["ivory", "cream", "pearl"],
      gray: ["grey", "silver", "slate"],
      brown: ["tan", "chestnut", "coffee"],
      yellow: ["gold", "amber", "lemon"],
      purple: ["violet", "lavender", "plum"],
      pink: ["rose", "coral", "salmon"],
    };

    if (colorSynonyms[color]) {
      synonyms.push(...colorSynonyms[color]);
    }
  }

  // Size synonyms
  if (variation.attributes?.size?.value || variation.size) {
    const size = (
      variation.attributes?.size?.value || variation.size
    ).toLowerCase();
    const sizeSynonyms: { [key: string]: string[] } = {
      xs: ["extra small", "xsmall"],
      s: ["small"],
      m: ["medium", "mid"],
      l: ["large"],
      xl: ["extra large", "xlarge"],
      xxl: ["2xl", "extra extra large"],
    };

    if (sizeSynonyms[size]) {
      synonyms.push(...sizeSynonyms[size]);
    }
  }

  return synonyms;
}

/**
 * Export all SEO utilities
 */
export const seoUtils = {
  generateSlug,
  generateMetaTitle,
  generateMetaDescription,
  generateSEOKeywords,
  generateStructuredData,
  calculateSEOScore,
  optimizeSEOData,
};
