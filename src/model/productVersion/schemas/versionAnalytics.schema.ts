/**
 * Version Analytics Schema
 * Schema for tracking performance metrics, usage statistics, and analytics
 */

import { Schema } from "mongoose";
import { IVersionAnalytics } from "../../../@types/productVersion";

export const versionAnalyticsSchema = new Schema<IVersionAnalytics>(
  {
    performance: {
      loadTime: {
        type: Number,
        min: [0, "Load time cannot be negative"],
        default: 0,
      },
      renderTime: {
        type: Number,
        min: [0, "Render time cannot be negative"],
        default: 0,
      },
      seoScore: {
        type: Number,
        min: [0, "SEO score cannot be negative"],
        max: [100, "SEO score cannot exceed 100"],
        default: 0,
      },
      accessibilityScore: {
        type: Number,
        min: [0, "Accessibility score cannot be negative"],
        max: [100, "Accessibility score cannot exceed 100"],
        default: 0,
      },
    },

    usage: {
      views: {
        type: Number,
        required: [true, "Views count is required"],
        min: [0, "Views cannot be negative"],
        default: 0,
        index: true,
      },
      downloads: {
        type: Number,
        required: [true, "Downloads count is required"],
        min: [0, "Downloads cannot be negative"],
        default: 0,
        index: true,
      },
      shares: {
        type: Number,
        required: [true, "Shares count is required"],
        min: [0, "Shares cannot be negative"],
        default: 0,
      },
      lastAccessed: {
        type: Date,
        index: true,
      },
    },

    conversion: {
      impressions: {
        type: Number,
        required: [true, "Impressions count is required"],
        min: [0, "Impressions cannot be negative"],
        default: 0,
      },
      clicks: {
        type: Number,
        required: [true, "Clicks count is required"],
        min: [0, "Clicks cannot be negative"],
        default: 0,
      },
      purchases: {
        type: Number,
        required: [true, "Purchases count is required"],
        min: [0, "Purchases cannot be negative"],
        default: 0,
      },
      conversionRate: {
        type: Number,
        required: [true, "Conversion rate is required"],
        min: [0, "Conversion rate cannot be negative"],
        max: [100, "Conversion rate cannot exceed 100%"],
        default: 0,
      },
    },

    feedback: {
      ratings: [
        {
          type: Number,
          min: [1, "Rating must be at least 1"],
          max: [5, "Rating cannot exceed 5"],
        },
      ],
      averageRating: {
        type: Number,
        required: [true, "Average rating is required"],
        min: [0, "Average rating cannot be negative"],
        max: [5, "Average rating cannot exceed 5"],
        default: 0,
      },
      reviewCount: {
        type: Number,
        required: [true, "Review count is required"],
        min: [0, "Review count cannot be negative"],
        default: 0,
      },
      lastReviewDate: {
        type: Date,
        index: true,
      },
    },
  },
  {
    _id: false,
    timestamps: false,
  },
);

// Indexes for analytics queries
versionAnalyticsSchema.index({ "usage.views": -1 });
versionAnalyticsSchema.index({ "usage.downloads": -1 });
versionAnalyticsSchema.index({ "conversion.conversionRate": -1 });
versionAnalyticsSchema.index({ "feedback.averageRating": -1 });
versionAnalyticsSchema.index({ "usage.lastAccessed": -1 });

// Virtual for click-through rate
versionAnalyticsSchema.virtual("clickThroughRate").get(function () {
  if (this.conversion.impressions === 0) return 0;
  return (this.conversion.clicks / this.conversion.impressions) * 100;
});

// Virtual for engagement score
versionAnalyticsSchema.virtual("engagementScore").get(function () {
  const viewWeight = 1;
  const downloadWeight = 3;
  const shareWeight = 5;
  const purchaseWeight = 10;

  const totalEngagement =
    this.usage.views * viewWeight +
    this.usage.downloads * downloadWeight +
    this.usage.shares * shareWeight +
    this.conversion.purchases * purchaseWeight;

  return Math.min(totalEngagement / 100, 100); // Cap at 100
});

// Virtual for overall performance score
versionAnalyticsSchema.virtual("performanceScore").get(function () {
  const seoWeight = 0.3;
  const accessibilityWeight = 0.3;
  const speedWeight = 0.4;

  // Speed score based on load and render time (lower is better)
  const maxLoadTime = 5000; // 5 seconds
  const maxRenderTime = 2000; // 2 seconds
  const loadScore = Math.max(
    0,
    100 - ((this.performance.loadTime || 0) / maxLoadTime) * 100,
  );
  const renderScore = Math.max(
    0,
    100 - ((this.performance.renderTime || 0) / maxRenderTime) * 100,
  );
  const speedScore = (loadScore + renderScore) / 2;

  return (
    (this.performance.seoScore || 0) * seoWeight +
    (this.performance.accessibilityScore || 0) * accessibilityWeight +
    speedScore * speedWeight
  );
});

// Method to update conversion rate
versionAnalyticsSchema.methods.updateConversionRate = function (): void {
  if (this.conversion.clicks > 0) {
    this.conversion.conversionRate =
      (this.conversion.purchases / this.conversion.clicks) * 100;
  } else {
    this.conversion.conversionRate = 0;
  }
};

// Method to add rating
versionAnalyticsSchema.methods.addRating = function (rating: number): void {
  if (rating >= 1 && rating <= 5) {
    this.feedback.ratings.push(rating);
    this.feedback.reviewCount = this.feedback.ratings.length;
    this.feedback.lastReviewDate = new Date();

    // Calculate new average
    const sum = this.feedback.ratings.reduce(
      (acc: number, val: number) => acc + val,
      0,
    );
    this.feedback.averageRating = sum / this.feedback.ratings.length;
  }
};

// Method to increment view
versionAnalyticsSchema.methods.incrementView = function (): void {
  this.usage.views += 1;
  this.usage.lastAccessed = new Date();
};

// Method to increment download
versionAnalyticsSchema.methods.incrementDownload = function (): void {
  this.usage.downloads += 1;
  this.usage.lastAccessed = new Date();
};

// Method to increment share
versionAnalyticsSchema.methods.incrementShare = function (): void {
  this.usage.shares += 1;
};

// Method to track conversion
versionAnalyticsSchema.methods.trackConversion = function (
  impressions = 0,
  clicks = 0,
  purchases = 0,
): void {
  this.conversion.impressions += impressions;
  this.conversion.clicks += clicks;
  this.conversion.purchases += purchases;
  this.updateConversionRate();
};

export default versionAnalyticsSchema;
