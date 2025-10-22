import { Schema } from "mongoose";
import { IProductReview } from "../../../@types/product.type";
import ErrorHandler from "../../../utils/ErrorHandler";

/**
 * Pre-save middleware for review validation and business rules
 */
export function preValidateReview(schema: Schema<IProductReview>) {
  /**
   * Pre-save middleware to validate business rules
   */
  schema.pre<IProductReview>("save", async function (next) {
    try {
      // Check if user has already reviewed this product (prevent duplicate reviews)
      if (this.isNew) {
        const Review = this.constructor as any;
        const existingReview = await Review.findOne({
          user: this.user,
          product: this.product,
          _id: { $ne: this._id },
        });

        if (existingReview) {
          throw new ErrorHandler(400, "User has already reviewed this product");
        }
      }

      // Auto-moderate if reported too many times
      if (this.reportedCount >= 5 && this.isVisible) {
        this.isVisible = false;
        this.moderationReason = "Auto-moderated due to multiple reports";
      }

      // Set review source if not provided
      if (!this.reviewSource) {
        this.reviewSource = "website";
      }

      // Validate rating within bounds
      if (this.rating < 1 || this.rating > 5) {
        throw new ErrorHandler(400, "Rating must be between 1 and 5");
      }

      // Ensure comment length meets requirements
      if (this.comment && this.comment.trim().length < 10) {
        throw new ErrorHandler(
          400,
          "Review comment must be at least 10 characters",
        );
      }

      // Validate images count
      if (this.images && this.images.length > 5) {
        throw new ErrorHandler(
          400,
          "Cannot upload more than 5 images per review",
        );
      }

      next();
    } catch (error) {
      next(error as any);
    }
  });
}

/**
 * Pre-update middleware for reviews
 */
export function preUpdateReview(schema: Schema<IProductReview>) {
  schema.pre(["updateOne", "findOneAndUpdate"], async function (next) {
    try {
      const update = this.getUpdate() as any;

      // If rating is being updated, validate it
      if (update.rating !== undefined) {
        if (update.rating < 1 || update.rating > 5) {
          throw new ErrorHandler(400, "Rating must be between 1 and 5");
        }
      }

      // If comment is being updated, validate length
      if (update.comment !== undefined) {
        if (update.comment.trim().length < 10) {
          throw new ErrorHandler(
            400,
            "Review comment must be at least 10 characters",
          );
        }
      }

      // If images are being updated, validate count
      if (update.images !== undefined) {
        if (update.images.length > 5) {
          throw new ErrorHandler(
            400,
            "Cannot upload more than 5 images per review",
          );
        }
      }

      next();
    } catch (error) {
      next(error as any);
    }
  });
}

/**
 * Post-save middleware for analytics and notifications
 */
export function postSaveReview(schema: Schema<IProductReview>) {
  schema.post<IProductReview>("save", async function (doc) {
    try {
      // Update product review statistics
      if (this.isNew && this.isVisible) {
        // This would typically trigger a background job to update product stats
        // For now, we'll just log it
        console.log(`New review added for product ${doc.product}`);
      }

      // Check if review needs immediate moderation attention
      if (doc.reportedCount >= 3 && doc.isVisible && !doc.moderatedAt) {
        console.log(`Review ${doc._id} needs moderation attention`);
        // This could trigger a notification to moderators
      }
    } catch (error) {
      console.error("Error in post-save review middleware:", error);
    }
  });
}

/**
 * Post-remove middleware for cleanup
 */
export function postRemoveReview(schema: Schema<IProductReview>) {
  schema.post(
    "deleteOne",
    { document: true, query: false },
    async function (doc) {
      try {
        console.log(
          `Review ${doc._id} was deleted, updating product statistics`,
        );
        // This would typically trigger a background job to update product stats
      } catch (error) {
        console.error("Error in post-remove review middleware:", error);
      }
    },
  );
}

/**
 * Apply all middleware to the schema
 */
export function applyReviewMiddleware(schema: Schema<IProductReview>) {
  preValidateReview(schema);
  preUpdateReview(schema);
  postSaveReview(schema);
  postRemoveReview(schema);
}
