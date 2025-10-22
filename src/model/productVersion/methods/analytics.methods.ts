/**
 * Analytics Instance Methods
 * Methods for tracking and analyzing version performance
 */

import { Document } from "mongoose";
import { IProductVersion } from "../../../@types/productVersion";

/**
 * Track page view for this version
 */
export function trackView(
  this: Document & IProductVersion,
  metadata?: {
    source?: string;
    referrer?: string;
    userAgent?: string;
    location?: string;
  },
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      this.analytics.usage.views += 1;

      if (metadata?.source) {
        if (!this.analytics.usage.sources) {
          this.analytics.usage.sources = {};
        }
        this.analytics.usage.sources[metadata.source] =
          (this.analytics.usage.sources[metadata.source] || 0) + 1;
      }

      this.analytics.usage.lastAccessed = new Date();
      await this.save();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Track download of this version
 */
export function trackDownload(
  this: Document & IProductVersion,
  format?: string,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      this.analytics.usage.downloads += 1;

      if (format) {
        if (!this.analytics.usage.downloadFormats) {
          this.analytics.usage.downloadFormats = {};
        }
        this.analytics.usage.downloadFormats[format] =
          (this.analytics.usage.downloadFormats[format] || 0) + 1;
      }

      await this.save();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Track social share of this version
 */
export function trackShare(
  this: Document & IProductVersion,
  platform?: string,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      this.analytics.usage.shares += 1;

      if (platform) {
        if (!this.analytics.usage.sharePlatforms) {
          this.analytics.usage.sharePlatforms = {};
        }
        this.analytics.usage.sharePlatforms[platform] =
          (this.analytics.usage.sharePlatforms[platform] || 0) + 1;
      }

      await this.save();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Track conversion events
 */
export function trackConversion(
  this: Document & IProductVersion,
  event: "impression" | "click" | "purchase",
  value?: number,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      switch (event) {
        case "impression":
          this.analytics.conversion.impressions += 1;
          break;
        case "click":
          this.analytics.conversion.clicks += 1;
          break;
        case "purchase":
          this.analytics.conversion.purchases += 1;
          if (value) {
            if (!this.analytics.conversion.revenue) {
              this.analytics.conversion.revenue = 0;
            }
            this.analytics.conversion.revenue += value;
          }
          break;
      }

      // Recalculate conversion rate
      if (this.analytics.conversion.impressions > 0) {
        this.analytics.conversion.conversionRate =
          (this.analytics.conversion.purchases /
            this.analytics.conversion.impressions) *
          100;
      }

      await this.save();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add user rating
 */
export function addRating(
  this: Document & IProductVersion,
  rating: number,
  review?: string,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (rating < 1 || rating > 5) {
        reject(new Error("Rating must be between 1 and 5"));
        return;
      }

      this.analytics.feedback.ratings.push(rating);

      // Recalculate average rating
      const sum = this.analytics.feedback.ratings.reduce(
        (acc, r) => acc + r,
        0,
      );
      this.analytics.feedback.averageRating = Number(
        (sum / this.analytics.feedback.ratings.length).toFixed(1),
      );

      this.analytics.feedback.reviewCount =
        this.analytics.feedback.ratings.length;
      this.analytics.feedback.lastReviewDate = new Date();

      await this.save();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Update performance metrics
 */
export function updatePerformanceMetrics(
  this: Document & IProductVersion,
  metrics: {
    loadTime?: number;
    renderTime?: number;
    seoScore?: number;
    accessibilityScore?: number;
  },
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (metrics.loadTime !== undefined) {
        this.analytics.performance.loadTime = metrics.loadTime;
      }

      if (metrics.renderTime !== undefined) {
        this.analytics.performance.renderTime = metrics.renderTime;
      }

      if (metrics.seoScore !== undefined) {
        if (metrics.seoScore < 0 || metrics.seoScore > 100) {
          reject(new Error("SEO score must be between 0 and 100"));
          return;
        }
        this.analytics.performance.seoScore = metrics.seoScore;
      }

      if (metrics.accessibilityScore !== undefined) {
        if (
          metrics.accessibilityScore < 0 ||
          metrics.accessibilityScore > 100
        ) {
          reject(new Error("Accessibility score must be between 0 and 100"));
          return;
        }
        this.analytics.performance.accessibilityScore =
          metrics.accessibilityScore;
      }

      await this.save();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary(this: Document & IProductVersion): any {
  return {
    overview: {
      totalViews: this.analytics.usage.views,
      totalDownloads: this.analytics.usage.downloads,
      totalShares: this.analytics.usage.shares,
      averageRating: this.analytics.feedback.averageRating,
      reviewCount: this.analytics.feedback.reviewCount,
    },
    performance: {
      conversionRate: this.analytics.conversion.conversionRate,
      loadTime: this.analytics.performance.loadTime,
      seoScore: this.analytics.performance.seoScore,
      accessibilityScore: this.analytics.performance.accessibilityScore,
    },
    engagement: {
      lastAccessed: this.analytics.usage.lastAccessed,
      lastReview: this.analytics.feedback.lastReviewDate,
    },
    revenue: {
      totalRevenue: this.analytics.conversion.revenue || 0,
      totalPurchases: this.analytics.conversion.purchases,
    },
  };
}

/**
 * Get performance trends (placeholder for complex analytics)
 */
export function getPerformanceTrends(
  this: Document & IProductVersion,
  period: "daily" | "weekly" | "monthly" = "daily",
): Promise<any> {
  return new Promise(async (resolve) => {
    // This would typically query a time-series database
    // For now, return a simplified structure
    const trends = {
      period,
      data: {
        views: this.analytics.usage.views,
        downloads: this.analytics.usage.downloads,
        conversionRate: this.analytics.conversion.conversionRate,
        averageRating: this.analytics.feedback.averageRating,
      },
      comparison: {
        previousPeriod: {
          views: Math.round(this.analytics.usage.views * 0.8),
          downloads: Math.round(this.analytics.usage.downloads * 0.9),
          conversionRate: this.analytics.conversion.conversionRate * 0.95,
          averageRating: this.analytics.feedback.averageRating * 0.98,
        },
      },
    };

    resolve(trends);
  });
}

/**
 * Reset analytics data
 */
export function resetAnalytics(
  this: Document & IProductVersion,
  preserveHistorical: boolean = true,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (preserveHistorical) {
        // Store historical data before reset
        if (!this.analytics.historical) {
          this.analytics.historical = [];
        }

        this.analytics.historical.push({
          date: new Date(),
          snapshot: {
            usage: { ...this.analytics.usage },
            conversion: { ...this.analytics.conversion },
            performance: { ...this.analytics.performance },
            feedback: { ...this.analytics.feedback },
          },
        });
      }

      // Reset current analytics
      this.analytics.usage.views = 0;
      this.analytics.usage.downloads = 0;
      this.analytics.usage.shares = 0;

      this.analytics.conversion.impressions = 0;
      this.analytics.conversion.clicks = 0;
      this.analytics.conversion.purchases = 0;
      this.analytics.conversion.conversionRate = 0;

      this.analytics.feedback.ratings = [];
      this.analytics.feedback.averageRating = 0;
      this.analytics.feedback.reviewCount = 0;

      await this.save();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export analytics data
 */
export function exportAnalytics(
  this: Document & IProductVersion,
  format: "json" | "csv" = "json",
): any {
  const data = {
    version: this.versionNumber,
    productId: this.productId,
    exportDate: new Date(),
    analytics: this.analytics,
  };

  if (format === "csv") {
    // Convert to CSV format (simplified)
    const csvData = [
      "Metric,Value",
      `Views,${this.analytics.usage.views}`,
      `Downloads,${this.analytics.usage.downloads}`,
      `Shares,${this.analytics.usage.shares}`,
      `Conversion Rate,${this.analytics.conversion.conversionRate}%`,
      `Average Rating,${this.analytics.feedback.averageRating}`,
      `Review Count,${this.analytics.feedback.reviewCount}`,
      `SEO Score,${this.analytics.performance.seoScore || "N/A"}`,
      `Accessibility Score,${this.analytics.performance.accessibilityScore || "N/A"}`,
    ].join("\n");

    return csvData;
  }

  return data;
}

export default {
  trackView,
  trackDownload,
  trackShare,
  trackConversion,
  addRating,
  updatePerformanceMetrics,
  getAnalyticsSummary,
  getPerformanceTrends,
  resetAnalytics,
  exportAnalytics,
};
