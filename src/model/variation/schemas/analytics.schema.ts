import { Schema } from "mongoose";

/**
 * Analytics schema for variations with comprehensive performance tracking
 */
export interface IVariationAnalytics {
  // Sales analytics
  sales: {
    totalSold: number; // Total quantity sold
    totalRevenue: number; // Total revenue generated
    averageOrderValue: number; // Average order value
    conversionRate?: number; // Conversion rate (views to purchases)
    returnRate?: number; // Return/refund rate
    lastSaleDate?: Date; // Date of last sale
    bestSellingPeriod?: {
      start: Date;
      end: Date;
      quantity: number;
    }; // Best performing period
  };

  // View and engagement analytics
  engagement: {
    views: number; // Total page views
    uniqueViews: number; // Unique page views
    addToCartCount: number; // Times added to cart
    wishlistCount: number; // Times added to wishlist
    shareCount: number; // Times shared on social media
    averageTimeOnPage?: number; // Average time spent on product page (seconds)
    bounceRate?: number; // Bounce rate percentage
    lastViewDate?: Date; // Date of last view
  };

  // Performance metrics
  performance: {
    rank?: number; // Ranking among variations of the same product
    popularityScore: number; // Calculated popularity score (0-100)
    trendingScore?: number; // Trending score based on recent activity
    seasonalityIndex?: number; // Seasonality index (how seasonal this variation is)
    competitiveIndex?: number; // How competitive this variation is in the market
  };

  // Customer behavior analytics
  customerBehavior: {
    averageRating?: number; // Average customer rating
    totalRatings: number; // Total number of ratings
    reviewCount: number; // Total number of reviews
    recommendationRate?: number; // Percentage of customers who recommend
    repeatPurchaseRate?: number; // Percentage of repeat purchases
    customerSegments?: {
      segment: string; // Customer segment name
      percentage: number; // Percentage of sales to this segment
    }[];
  };

  // Geographic analytics
  geographic?: {
    topCountries?: {
      country: string;
      sales: number;
      percentage: number;
    }[];
    topCities?: {
      city: string;
      country: string;
      sales: number;
    }[];
    shippingZones?: {
      zone: string;
      deliveryTime: number; // Average delivery time in days
      cost: number; // Average shipping cost
    }[];
  };

  // Time-based analytics
  temporal: {
    dailyAverages?: {
      views: number;
      sales: number;
      revenue: number;
    };
    weeklyTrends?: {
      week: Date;
      views: number;
      sales: number;
      revenue: number;
    }[];
    monthlyTrends?: {
      month: Date;
      views: number;
      sales: number;
      revenue: number;
    }[];
    seasonalPatterns?: {
      season: "spring" | "summer" | "fall" | "winter";
      salesMultiplier: number; // Sales multiplier for this season
    }[];
  };

  // Inventory analytics
  inventory: {
    turnoverRate?: number; // Inventory turnover rate
    daysToSellOut?: number; // Estimated days to sell current stock
    restockFrequency?: number; // How often restocked (per month)
    wastePercentage?: number; // Percentage of expired/damaged stock
    optimalStockLevel?: number; // AI-calculated optimal stock level
  };

  // Marketing analytics
  marketing?: {
    campaignPerformance?: {
      campaignId: string;
      campaignName: string;
      clicks: number;
      conversions: number;
      cost: number;
      revenue: number;
      roi: number; // Return on investment
    }[];
    channelPerformance?: {
      channel: string; // Marketing channel (e.g., "google_ads", "facebook")
      sales: number;
      cost: number;
      roi: number;
    }[];
    keywordPerformance?: {
      keyword: string;
      impressions: number;
      clicks: number;
      conversions: number;
    }[];
  };

  // Last updated timestamp
  lastUpdated: Date;
  nextUpdateDue?: Date; // When next analytics update is due
}

export const VariationAnalyticsSchema = new Schema<IVariationAnalytics>(
  {
    sales: {
      totalSold: {
        type: Number,
        default: 0,
        min: [0, "Total sold cannot be negative"],
      },
      totalRevenue: {
        type: Number,
        default: 0,
        min: [0, "Total revenue cannot be negative"],
      },
      averageOrderValue: {
        type: Number,
        default: 0,
        min: [0, "Average order value cannot be negative"],
      },
      conversionRate: {
        type: Number,
        min: [0, "Conversion rate cannot be negative"],
        max: [100, "Conversion rate cannot exceed 100%"],
      },
      returnRate: {
        type: Number,
        min: [0, "Return rate cannot be negative"],
        max: [100, "Return rate cannot exceed 100%"],
      },
      lastSaleDate: Date,
      bestSellingPeriod: {
        start: Date,
        end: Date,
        quantity: {
          type: Number,
          min: [0, "Best selling period quantity cannot be negative"],
        },
      },
    },

    engagement: {
      views: {
        type: Number,
        default: 0,
        min: [0, "Views cannot be negative"],
      },
      uniqueViews: {
        type: Number,
        default: 0,
        min: [0, "Unique views cannot be negative"],
      },
      addToCartCount: {
        type: Number,
        default: 0,
        min: [0, "Add to cart count cannot be negative"],
      },
      wishlistCount: {
        type: Number,
        default: 0,
        min: [0, "Wishlist count cannot be negative"],
      },
      shareCount: {
        type: Number,
        default: 0,
        min: [0, "Share count cannot be negative"],
      },
      averageTimeOnPage: {
        type: Number,
        min: [0, "Average time on page cannot be negative"],
      },
      bounceRate: {
        type: Number,
        min: [0, "Bounce rate cannot be negative"],
        max: [100, "Bounce rate cannot exceed 100%"],
      },
      lastViewDate: Date,
    },

    performance: {
      rank: {
        type: Number,
        min: [1, "Rank must be at least 1"],
      },
      popularityScore: {
        type: Number,
        default: 0,
        min: [0, "Popularity score cannot be negative"],
        max: [100, "Popularity score cannot exceed 100"],
      },
      trendingScore: {
        type: Number,
        min: [0, "Trending score cannot be negative"],
        max: [100, "Trending score cannot exceed 100"],
      },
      seasonalityIndex: {
        type: Number,
        min: [0, "Seasonality index cannot be negative"],
        max: [100, "Seasonality index cannot exceed 100"],
      },
      competitiveIndex: {
        type: Number,
        min: [0, "Competitive index cannot be negative"],
        max: [100, "Competitive index cannot exceed 100"],
      },
    },

    customerBehavior: {
      averageRating: {
        type: Number,
        min: [1, "Average rating must be at least 1"],
        max: [5, "Average rating cannot exceed 5"],
      },
      totalRatings: {
        type: Number,
        default: 0,
        min: [0, "Total ratings cannot be negative"],
      },
      reviewCount: {
        type: Number,
        default: 0,
        min: [0, "Review count cannot be negative"],
      },
      recommendationRate: {
        type: Number,
        min: [0, "Recommendation rate cannot be negative"],
        max: [100, "Recommendation rate cannot exceed 100%"],
      },
      repeatPurchaseRate: {
        type: Number,
        min: [0, "Repeat purchase rate cannot be negative"],
        max: [100, "Repeat purchase rate cannot exceed 100%"],
      },
      customerSegments: [
        {
          segment: {
            type: String,
            required: true,
            trim: true,
          },
          percentage: {
            type: Number,
            required: true,
            min: [0, "Segment percentage cannot be negative"],
            max: [100, "Segment percentage cannot exceed 100"],
          },
        },
      ],
    },

    geographic: {
      topCountries: [
        {
          country: {
            type: String,
            required: true,
            trim: true,
          },
          sales: {
            type: Number,
            required: true,
            min: [0, "Sales cannot be negative"],
          },
          percentage: {
            type: Number,
            required: true,
            min: [0, "Percentage cannot be negative"],
            max: [100, "Percentage cannot exceed 100"],
          },
        },
      ],
      topCities: [
        {
          city: {
            type: String,
            required: true,
            trim: true,
          },
          country: {
            type: String,
            required: true,
            trim: true,
          },
          sales: {
            type: Number,
            required: true,
            min: [0, "Sales cannot be negative"],
          },
        },
      ],
      shippingZones: [
        {
          zone: {
            type: String,
            required: true,
            trim: true,
          },
          deliveryTime: {
            type: Number,
            required: true,
            min: [0, "Delivery time cannot be negative"],
          },
          cost: {
            type: Number,
            required: true,
            min: [0, "Shipping cost cannot be negative"],
          },
        },
      ],
    },

    temporal: {
      dailyAverages: {
        views: {
          type: Number,
          min: [0, "Daily average views cannot be negative"],
        },
        sales: {
          type: Number,
          min: [0, "Daily average sales cannot be negative"],
        },
        revenue: {
          type: Number,
          min: [0, "Daily average revenue cannot be negative"],
        },
      },
      weeklyTrends: [
        {
          week: {
            type: Date,
            required: true,
          },
          views: {
            type: Number,
            required: true,
            min: [0, "Weekly views cannot be negative"],
          },
          sales: {
            type: Number,
            required: true,
            min: [0, "Weekly sales cannot be negative"],
          },
          revenue: {
            type: Number,
            required: true,
            min: [0, "Weekly revenue cannot be negative"],
          },
        },
      ],
      monthlyTrends: [
        {
          month: {
            type: Date,
            required: true,
          },
          views: {
            type: Number,
            required: true,
            min: [0, "Monthly views cannot be negative"],
          },
          sales: {
            type: Number,
            required: true,
            min: [0, "Monthly sales cannot be negative"],
          },
          revenue: {
            type: Number,
            required: true,
            min: [0, "Monthly revenue cannot be negative"],
          },
        },
      ],
      seasonalPatterns: [
        {
          season: {
            type: String,
            enum: ["spring", "summer", "fall", "winter"],
            required: true,
          },
          salesMultiplier: {
            type: Number,
            required: true,
            min: [0, "Sales multiplier cannot be negative"],
          },
        },
      ],
    },

    inventory: {
      turnoverRate: {
        type: Number,
        min: [0, "Turnover rate cannot be negative"],
      },
      daysToSellOut: {
        type: Number,
        min: [0, "Days to sell out cannot be negative"],
      },
      restockFrequency: {
        type: Number,
        min: [0, "Restock frequency cannot be negative"],
      },
      wastePercentage: {
        type: Number,
        min: [0, "Waste percentage cannot be negative"],
        max: [100, "Waste percentage cannot exceed 100%"],
      },
      optimalStockLevel: {
        type: Number,
        min: [0, "Optimal stock level cannot be negative"],
      },
    },

    marketing: {
      campaignPerformance: [
        {
          campaignId: {
            type: String,
            required: true,
            trim: true,
          },
          campaignName: {
            type: String,
            required: true,
            trim: true,
          },
          clicks: {
            type: Number,
            required: true,
            min: [0, "Clicks cannot be negative"],
          },
          conversions: {
            type: Number,
            required: true,
            min: [0, "Conversions cannot be negative"],
          },
          cost: {
            type: Number,
            required: true,
            min: [0, "Cost cannot be negative"],
          },
          revenue: {
            type: Number,
            required: true,
            min: [0, "Revenue cannot be negative"],
          },
          roi: {
            type: Number,
            required: true,
          },
        },
      ],
      channelPerformance: [
        {
          channel: {
            type: String,
            required: true,
            trim: true,
          },
          sales: {
            type: Number,
            required: true,
            min: [0, "Sales cannot be negative"],
          },
          cost: {
            type: Number,
            required: true,
            min: [0, "Cost cannot be negative"],
          },
          roi: {
            type: Number,
            required: true,
          },
        },
      ],
      keywordPerformance: [
        {
          keyword: {
            type: String,
            required: true,
            trim: true,
          },
          impressions: {
            type: Number,
            required: true,
            min: [0, "Impressions cannot be negative"],
          },
          clicks: {
            type: Number,
            required: true,
            min: [0, "Clicks cannot be negative"],
          },
          conversions: {
            type: Number,
            required: true,
            min: [0, "Conversions cannot be negative"],
          },
        },
      ],
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    nextUpdateDue: Date,
  },
  { _id: false },
);
