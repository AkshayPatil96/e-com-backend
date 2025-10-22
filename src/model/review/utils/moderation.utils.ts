/**
 * Review Moderation Utilities
 * Functions for automated and manual review moderation
 */

import { IProductReview } from "../../../@types/product.type";
import {
  detectFakeReview,
  generateModerationRecommendations,
} from "./analytics.utils";

/**
 * Auto-moderation rules configuration
 */
export const AUTO_MODERATION_CONFIG = {
  HIDE_THRESHOLD: 5, // Hide review after this many reports
  FLAG_THRESHOLD: 3, // Flag for manual review after this many reports
  FAKE_REVIEW_THRESHOLD: 70, // Hide if fake review score is above this
  SPAM_KEYWORDS: [
    "click here",
    "visit site",
    "buy now",
    "discount code",
    "free shipping",
    "limited time",
    "promotional",
    "advertisement",
  ],
  INAPPROPRIATE_CONTENT: [
    "hate speech",
    "discriminatory",
    "personal attack",
    "harassment",
    "profanity",
    "explicit content",
    "off-topic",
    "competitor mention",
  ],
};

/**
 * Automated moderation workflow
 * @param review - Review to moderate
 * @param userHistory - User's review history for context
 * @returns Moderation decision
 */
export async function autoModerateReview(review: any, userHistory: any[] = []) {
  const moderationResult = {
    action: "approve" as "approve" | "flag" | "hide" | "delete",
    reason: "",
    confidence: "low" as "low" | "medium" | "high",
    autoModerated: true,
    needsHumanReview: false,
    scores: {
      fake: 0,
      quality: 0,
      spam: 0,
      inappropriate: 0,
    },
  };

  // Calculate various scores
  const fakeScore = detectFakeReview(review, userHistory);
  const spamScore = calculateSpamScore(review);
  const inappropriateScore = calculateInappropriateContentScore(review);

  moderationResult.scores = {
    fake: fakeScore,
    quality: calculateQualityScore(review),
    spam: spamScore,
    inappropriate: inappropriateScore,
  };

  // Auto-hide for high fake score
  if (fakeScore >= AUTO_MODERATION_CONFIG.FAKE_REVIEW_THRESHOLD) {
    moderationResult.action = "hide";
    moderationResult.reason =
      "Automatically hidden - high probability of fake review";
    moderationResult.confidence = "high";
    return moderationResult;
  }

  // Auto-hide for excessive reports
  if (review.reportedCount >= AUTO_MODERATION_CONFIG.HIDE_THRESHOLD) {
    moderationResult.action = "hide";
    moderationResult.reason = "Automatically hidden - excessive user reports";
    moderationResult.confidence = "high";
    return moderationResult;
  }

  // Flag for manual review
  if (
    review.reportedCount >= AUTO_MODERATION_CONFIG.FLAG_THRESHOLD ||
    fakeScore >= 40 ||
    spamScore >= 70 ||
    inappropriateScore >= 60
  ) {
    moderationResult.action = "flag";
    moderationResult.reason =
      "Flagged for manual review - potential policy violation";
    moderationResult.confidence = "medium";
    moderationResult.needsHumanReview = true;
    return moderationResult;
  }

  // Auto-hide spam
  if (spamScore >= 90) {
    moderationResult.action = "hide";
    moderationResult.reason = "Automatically hidden - detected as spam";
    moderationResult.confidence = "high";
    return moderationResult;
  }

  // Approve if all checks pass
  moderationResult.action = "approve";
  moderationResult.reason =
    "Automatically approved - passed all moderation checks";
  moderationResult.confidence = "medium";

  return moderationResult;
}

/**
 * Calculate spam score for a review
 * @param review - Review to analyze
 * @returns Spam score (0-100)
 */
function calculateSpamScore(review: any): number {
  let score = 0;
  const comment = (review.comment || "").toLowerCase();

  // Check for spam keywords
  const spamKeywords = AUTO_MODERATION_CONFIG.SPAM_KEYWORDS;
  const spamMatches = spamKeywords.filter((keyword) =>
    comment.includes(keyword.toLowerCase()),
  ).length;
  score += spamMatches * 20;

  // Check for excessive URLs
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  const urls = comment.match(urlPattern) || [];
  if (urls.length > 0) score += 30;
  if (urls.length > 2) score += 40;

  // Check for excessive repetition
  const words = comment.split(/\s+/);
  const wordCount: { [key: string]: number } = {};
  words.forEach((word: string) => {
    if (word.length > 3) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  const maxRepeats = Math.max(...Object.values(wordCount));
  if (maxRepeats > 3) score += 20;
  if (maxRepeats > 5) score += 30;

  // Check for excessive capitals
  const allCapsRatio = (comment.match(/[A-Z]/g) || []).length / comment.length;
  if (allCapsRatio > 0.3) score += 25;

  // Check for promotional language patterns
  const promoPatterns = [
    /\d+%\s*off/i,
    /free\s+shipping/i,
    /limited\s+time/i,
    /order\s+now/i,
    /click\s+here/i,
  ];

  const promoMatches = promoPatterns.filter((pattern) =>
    pattern.test(comment),
  ).length;
  score += promoMatches * 15;

  return Math.min(100, score);
}

/**
 * Calculate inappropriate content score
 * @param review - Review to analyze
 * @returns Inappropriate content score (0-100)
 */
function calculateInappropriateContentScore(review: any): number {
  let score = 0;
  const comment = (review.comment || "").toLowerCase();

  // Check for inappropriate keywords
  const inappropriateKeywords = AUTO_MODERATION_CONFIG.INAPPROPRIATE_CONTENT;
  const inappropriateMatches = inappropriateKeywords.filter((keyword) =>
    comment.includes(keyword.toLowerCase()),
  ).length;
  score += inappropriateMatches * 25;

  // Check for personal information
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;

  if (emailPattern.test(comment)) score += 20;
  if (phonePattern.test(comment)) score += 20;

  // Check for competitor mentions (simple approach)
  const competitorKeywords = ["amazon", "ebay", "walmart", "target", "alibaba"];
  const competitorMentions = competitorKeywords.filter((comp) =>
    comment.includes(comp),
  ).length;
  score += competitorMentions * 15;

  // Check for excessive negative language
  const negativeWords = [
    "hate",
    "terrible",
    "worst",
    "awful",
    "horrible",
    "disgusting",
  ];
  const negativeCount = negativeWords.filter((word) =>
    comment.includes(word),
  ).length;
  if (negativeCount > 3) score += 20;

  return Math.min(100, score);
}

/**
 * Simple quality score calculation
 * @param review - Review to analyze
 * @returns Quality score (0-100)
 */
function calculateQualityScore(review: any): number {
  let score = 0;
  const comment = review.comment || "";

  // Length-based scoring
  if (comment.length >= 50) score += 25;
  if (comment.length >= 100) score += 25;
  if (comment.length >= 200) score += 25;

  // Verified purchase bonus
  if (review.isVerifiedPurchase) score += 25;

  return score;
}

/**
 * Generate moderation queue for admin dashboard
 * @param reviews - Reviews to process
 * @returns Prioritized moderation queue
 */
export function generateModerationQueue(reviews: any[]) {
  return reviews
    .map((review) => ({
      ...review,
      moderationScore: calculateModerationPriority(review),
      recommendations: generateModerationRecommendations(review),
    }))
    .sort((a, b) => b.moderationScore - a.moderationScore);
}

/**
 * Calculate moderation priority score
 * @param review - Review to score
 * @returns Priority score (higher = more urgent)
 */
function calculateModerationPriority(review: any): number {
  let score = 0;

  // Reports are high priority
  score += review.reportedCount * 20;

  // Recent reviews get priority
  const daysSinceCreated =
    (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated < 1) score += 30;
  else if (daysSinceCreated < 7) score += 15;

  // High visibility reviews (lots of helpful votes) get priority
  score += Math.min(review.helpfulVotes * 2, 20);

  // Fake reviews get high priority
  const fakeScore = detectFakeReview(review);
  if (fakeScore > 50) score += 40;

  return score;
}

/**
 * Bulk moderation actions
 */
export class BulkModerationActions {
  /**
   * Auto-moderate a batch of reviews
   * @param reviews - Reviews to moderate
   * @returns Results of moderation actions
   */
  static async autoModerateBatch(reviews: any[]) {
    const results = {
      approved: 0,
      flagged: 0,
      hidden: 0,
      errors: [] as string[],
    };

    for (const review of reviews) {
      try {
        const moderationResult = await autoModerateReview(review);

        switch (moderationResult.action) {
          case "approve":
            results.approved++;
            break;
          case "flag":
            results.flagged++;
            break;
          case "hide":
            results.hidden++;
            break;
        }
      } catch (error) {
        results.errors.push(`Error moderating review ${review._id}: ${error}`);
      }
    }

    return results;
  }

  /**
   * Hide all reviews from a specific user
   * @param userId - User ID to hide reviews for
   * @param reason - Reason for hiding
   */
  static async hideUserReviews(userId: string, reason: string) {
    // This would be implemented with the actual Review model
    console.log(`Hiding all reviews from user ${userId}: ${reason}`);
  }

  /**
   * Restore hidden reviews that were false positives
   * @param reviewIds - Array of review IDs to restore
   */
  static async restoreReviews(reviewIds: string[]) {
    console.log(`Restoring reviews: ${reviewIds.join(", ")}`);
  }
}

/**
 * Moderation analytics and reporting
 */
export function generateModerationReport(
  period: "day" | "week" | "month" = "week",
) {
  // This would query the database for moderation statistics
  return {
    period,
    totalReviews: 0,
    autoModerated: 0,
    humanModerated: 0,
    approved: 0,
    flagged: 0,
    hidden: 0,
    falsePositives: 0,
    accuracy: 0,
  };
}
