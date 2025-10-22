import mongoose, { Query, Schema } from "mongoose";
import { IProductReview } from "../../../@types/product.type";

/**
 * Static methods for Review model
 * These methods are available on the Review model itself
 */
export function addStaticMethods(schema: Schema<IProductReview>) {
  /**
   * Find reviews by product with optional filters
   * @param productId - Product ID to find reviews for
   * @param filters - Optional filters for the query
   * @returns Query for reviews
   */
  schema.statics.findByProduct = function (
    productId: string,
    filters: any = {},
  ): Query<IProductReview[], IProductReview> {
    const query = {
      product: productId,
      isVisible: true,
      ...filters,
    };
    return this.find(query)
      .populate("user", "firstName lastName avatar")
      .sort({ createdAt: -1 });
  };

  /**
   * Find reviews by user
   * @param userId - User ID to find reviews for
   * @returns Query for reviews
   */
  schema.statics.findByUser = function (
    userId: string,
  ): Query<IProductReview[], IProductReview> {
    return this.find({ user: userId })
      .populate("product", "name slug images")
      .sort({ createdAt: -1 });
  };

  /**
   * Find verified purchase reviews for a product
   * @param productId - Product ID to find reviews for
   * @returns Query for verified reviews
   */
  schema.statics.findVerifiedReviews = function (
    productId: string,
  ): Query<IProductReview[], IProductReview> {
    return this.find({
      product: productId,
      isVisible: true,
      isVerifiedPurchase: true,
    })
      .populate("user", "firstName lastName avatar")
      .sort({ createdAt: -1 });
  };

  /**
   * Get average rating and total reviews for a product
   * @param productId - Product ID to calculate stats for
   * @returns Promise with average rating and total reviews
   */
  schema.statics.getAverageRating = async function (productId: string) {
    const result = await this.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          isVisible: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    return result[0] || { averageRating: 0, totalReviews: 0 };
  };

  /**
   * Get rating distribution for a product (1-5 stars)
   * @param productId - Product ID to get distribution for
   * @returns Promise with rating distribution object
   */
  schema.statics.getRatingDistribution = async function (productId: string) {
    const result = await this.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(productId),
          isVisible: true,
        },
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
    ]);

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    result.forEach((item) => {
      distribution[item._id] = item.count;
    });

    return distribution;
  };

  /**
   * Get reviews that need moderation
   * @param limit - Maximum number of reviews to return
   * @returns Promise with reviews that need moderation
   */
  schema.statics.getReviewsNeedingModeration = function (limit: number = 50) {
    return this.find({
      $or: [
        {
          reportedCount: { $gte: 3 },
          isVisible: true,
          moderatedAt: { $exists: false },
        },
        { reportedCount: { $gte: 5 } },
      ],
    })
      .populate("user", "firstName lastName email")
      .populate("product", "name slug")
      .sort({ reportedCount: -1, createdAt: -1 })
      .limit(limit);
  };

  /**
   * Get review statistics for admin dashboard
   * @returns Promise with comprehensive review statistics
   */
  schema.statics.getReviewStatistics = async function () {
    const stats = await Promise.all([
      // Total reviews
      this.countDocuments({ isVisible: true }),

      // Reviews by rating
      this.aggregate([
        { $match: { isVisible: true } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),

      // Verified vs non-verified
      this.aggregate([
        { $match: { isVisible: true } },
        { $group: { _id: "$isVerifiedPurchase", count: { $sum: 1 } } },
      ]),

      // Reviews needing moderation
      this.countDocuments({
        reportedCount: { $gte: 3 },
        moderatedAt: { $exists: false },
      }),

      // Average helpful votes
      this.aggregate([
        { $match: { isVisible: true } },
        { $group: { _id: null, avgHelpfulVotes: { $avg: "$helpfulVotes" } } },
      ]),

      // Reviews by source
      this.aggregate([
        { $match: { isVisible: true } },
        { $group: { _id: "$reviewSource", count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalReviews: stats[0],
      ratingDistribution: stats[1],
      verificationStatus: stats[2],
      needingModeration: stats[3],
      averageHelpfulVotes: stats[4][0]?.avgHelpfulVotes || 0,
      reviewSources: stats[5],
    };
  };

  /**
   * Search reviews by text
   * @param searchTerm - Text to search for
   * @param productId - Optional product ID to limit search
   * @returns Promise with matching reviews
   */
  schema.statics.searchReviews = function (
    searchTerm: string,
    productId?: string,
  ) {
    const matchQuery: any = {
      $text: { $search: searchTerm },
      isVisible: true,
    };

    if (productId) {
      matchQuery.product = new mongoose.Types.ObjectId(productId);
    }

    return this.find(matchQuery, { score: { $meta: "textScore" } })
      .populate("user", "firstName lastName")
      .populate("product", "name slug")
      .sort({ score: { $meta: "textScore" } });
  };

  /**
   * Get top helpful reviews for a product
   * @param productId - Product ID
   * @param limit - Number of reviews to return
   * @returns Promise with top helpful reviews
   */
  schema.statics.getTopHelpfulReviews = function (
    productId: string,
    limit: number = 10,
  ) {
    return this.find({
      product: productId,
      isVisible: true,
      helpfulVotes: { $gt: 0 },
    })
      .populate("user", "firstName lastName avatar")
      .sort({ helpfulVotes: -1, createdAt: -1 })
      .limit(limit);
  };

  /**
   * Get recent reviews across all products
   * @param limit - Number of reviews to return
   * @param days - Number of days to look back
   * @returns Promise with recent reviews
   */
  schema.statics.getRecentReviews = function (
    limit: number = 20,
    days: number = 7,
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.find({
      isVisible: true,
      createdAt: { $gte: startDate },
    })
      .populate("user", "firstName lastName")
      .populate("product", "name slug images")
      .sort({ createdAt: -1 })
      .limit(limit);
  };
}
