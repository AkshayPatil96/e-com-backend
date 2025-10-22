import { Schema } from "mongoose";

/**
 * SEO and marketing schema for variations with comprehensive digital marketing features
 */
export interface IVariationSEO {
  // SEO metadata
  metadata: {
    title?: string; // Custom SEO title for this variation
    description?: string; // Meta description
    keywords: string[]; // SEO keywords specific to this variation
    slug?: string; // URL slug for this variation
    canonicalUrl?: string; // Canonical URL to prevent duplicate content
    robotsDirective?:
      | "index,follow"
      | "noindex,follow"
      | "index,nofollow"
      | "noindex,nofollow";
    structuredData?: Record<string, any>; // JSON-LD structured data
  };

  // Social media optimization
  socialMedia: {
    ogTitle?: string; // Open Graph title
    ogDescription?: string; // Open Graph description
    ogImage?: string; // Open Graph image URL
    ogType?: string; // Open Graph type
    twitterTitle?: string; // Twitter card title
    twitterDescription?: string; // Twitter card description
    twitterImage?: string; // Twitter card image
    twitterCard?: "summary" | "summary_large_image" | "app" | "player";
    pinterestDescription?: string; // Pinterest-specific description
    instagramHashtags?: string[]; // Instagram hashtags
  };

  // Search optimization
  searchOptimization: {
    searchKeywords: string[]; // Internal search keywords
    autoSuggestTerms: string[]; // Terms for autocomplete/autosuggest
    synonyms: string[]; // Alternative terms that should match this variation
    misspellings: string[]; // Common misspellings to catch
    searchRanking?: number; // Manual search ranking boost/penalty
    categoryRelevance: {
      category: string;
      relevanceScore: number; // 0-100 relevance to this category
    }[];
  };

  // Content optimization
  content: {
    alternativeNames: string[]; // Alternative product names
    marketingNames: string[]; // Marketing/brand names
    technicalNames: string[]; // Technical/industry names
    translations?: {
      language: string; // ISO language code
      title: string;
      description: string;
      keywords: string[];
    }[];
    featuredBenefits: string[]; // Key selling points for this variation
    useCases: string[]; // Common use cases or applications
  };

  // Performance tracking
  performance: {
    searchImpressions: number; // How many times shown in search results
    searchClicks: number; // How many times clicked from search
    searchCTR?: number; // Click-through rate from search
    organicTraffic?: number; // Organic search traffic
    paidTraffic?: number; // Paid search traffic
    socialTraffic?: number; // Social media traffic
    referralTraffic?: number; // Referral traffic
    lastIndexed?: Date; // Last time indexed by search engines
  };

  // Marketing campaigns
  campaigns?: {
    active: {
      campaignId: string;
      campaignName: string;
      type: "ppc" | "display" | "social" | "email" | "influencer" | "affiliate";
      startDate: Date;
      endDate?: Date;
      budget?: number;
      targetAudience?: string[];
      keywords?: string[];
      performance?: {
        impressions: number;
        clicks: number;
        conversions: number;
        cost: number;
        revenue: number;
      };
    }[];
    historical: {
      campaignId: string;
      campaignName: string;
      type: "ppc" | "display" | "social" | "email" | "influencer" | "affiliate";
      startDate: Date;
      endDate: Date;
      finalPerformance: {
        impressions: number;
        clicks: number;
        conversions: number;
        cost: number;
        revenue: number;
        roi: number;
      };
    }[];
  };

  // Competitive analysis
  competitive?: {
    competitors: {
      name: string;
      url?: string;
      price?: number;
      features?: string[];
      strengths?: string[];
      weaknesses?: string[];
      marketShare?: number;
    }[];
    positioning: {
      pricePosition: "premium" | "competitive" | "budget";
      qualityPosition: "luxury" | "standard" | "economy";
      uniqueSellingPoints: string[];
      competitiveAdvantages: string[];
    };
  };

  // Marketplace optimization
  marketplace?: {
    platforms: {
      platform: string; // e.g., "amazon", "ebay", "etsy"
      optimizations: {
        title: string;
        bulletPoints?: string[];
        description: string;
        keywords: string[];
        category: string;
        attributes?: Record<string, string>;
      };
      performance?: {
        ranking: number;
        sales: number;
        reviews: number;
        averageRating: number;
      };
    }[];
  };

  // Local SEO (for physical stores)
  local?: {
    isAvailableInStore: boolean;
    storeLocations?: string[]; // Store IDs where available
    localKeywords?: string[]; // Location-specific keywords
    geoTargeting?: {
      countries: string[];
      regions: string[];
      cities: string[];
    };
  };

  // Technical SEO
  technical: {
    imageAlt?: string; // Alt text for main product image
    imageMetadata?: {
      copyright?: string;
      photographer?: string;
      location?: string;
    };
    loadingPriority?: "high" | "normal" | "low"; // Image loading priority
    lazyLoading?: boolean; // Whether to lazy load images
    compression?: {
      webp?: boolean;
      avif?: boolean;
      quality?: number;
    };
  };

  // Last updated timestamps
  lastUpdated: Date;
  lastOptimized?: Date; // Last time SEO was manually optimized
  nextReviewDue?: Date; // When SEO should be reviewed next
}

export const VariationSEOSchema = new Schema<IVariationSEO>(
  {
    metadata: {
      title: {
        type: String,
        trim: true,
        maxlength: [60, "SEO title should not exceed 60 characters"],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [160, "Meta description should not exceed 160 characters"],
      },
      keywords: [
        {
          type: String,
          trim: true,
        },
      ],
      slug: {
        type: String,
        trim: true,
        lowercase: true,
        match: [
          /^[a-z0-9-]+$/,
          "Slug can only contain lowercase letters, numbers, and hyphens",
        ],
      },
      canonicalUrl: {
        type: String,
        trim: true,
        match: [
          /^https?:\/\/.+/,
          "Canonical URL must be a valid HTTP/HTTPS URL",
        ],
      },
      robotsDirective: {
        type: String,
        enum: [
          "index,follow",
          "noindex,follow",
          "index,nofollow",
          "noindex,nofollow",
        ],
        default: "index,follow",
      },
      structuredData: Schema.Types.Mixed,
    },

    socialMedia: {
      ogTitle: {
        type: String,
        trim: true,
        maxlength: [60, "Open Graph title should not exceed 60 characters"],
      },
      ogDescription: {
        type: String,
        trim: true,
        maxlength: [
          200,
          "Open Graph description should not exceed 200 characters",
        ],
      },
      ogImage: {
        type: String,
        trim: true,
        match: [
          /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i,
          "Open Graph image must be a valid image URL",
        ],
      },
      ogType: {
        type: String,
        trim: true,
        default: "product",
      },
      twitterTitle: {
        type: String,
        trim: true,
        maxlength: [70, "Twitter title should not exceed 70 characters"],
      },
      twitterDescription: {
        type: String,
        trim: true,
        maxlength: [
          200,
          "Twitter description should not exceed 200 characters",
        ],
      },
      twitterImage: {
        type: String,
        trim: true,
        match: [
          /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i,
          "Twitter image must be a valid image URL",
        ],
      },
      twitterCard: {
        type: String,
        enum: ["summary", "summary_large_image", "app", "player"],
        default: "summary_large_image",
      },
      pinterestDescription: {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Pinterest description should not exceed 500 characters",
        ],
      },
      instagramHashtags: [
        {
          type: String,
          trim: true,
          validate: {
            validator: function (v: string) {
              return /^#[a-zA-Z0-9_]+$/.test(v);
            },
            message:
              "Instagram hashtags must start with # and contain only letters, numbers, and underscores",
          },
        },
      ],
    },

    searchOptimization: {
      searchKeywords: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      autoSuggestTerms: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      synonyms: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      misspellings: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      searchRanking: {
        type: Number,
        min: [-100, "Search ranking cannot be less than -100"],
        max: [100, "Search ranking cannot exceed 100"],
      },
      categoryRelevance: [
        {
          category: {
            type: String,
            required: true,
            trim: true,
          },
          relevanceScore: {
            type: Number,
            required: true,
            min: [0, "Relevance score cannot be negative"],
            max: [100, "Relevance score cannot exceed 100"],
          },
        },
      ],
    },

    content: {
      alternativeNames: [
        {
          type: String,
          trim: true,
        },
      ],
      marketingNames: [
        {
          type: String,
          trim: true,
        },
      ],
      technicalNames: [
        {
          type: String,
          trim: true,
        },
      ],
      translations: [
        {
          language: {
            type: String,
            required: true,
            match: [
              /^[a-z]{2}(-[A-Z]{2})?$/,
              "Language must be in ISO format (e.g., 'en', 'en-US')",
            ],
          },
          title: {
            type: String,
            required: true,
            trim: true,
          },
          description: {
            type: String,
            required: true,
            trim: true,
          },
          keywords: [
            {
              type: String,
              trim: true,
            },
          ],
        },
      ],
      featuredBenefits: [
        {
          type: String,
          trim: true,
        },
      ],
      useCases: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    performance: {
      searchImpressions: {
        type: Number,
        default: 0,
        min: [0, "Search impressions cannot be negative"],
      },
      searchClicks: {
        type: Number,
        default: 0,
        min: [0, "Search clicks cannot be negative"],
      },
      searchCTR: {
        type: Number,
        min: [0, "Search CTR cannot be negative"],
        max: [100, "Search CTR cannot exceed 100%"],
      },
      organicTraffic: {
        type: Number,
        min: [0, "Organic traffic cannot be negative"],
      },
      paidTraffic: {
        type: Number,
        min: [0, "Paid traffic cannot be negative"],
      },
      socialTraffic: {
        type: Number,
        min: [0, "Social traffic cannot be negative"],
      },
      referralTraffic: {
        type: Number,
        min: [0, "Referral traffic cannot be negative"],
      },
      lastIndexed: Date,
    },

    campaigns: {
      active: [
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
          type: {
            type: String,
            required: true,
            enum: [
              "ppc",
              "display",
              "social",
              "email",
              "influencer",
              "affiliate",
            ],
          },
          startDate: {
            type: Date,
            required: true,
          },
          endDate: Date,
          budget: {
            type: Number,
            min: [0, "Budget cannot be negative"],
          },
          targetAudience: [
            {
              type: String,
              trim: true,
            },
          ],
          keywords: [
            {
              type: String,
              trim: true,
            },
          ],
          performance: {
            impressions: {
              type: Number,
              default: 0,
              min: [0, "Impressions cannot be negative"],
            },
            clicks: {
              type: Number,
              default: 0,
              min: [0, "Clicks cannot be negative"],
            },
            conversions: {
              type: Number,
              default: 0,
              min: [0, "Conversions cannot be negative"],
            },
            cost: {
              type: Number,
              default: 0,
              min: [0, "Cost cannot be negative"],
            },
            revenue: {
              type: Number,
              default: 0,
              min: [0, "Revenue cannot be negative"],
            },
          },
        },
      ],
      historical: [
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
          type: {
            type: String,
            required: true,
            enum: [
              "ppc",
              "display",
              "social",
              "email",
              "influencer",
              "affiliate",
            ],
          },
          startDate: {
            type: Date,
            required: true,
          },
          endDate: {
            type: Date,
            required: true,
          },
          finalPerformance: {
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
        },
      ],
    },

    competitive: {
      competitors: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          url: {
            type: String,
            trim: true,
            match: [
              /^https?:\/\/.+/,
              "Competitor URL must be a valid HTTP/HTTPS URL",
            ],
          },
          price: {
            type: Number,
            min: [0, "Competitor price cannot be negative"],
          },
          features: [
            {
              type: String,
              trim: true,
            },
          ],
          strengths: [
            {
              type: String,
              trim: true,
            },
          ],
          weaknesses: [
            {
              type: String,
              trim: true,
            },
          ],
          marketShare: {
            type: Number,
            min: [0, "Market share cannot be negative"],
            max: [100, "Market share cannot exceed 100%"],
          },
        },
      ],
      positioning: {
        pricePosition: {
          type: String,
          enum: ["premium", "competitive", "budget"],
        },
        qualityPosition: {
          type: String,
          enum: ["luxury", "standard", "economy"],
        },
        uniqueSellingPoints: [
          {
            type: String,
            trim: true,
          },
        ],
        competitiveAdvantages: [
          {
            type: String,
            trim: true,
          },
        ],
      },
    },

    marketplace: {
      platforms: [
        {
          platform: {
            type: String,
            required: true,
            trim: true,
          },
          optimizations: {
            title: {
              type: String,
              required: true,
              trim: true,
            },
            bulletPoints: [
              {
                type: String,
                trim: true,
              },
            ],
            description: {
              type: String,
              required: true,
              trim: true,
            },
            keywords: [
              {
                type: String,
                trim: true,
              },
            ],
            category: {
              type: String,
              required: true,
              trim: true,
            },
            attributes: Schema.Types.Mixed,
          },
          performance: {
            ranking: {
              type: Number,
              min: [1, "Ranking must be at least 1"],
            },
            sales: {
              type: Number,
              min: [0, "Sales cannot be negative"],
            },
            reviews: {
              type: Number,
              min: [0, "Reviews cannot be negative"],
            },
            averageRating: {
              type: Number,
              min: [1, "Average rating must be at least 1"],
              max: [5, "Average rating cannot exceed 5"],
            },
          },
        },
      ],
    },

    local: {
      isAvailableInStore: {
        type: Boolean,
        default: false,
      },
      storeLocations: [
        {
          type: String,
          trim: true,
        },
      ],
      localKeywords: [
        {
          type: String,
          trim: true,
        },
      ],
      geoTargeting: {
        countries: [
          {
            type: String,
            trim: true,
            uppercase: true,
            match: [/^[A-Z]{2}$/, "Country must be a 2-letter ISO code"],
          },
        ],
        regions: [
          {
            type: String,
            trim: true,
          },
        ],
        cities: [
          {
            type: String,
            trim: true,
          },
        ],
      },
    },

    technical: {
      imageAlt: {
        type: String,
        trim: true,
        maxlength: [125, "Alt text should not exceed 125 characters"],
      },
      imageMetadata: {
        copyright: {
          type: String,
          trim: true,
        },
        photographer: {
          type: String,
          trim: true,
        },
        location: {
          type: String,
          trim: true,
        },
      },
      loadingPriority: {
        type: String,
        enum: ["high", "normal", "low"],
        default: "normal",
      },
      lazyLoading: {
        type: Boolean,
        default: true,
      },
      compression: {
        webp: {
          type: Boolean,
          default: true,
        },
        avif: {
          type: Boolean,
          default: false,
        },
        quality: {
          type: Number,
          min: [1, "Quality must be at least 1"],
          max: [100, "Quality cannot exceed 100"],
          default: 80,
        },
      },
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastOptimized: Date,
    nextReviewDue: Date,
  },
  { _id: false },
);
