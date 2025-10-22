/**
 * Review Analytics Utilities
 * Functions for analyzing review data and generating insights
 */

import mongoose from "mongoose";

/**
 * Calculate review sentiment score based on rating and text analysis
 * @param rating - Review rating (1-5)
 * @param comment - Review comment text
 * @returns Sentiment score between -1 (negative) and 1 (positive)
 */
export function calculateSentimentScore(
  rating: number,
  comment: string,
): number {
  // Base sentiment from rating (normalized to -1 to 1 scale)
  const ratingSentiment = (rating - 3) / 2; // 1->-1, 2->-0.5, 3->0, 4->0.5, 5->1

  // Simple text analysis for sentiment keywords
  const positiveWords = [
    "good",
    "great",
    "excellent",
    "amazing",
    "love",
    "perfect",
    "awesome",
    "fantastic",
    "recommend",
    "quality",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "hate",
    "worst",
    "poor",
    "horrible",
    "disappointing",
    "waste",
    "defective",
  ];

  const lowerComment = comment.toLowerCase();
  const positiveCount = positiveWords.filter((word) =>
    lowerComment.includes(word),
  ).length;
  const negativeCount = negativeWords.filter((word) =>
    lowerComment.includes(word),
  ).length;

  // Text sentiment contribution (weighted less than rating)
  const textSentiment = (positiveCount - negativeCount) * 0.1;

  // Combine rating and text sentiment
  const finalSentiment = Math.max(
    -1,
    Math.min(1, ratingSentiment + textSentiment),
  );

  return Math.round(finalSentiment * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate review quality score based on various factors
 * @param review - Review data
 * @returns Quality score between 0 and 100
 */
export function calculateReviewQuality(review: {
  comment: string;
  title?: string;
  images?: any[];
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  reportedCount: number;
}): number {
  let score = 0;

  // Comment length and detail (40 points)
  const commentLength = review.comment.length;
  if (commentLength >= 50) score += 20;
  else if (commentLength >= 25) score += 10;

  if (commentLength >= 200) score += 10;
  if (commentLength >= 500) score += 10;

  // Title presence (5 points)
  if (review.title && review.title.trim().length > 0) {
    score += 5;
  }

  // Images (15 points)
  if (review.images && review.images.length > 0) {
    score += 10;
    if (review.images.length >= 3) score += 5;
  }

  // Verified purchase (20 points)
  if (review.isVerifiedPurchase) {
    score += 20;
  }

  // Helpful votes (15 points)
  if (review.helpfulVotes > 0) {
    score += 5;
    if (review.helpfulVotes >= 5) score += 5;
    if (review.helpfulVotes >= 10) score += 5;
  }

  // Deduct for reports (negative points)
  score -= review.reportedCount * 10;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate review insights for a product
 * @param reviews - Array of reviews for analysis
 * @returns Object with various insights
 */
export function generateReviewInsights(reviews: any[]) {
  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      sentimentScore: 0,
      qualityScore: 0,
      verificationRate: 0,
      recommendationRate: 0,
      trends: {},
      commonKeywords: [],
    };
  }

  const totalReviews = reviews.length;
  const averageRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

  // Sentiment analysis
  const sentimentScores = reviews.map((r) =>
    calculateSentimentScore(r.rating, r.comment || ""),
  );
  const averageSentiment =
    sentimentScores.reduce((sum, s) => sum + s, 0) / sentimentScores.length;

  // Quality analysis
  const qualityScores = reviews.map((r) => calculateReviewQuality(r));
  const averageQuality =
    qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;

  // Verification rate
  const verifiedReviews = reviews.filter((r) => r.isVerifiedPurchase).length;
  const verificationRate = (verifiedReviews / totalReviews) * 100;

  // Recommendation rate
  const recommendedReviews = reviews.filter(
    (r) => r.isRecommended === true,
  ).length;
  const recommendationRate = (recommendedReviews / totalReviews) * 100;

  // Time trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentReviews = reviews.filter(
    (r) => new Date(r.createdAt) >= thirtyDaysAgo,
  );

  // Common keywords extraction
  const allComments = reviews
    .map((r) => r.comment || "")
    .join(" ")
    .toLowerCase();
  const words = allComments.match(/\b\w{4,}\b/g) || [];
  const wordFreq: { [key: string]: number } = {};
  words.forEach((word) => {
    if (
      ![
        "this",
        "that",
        "with",
        "from",
        "they",
        "have",
        "been",
        "will",
        "more",
        "very",
      ].includes(word)
    ) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const commonKeywords = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  return {
    averageRating: Math.round(averageRating * 100) / 100,
    totalReviews,
    sentimentScore: Math.round(averageSentiment * 100) / 100,
    qualityScore: Math.round(averageQuality * 100) / 100,
    verificationRate: Math.round(verificationRate * 100) / 100,
    recommendationRate: Math.round(recommendationRate * 100) / 100,
    trends: {
      recent30Days: recentReviews.length,
      recentAverageRating:
        recentReviews.length > 0
          ? Math.round(
              (recentReviews.reduce((sum, r) => sum + r.rating, 0) /
                recentReviews.length) *
                100,
            ) / 100
          : 0,
    },
    commonKeywords,
  };
}

/**
 * Detect potentially fake reviews
 * @param review - Review to analyze
 * @param userReviewHistory - User's previous reviews
 * @returns Suspicion score (0-100, higher = more suspicious)
 */
export function detectFakeReview(
  review: any,
  userReviewHistory: any[] = [],
): number {
  let suspicionScore = 0;

  // Check comment quality
  const comment = review.comment || "";

  // Very short comments
  if (comment.length < 20) suspicionScore += 20;

  // Very generic comments
  const genericPhrases = [
    "good product",
    "nice quality",
    "fast delivery",
    "recommend",
    "satisfied",
  ];
  const genericMatches = genericPhrases.filter((phrase) =>
    comment.toLowerCase().includes(phrase),
  ).length;
  if (genericMatches >= 2) suspicionScore += 15;

  // Excessive exclamation marks
  const exclamationCount = (comment.match(/!/g) || []).length;
  if (exclamationCount > 3) suspicionScore += 10;

  // All caps words
  const allCapsWords = comment.match(/\b[A-Z]{3,}\b/g) || [];
  if (allCapsWords.length > 2) suspicionScore += 15;

  // Check user behavior
  if (userReviewHistory.length > 0) {
    // Reviews all on same day
    const reviewDates = userReviewHistory.map((r) =>
      new Date(r.createdAt).toDateString(),
    );
    const uniqueDates = new Set(reviewDates);
    if (uniqueDates.size === 1 && userReviewHistory.length > 3) {
      suspicionScore += 25;
    }

    // All 5-star reviews
    const allFiveStars = userReviewHistory.every((r) => r.rating === 5);
    if (allFiveStars && userReviewHistory.length > 5) {
      suspicionScore += 20;
    }

    // Very similar comments
    const commentSimilarity = userReviewHistory.filter((r) => {
      const similarity = calculateStringSimilarity(comment, r.comment || "");
      return similarity > 0.8;
    }).length;
    if (commentSimilarity > 1) suspicionScore += 30;
  }

  // Not verified purchase but very positive
  if (!review.isVerifiedPurchase && review.rating === 5) {
    suspicionScore += 15;
  }

  return Math.min(100, suspicionScore);
}

/**
 * Calculate string similarity using simple approach
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0 and 1
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);

  const allWords = new Set([...words1, ...words2]);
  const intersection = words1.filter((word) => words2.includes(word));

  return intersection.length / allWords.size;
}

/**
 * Generate moderation recommendations
 * @param review - Review to analyze
 * @returns Moderation recommendations
 */
export function generateModerationRecommendations(review: any) {
  const recommendations = [];
  const qualityScore = calculateReviewQuality(review);
  const fakeScore = detectFakeReview(review);

  if (fakeScore > 70) {
    recommendations.push({
      action: "hide",
      reason: "High probability of fake review",
      confidence: "high",
    });
  } else if (fakeScore > 40) {
    recommendations.push({
      action: "flag",
      reason: "Potential fake review - needs manual review",
      confidence: "medium",
    });
  }

  if (qualityScore < 30) {
    recommendations.push({
      action: "flag",
      reason: "Low quality review - lacks detail",
      confidence: "medium",
    });
  }

  if (review.reportedCount >= 3) {
    recommendations.push({
      action: "review",
      reason: "Multiple user reports",
      confidence: "high",
    });
  }

  // Check for inappropriate content
  const inappropriateWords = ["spam", "fake", "scam", "terrible service"];
  const hasInappropriateContent = inappropriateWords.some((word) =>
    review.comment.toLowerCase().includes(word),
  );

  if (hasInappropriateContent) {
    recommendations.push({
      action: "flag",
      reason: "Potentially inappropriate content detected",
      confidence: "medium",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      action: "approve",
      reason: "Review appears legitimate",
      confidence: "high",
    });
  }

  return recommendations;
}
