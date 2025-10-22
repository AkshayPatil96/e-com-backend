import mongoose, { Schema } from "mongoose";
import { IProductReview } from "../../../@types/product.type";
import ErrorHandler from "../../../utils/ErrorHandler";

/**
 * Instance methods for Review model
 * These methods are available on individual review documents
 */
export function addInstanceMethods(schema: Schema<IProductReview>) {
  /**
   * Vote review as helpful
   * @param userId - ID of the user voting
   */
  schema.methods.voteHelpful = async function (
    userId: mongoose.Types.ObjectId,
  ): Promise<void> {
    if (!this.helpfulVotedBy.includes(userId)) {
      this.helpfulVotedBy.push(userId);
      this.helpfulVotes += 1;
      await this.save();
    } else {
      throw new ErrorHandler(
        400,
        "User has already voted this review as helpful",
      );
    }
  };

  /**
   * Remove helpful vote
   * @param userId - ID of the user removing the vote
   */
  schema.methods.removeHelpfulVote = async function (
    userId: mongoose.Types.ObjectId,
  ): Promise<void> {
    const index = this.helpfulVotedBy.indexOf(userId);
    if (index > -1) {
      this.helpfulVotedBy.splice(index, 1);
      this.helpfulVotes = Math.max(0, this.helpfulVotes - 1);
      await this.save();
    } else {
      throw new ErrorHandler(400, "User has not voted this review as helpful");
    }
  };

  /**
   * Report review for inappropriate content
   * @param userId - ID of the user reporting
   * @param reason - Reason for reporting
   */
  schema.methods.reportReview = async function (
    userId: mongoose.Types.ObjectId,
    reason: string,
  ): Promise<void> {
    // Check if user already reported this review
    const alreadyReported = this.reportedBy.some((report: any) =>
      report.user.equals(userId),
    );
    if (alreadyReported) {
      throw new ErrorHandler(400, "User has already reported this review");
    }

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      throw new ErrorHandler(400, "Report reason is required");
    }

    if (reason.length > 200) {
      throw new ErrorHandler(400, "Report reason cannot exceed 200 characters");
    }

    this.reportedBy.push({
      user: userId,
      reason: reason.trim(),
      reportedAt: new Date(),
    });
    this.reportedCount += 1;
    await this.save();
  };

  /**
   * Moderate review (admin function)
   * @param moderatorId - ID of the moderator
   * @param isVisible - Whether review should be visible
   * @param reason - Reason for moderation
   */
  schema.methods.moderate = async function (
    moderatorId: mongoose.Types.ObjectId,
    isVisible: boolean,
    reason?: string,
  ): Promise<void> {
    this.isVisible = isVisible;
    this.moderatedBy = moderatorId;
    this.moderatedAt = new Date();
    if (reason) {
      this.moderationReason = reason.trim();
    }
    await this.save();
  };

  /**
   * Check if user can edit this review
   * @param userId - ID of the user
   * @returns boolean indicating if user can edit
   */
  schema.methods.canEdit = function (userId: mongoose.Types.ObjectId): boolean {
    // User can edit their own review within 24 hours of creation
    const hoursSinceCreation =
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return this.user.equals(userId) && hoursSinceCreation <= 24;
  };

  /**
   * Check if user can delete this review
   * @param userId - ID of the user
   * @returns boolean indicating if user can delete
   */
  schema.methods.canDelete = function (
    userId: mongoose.Types.ObjectId,
  ): boolean {
    // User can delete their own review within 48 hours of creation
    const hoursSinceCreation =
      (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return this.user.equals(userId) && hoursSinceCreation <= 48;
  };

  /**
   * Get review summary for display
   * @returns object with formatted review data
   */
  schema.methods.getSummary = function () {
    return {
      id: this._id,
      rating: this.rating,
      title: this.title,
      comment:
        this.comment.substring(0, 200) +
        (this.comment.length > 200 ? "..." : ""),
      isVerifiedPurchase: this.isVerifiedPurchase,
      isRecommended: this.isRecommended,
      helpfulVotes: this.helpfulVotes,
      createdAt: this.createdAt,
      user: {
        // This would be populated in actual usage
        name: "User Name",
      },
    };
  };

  /**
   * Toggle recommendation status
   */
  schema.methods.toggleRecommendation = async function (): Promise<void> {
    this.isRecommended = !this.isRecommended;
    await this.save();
  };
}
