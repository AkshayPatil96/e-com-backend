import mongoose, { Model } from "mongoose";
import { IProductReview } from "../../@types/product.type";

// Import schema
import { ReviewSchema } from "./schemas/review.schema";

// Import middleware
import { applyReviewMiddleware } from "./middleware/validation.middleware";

// Import methods
import { addInstanceMethods } from "./methods/instance.methods";
import { addStaticMethods } from "./methods/static.methods";

// Extend the Mongoose Model interface to include static methods
interface IReviewModel extends Model<IProductReview> {
  findByProduct(
    productId: string,
    filters?: any,
  ): mongoose.Query<IProductReview[], IProductReview>;
  findByUser(userId: string): mongoose.Query<IProductReview[], IProductReview>;
  findVerifiedReviews(
    productId: string,
  ): mongoose.Query<IProductReview[], IProductReview>;
  getAverageRating(
    productId: string,
  ): Promise<{ averageRating: number; totalReviews: number }>;
  getRatingDistribution(productId: string): Promise<Record<number, number>>;
  getReviewsNeedingModeration(
    limit?: number,
  ): mongoose.Query<IProductReview[], IProductReview>;
  getReviewStatistics(): Promise<any>;
  searchReviews(
    searchTerm: string,
    productId?: string,
  ): mongoose.Query<IProductReview[], IProductReview>;
  getTopHelpfulReviews(
    productId: string,
    limit?: number,
  ): mongoose.Query<IProductReview[], IProductReview>;
  getRecentReviews(
    limit?: number,
    days?: number,
  ): mongoose.Query<IProductReview[], IProductReview>;
}

/**
 * Apply middleware to schema
 */
applyReviewMiddleware(ReviewSchema);

/**
 * Add instance methods to schema
 */
addInstanceMethods(ReviewSchema);

/**
 * Add static methods to schema
 */
addStaticMethods(ReviewSchema);

/**
 * Create and export the Review model
 */
const Review: IReviewModel = mongoose.model<IProductReview, IReviewModel>(
  "Review",
  ReviewSchema,
);

export default Review;

// Export utilities for external use
export * from "./utils/analytics.utils";
export * from "./utils/moderation.utils";

// Export types
export type { IReviewModel };

/**
 * Review Model Documentation
 *
 * This model handles product reviews with the following features:
 *
 * Core Features:
 * - User reviews with ratings (1-5 stars)
 * - Image uploads for reviews
 * - Helpful vote system
 * - Review reporting and moderation
 * - Verified purchase tracking
 * - Recommendation system
 *
 * Analytics Features:
 * - Sentiment analysis
 * - Quality scoring
 * - Fake review detection
 * - Review insights and trends
 * - Common keyword extraction
 *
 * Moderation Features:
 * - Auto-moderation based on reports
 * - Spam detection
 * - Inappropriate content filtering
 * - Bulk moderation actions
 * - Moderation queue management
 *
 * Usage Examples:
 *
 * 1. Create a new review:
 * ```typescript
 * const review = new Review({
 *   user: userId,
 *   product: productId,
 *   rating: 5,
 *   comment: "Great product!",
 *   isVerifiedPurchase: true
 * });
 * await review.save();
 * ```
 *
 * 2. Get product reviews:
 * ```typescript
 * const reviews = await Review.findByProduct(productId);
 * ```
 *
 * 3. Vote a review as helpful:
 * ```typescript
 * await review.voteHelpful(userId);
 * ```
 *
 * 4. Get review statistics:
 * ```typescript
 * const stats = await Review.getAverageRating(productId);
 * ```
 *
 * 5. Auto-moderate reviews:
 * ```typescript
 * import { autoModerateReview } from './utils/moderation.utils';
 * const result = await autoModerateReview(review, userHistory);
 * ```
 */
