/**
 * Analytics utilities for variation model
 * Functions to calculate and update analytics data
 */

/**
 * Calculate popularity score based on various metrics
 */
export function calculatePopularityScore(variation: any): number {
  if (!variation.analytics) return 0;

  let score = 0;
  const weights = {
    views: 0.2,
    sales: 0.3,
    engagement: 0.2,
    revenue: 0.15,
    rating: 0.15,
  };

  // Normalize and weight different metrics
  if (variation.analytics.engagement) {
    const viewsScore = Math.min(
      variation.analytics.engagement.views / 1000,
      100,
    );
    const engagementScore = Math.min(
      (variation.analytics.engagement.addToCartCount +
        variation.analytics.engagement.wishlistCount) /
        50,
      100,
    );

    score += viewsScore * weights.views;
    score += engagementScore * weights.engagement;
  }

  if (variation.analytics.sales) {
    const salesScore = Math.min(variation.analytics.sales.totalSold / 100, 100);
    const revenueScore = Math.min(
      variation.analytics.sales.totalRevenue / 10000,
      100,
    );

    score += salesScore * weights.sales;
    score += revenueScore * weights.revenue;
  }

  if (variation.analytics.customerBehavior?.averageRating) {
    const ratingScore =
      (variation.analytics.customerBehavior.averageRating / 5) * 100;
    score += ratingScore * weights.rating;
  }

  return Math.min(Math.round(score), 100);
}

/**
 * Calculate conversion rate from views to sales
 */
export function calculateConversionRate(analytics: any): number {
  if (!analytics?.engagement?.views || !analytics?.sales?.totalSold) return 0;

  return (analytics.sales.totalSold / analytics.engagement.views) * 100;
}

/**
 * Calculate average order value
 */
export function calculateAverageOrderValue(analytics: any): number {
  if (!analytics?.sales?.totalSold || !analytics?.sales?.totalRevenue) return 0;

  return analytics.sales.totalRevenue / analytics.sales.totalSold;
}

/**
 * Update analytics metrics for a variation
 */
export function updateAnalyticsMetrics(
  variation: any,
  updates: {
    views?: number;
    addToCart?: boolean;
    wishlist?: boolean;
    purchase?: { quantity: number; revenue: number };
    rating?: number;
    share?: boolean;
  },
) {
  if (!variation.analytics) {
    variation.analytics = {
      sales: { totalSold: 0, totalRevenue: 0, averageOrderValue: 0 },
      engagement: {
        views: 0,
        uniqueViews: 0,
        addToCartCount: 0,
        wishlistCount: 0,
        shareCount: 0,
      },
      performance: { popularityScore: 0 },
      customerBehavior: { totalRatings: 0, reviewCount: 0 },
      temporal: {},
      inventory: {},
      lastUpdated: new Date(),
    };
  }

  // Update engagement metrics
  if (updates.views) {
    variation.analytics.engagement.views += updates.views;
  }

  if (updates.addToCart) {
    variation.analytics.engagement.addToCartCount += 1;
  }

  if (updates.wishlist) {
    variation.analytics.engagement.wishlistCount += 1;
  }

  if (updates.share) {
    variation.analytics.engagement.shareCount += 1;
  }

  // Update sales metrics
  if (updates.purchase) {
    variation.analytics.sales.totalSold += updates.purchase.quantity;
    variation.analytics.sales.totalRevenue += updates.purchase.revenue;
    variation.analytics.sales.averageOrderValue = calculateAverageOrderValue(
      variation.analytics,
    );
    variation.analytics.sales.lastSaleDate = new Date();
  }

  // Update rating metrics
  if (updates.rating) {
    const currentTotal =
      (variation.analytics.customerBehavior.averageRating || 0) *
      variation.analytics.customerBehavior.totalRatings;
    variation.analytics.customerBehavior.totalRatings += 1;
    variation.analytics.customerBehavior.averageRating =
      (currentTotal + updates.rating) /
      variation.analytics.customerBehavior.totalRatings;
  }

  // Recalculate popularity score
  variation.analytics.performance.popularityScore =
    calculatePopularityScore(variation);

  // Update timestamp
  variation.analytics.lastUpdated = new Date();

  return variation;
}

/**
 * Calculate trending score based on recent activity
 */
export function calculateTrendingScore(
  variation: any,
  timeWindow: number = 7,
): number {
  if (!variation.analytics?.temporal?.dailyAverages) return 0;

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - timeWindow * 24 * 60 * 60 * 1000,
  );

  // Get recent activity data
  const recentViews = variation.analytics.engagement.views || 0;
  const recentSales = variation.analytics.sales.totalSold || 0;

  // Calculate trend multiplier (simple implementation)
  const viewsTrend = Math.min(recentViews / (timeWindow * 10), 100);
  const salesTrend = Math.min(recentSales / timeWindow, 100);

  return Math.round((viewsTrend + salesTrend) / 2);
}

/**
 * Calculate seasonality index for a variation
 */
export function calculateSeasonalityIndex(variation: any): number {
  if (!variation.analytics?.temporal?.seasonalPatterns) return 50; // Neutral seasonality

  const currentMonth = new Date().getMonth();
  const seasons = {
    winter: [11, 0, 1], // Dec, Jan, Feb
    spring: [2, 3, 4], // Mar, Apr, May
    summer: [5, 6, 7], // Jun, Jul, Aug
    fall: [8, 9, 10], // Sep, Oct, Nov
  };

  let currentSeason = "spring";
  for (const [season, months] of Object.entries(seasons)) {
    if (months.includes(currentMonth)) {
      currentSeason = season;
      break;
    }
  }

  const seasonPattern = variation.analytics.temporal.seasonalPatterns.find(
    (p: any) => p.season === currentSeason,
  );

  return seasonPattern ? Math.round(seasonPattern.salesMultiplier * 50) : 50;
}

/**
 * Generate analytics report for a variation
 */
export function generateAnalyticsReport(
  variation: any,
  period: "daily" | "weekly" | "monthly" = "monthly",
) {
  const analytics = variation.analytics || {};

  const report = {
    period,
    generatedAt: new Date(),

    // Performance overview
    performance: {
      popularityScore: analytics.performance?.popularityScore || 0,
      trendingScore: calculateTrendingScore(variation),
      seasonalityIndex: calculateSeasonalityIndex(variation),
    },

    // Sales metrics
    sales: {
      totalSold: analytics.sales?.totalSold || 0,
      totalRevenue: analytics.sales?.totalRevenue || 0,
      averageOrderValue: analytics.sales?.averageOrderValue || 0,
      conversionRate: calculateConversionRate(analytics),
      returnRate: analytics.sales?.returnRate || 0,
    },

    // Engagement metrics
    engagement: {
      totalViews: analytics.engagement?.views || 0,
      uniqueViews: analytics.engagement?.uniqueViews || 0,
      addToCartRate: analytics.engagement
        ? (analytics.engagement.addToCartCount /
            Math.max(analytics.engagement.views, 1)) *
          100
        : 0,
      wishlistRate: analytics.engagement
        ? (analytics.engagement.wishlistCount /
            Math.max(analytics.engagement.views, 1)) *
          100
        : 0,
    },

    // Customer feedback
    customerFeedback: {
      averageRating: analytics.customerBehavior?.averageRating || 0,
      totalRatings: analytics.customerBehavior?.totalRatings || 0,
      totalReviews: analytics.customerBehavior?.reviewCount || 0,
      recommendationRate: analytics.customerBehavior?.recommendationRate || 0,
    },

    // Inventory performance
    inventory: {
      turnoverRate: analytics.inventory?.turnoverRate || 0,
      daysToSellOut: analytics.inventory?.daysToSellOut || 0,
      optimalStockLevel: analytics.inventory?.optimalStockLevel || 0,
    },
  };

  return report;
}

/**
 * Compare analytics between variations
 */
export function compareVariations(variations: any[]): any {
  if (!variations.length) return null;

  const comparison = {
    topPerformer: null as any,
    worstPerformer: null as any,
    averages: {
      popularityScore: 0,
      totalSold: 0,
      conversionRate: 0,
      averageRating: 0,
    },
    insights: [] as string[],
  };

  let maxPopularity = -1;
  let minPopularity = 101;
  let totalPopularity = 0;
  let totalSold = 0;
  let totalConversion = 0;
  let totalRating = 0;
  let ratingCount = 0;

  variations.forEach((variation) => {
    const popularity = variation.analytics?.performance?.popularityScore || 0;
    const sold = variation.analytics?.sales?.totalSold || 0;
    const conversion = calculateConversionRate(variation.analytics);
    const rating = variation.analytics?.customerBehavior?.averageRating;

    if (popularity > maxPopularity) {
      maxPopularity = popularity;
      comparison.topPerformer = variation;
    }

    if (popularity < minPopularity) {
      minPopularity = popularity;
      comparison.worstPerformer = variation;
    }

    totalPopularity += popularity;
    totalSold += sold;
    totalConversion += conversion;

    if (rating) {
      totalRating += rating;
      ratingCount++;
    }
  });

  // Calculate averages
  comparison.averages.popularityScore = Math.round(
    totalPopularity / variations.length,
  );
  comparison.averages.totalSold = Math.round(totalSold / variations.length);
  comparison.averages.conversionRate =
    Math.round((totalConversion / variations.length) * 100) / 100;
  comparison.averages.averageRating =
    ratingCount > 0 ? Math.round((totalRating / ratingCount) * 100) / 100 : 0;

  // Generate insights
  if (maxPopularity - minPopularity > 50) {
    comparison.insights.push(
      "High performance variance detected between variations",
    );
  }

  if (comparison.averages.conversionRate < 1) {
    comparison.insights.push(
      "Low conversion rates suggest pricing or presentation optimization needed",
    );
  }

  if (comparison.averages.averageRating < 3.5) {
    comparison.insights.push(
      "Customer satisfaction scores indicate quality concerns",
    );
  }

  return comparison;
}

/**
 * Predict future demand based on historical data
 */
export function predictDemand(variation: any, daysAhead: number = 30): any {
  if (!variation.analytics?.temporal) {
    return {
      predictedDemand: 0,
      confidence: 0,
      trend: "stable",
    };
  }

  // Simple linear regression on recent sales data
  const recentSales = variation.analytics.sales?.totalSold || 0;
  const dailyAverage = variation.analytics.temporal.dailyAverages?.sales || 0;

  // Factor in seasonality
  const seasonality = calculateSeasonalityIndex(variation) / 50; // Normalize to multiplier

  const predictedDemand = Math.round(dailyAverage * daysAhead * seasonality);

  // Simple confidence calculation based on data availability
  let confidence = 50;
  if (variation.analytics.sales?.totalSold > 100) confidence += 20;
  if (variation.analytics.temporal.weeklyTrends?.length > 4) confidence += 20;
  if (variation.analytics.temporal.monthlyTrends?.length > 3) confidence += 10;

  // Determine trend
  let trend = "stable";
  if (seasonality > 1.2) trend = "increasing";
  else if (seasonality < 0.8) trend = "decreasing";

  return {
    predictedDemand,
    confidence: Math.min(confidence, 95),
    trend,
    seasonalityFactor: seasonality,
  };
}

/**
 * Export all analytics utilities
 */
export const analyticsUtils = {
  calculatePopularityScore,
  calculateConversionRate,
  calculateAverageOrderValue,
  updateAnalyticsMetrics,
  calculateTrendingScore,
  calculateSeasonalityIndex,
  generateAnalyticsReport,
  compareVariations,
  predictDemand,
};
