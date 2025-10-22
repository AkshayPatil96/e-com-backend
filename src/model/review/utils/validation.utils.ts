/**
 * Review Validation Utilities
 * Helper functions for validating review data
 */

import { IProductReview } from "../../../@types/product.type";

/**
 * Validation rules for reviews
 */
export const REVIEW_VALIDATION_RULES = {
  COMMENT_MIN_LENGTH: 10,
  COMMENT_MAX_LENGTH: 1000,
  TITLE_MAX_LENGTH: 100,
  MAX_IMAGES: 5,
  MIN_RATING: 1,
  MAX_RATING: 5,
  REPORT_REASON_MAX_LENGTH: 200,
  MODERATION_REASON_MAX_LENGTH: 300,
};

/**
 * Validate review data before saving
 * @param reviewData - Review data to validate
 * @returns Validation result with errors if any
 */
export function validateReviewData(reviewData: Partial<IProductReview>) {
  const errors: string[] = [];

  // Required fields
  if (!reviewData.user) {
    errors.push("User is required");
  }

  if (!reviewData.product) {
    errors.push("Product is required");
  }

  if (!reviewData.rating) {
    errors.push("Rating is required");
  } else if (
    reviewData.rating < REVIEW_VALIDATION_RULES.MIN_RATING ||
    reviewData.rating > REVIEW_VALIDATION_RULES.MAX_RATING
  ) {
    errors.push(
      `Rating must be between ${REVIEW_VALIDATION_RULES.MIN_RATING} and ${REVIEW_VALIDATION_RULES.MAX_RATING}`,
    );
  }

  if (!reviewData.comment) {
    errors.push("Review comment is required");
  } else {
    const commentLength = reviewData.comment.trim().length;
    if (commentLength < REVIEW_VALIDATION_RULES.COMMENT_MIN_LENGTH) {
      errors.push(
        `Comment must be at least ${REVIEW_VALIDATION_RULES.COMMENT_MIN_LENGTH} characters`,
      );
    } else if (commentLength > REVIEW_VALIDATION_RULES.COMMENT_MAX_LENGTH) {
      errors.push(
        `Comment cannot exceed ${REVIEW_VALIDATION_RULES.COMMENT_MAX_LENGTH} characters`,
      );
    }
  }

  // Optional field validations
  if (
    reviewData.title &&
    reviewData.title.length > REVIEW_VALIDATION_RULES.TITLE_MAX_LENGTH
  ) {
    errors.push(
      `Title cannot exceed ${REVIEW_VALIDATION_RULES.TITLE_MAX_LENGTH} characters`,
    );
  }

  if (
    reviewData.images &&
    reviewData.images.length > REVIEW_VALIDATION_RULES.MAX_IMAGES
  ) {
    errors.push(
      `Cannot upload more than ${REVIEW_VALIDATION_RULES.MAX_IMAGES} images`,
    );
  }

  if (
    reviewData.moderationReason &&
    reviewData.moderationReason.length >
      REVIEW_VALIDATION_RULES.MODERATION_REASON_MAX_LENGTH
  ) {
    errors.push(
      `Moderation reason cannot exceed ${REVIEW_VALIDATION_RULES.MODERATION_REASON_MAX_LENGTH} characters`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize review comment to remove potentially harmful content
 * @param comment - Comment to sanitize
 * @returns Sanitized comment
 */
export function sanitizeReviewComment(comment: string): string {
  if (!comment) return "";

  // Remove HTML tags
  let sanitized = comment.replace(/<[^>]*>/g, "");

  // Remove script content
  sanitized = sanitized.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // Remove null characters
  sanitized = sanitized.replace(/\0/g, "");

  return sanitized;
}

/**
 * Validate image data for reviews
 * @param images - Array of image objects
 * @returns Validation result
 */
export function validateReviewImages(images: any[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (images.length > REVIEW_VALIDATION_RULES.MAX_IMAGES) {
    errors.push(
      `Cannot upload more than ${REVIEW_VALIDATION_RULES.MAX_IMAGES} images`,
    );
  }

  images.forEach((image, index) => {
    if (!image.url) {
      errors.push(`Image ${index + 1} is missing URL`);
    }

    if (!image.alt) {
      errors.push(`Image ${index + 1} is missing alt text`);
    }

    // Validate image URL format
    if (image.url && !isValidImageUrl(image.url)) {
      errors.push(`Image ${index + 1} has invalid URL format`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if URL is a valid image URL
 * @param url - URL to validate
 * @returns True if valid image URL
 */
function isValidImageUrl(url: string): boolean {
  // Check for S3 paths or full URLs
  const s3PathPattern = /^[a-zA-Z0-9\-_/]+\.(jpg|jpeg|png|gif|webp)$/i;
  const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;

  return s3PathPattern.test(url) || urlPattern.test(url);
}

/**
 * Validate report data
 * @param reason - Report reason
 * @returns Validation result
 */
export function validateReportData(reason: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!reason || reason.trim().length === 0) {
    errors.push("Report reason is required");
  } else if (reason.length > REVIEW_VALIDATION_RULES.REPORT_REASON_MAX_LENGTH) {
    errors.push(
      `Report reason cannot exceed ${REVIEW_VALIDATION_RULES.REPORT_REASON_MAX_LENGTH} characters`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if user can perform action on review
 * @param review - Review object
 * @param userId - User ID
 * @param action - Action to check
 * @returns Permission result
 */
export function checkReviewPermissions(
  review: any,
  userId: string,
  action: "edit" | "delete" | "vote" | "report" | "moderate",
): { allowed: boolean; reason?: string } {
  switch (action) {
    case "edit":
      if (!review.user.equals(userId)) {
        return { allowed: false, reason: "You can only edit your own reviews" };
      }

      const hoursSinceCreation =
        (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        return {
          allowed: false,
          reason: "Reviews can only be edited within 24 hours of creation",
        };
      }

      return { allowed: true };

    case "delete":
      if (!review.user.equals(userId)) {
        return {
          allowed: false,
          reason: "You can only delete your own reviews",
        };
      }

      const hoursSinceDeletion =
        (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDeletion > 48) {
        return {
          allowed: false,
          reason: "Reviews can only be deleted within 48 hours of creation",
        };
      }

      return { allowed: true };

    case "vote":
      if (review.user.equals(userId)) {
        return {
          allowed: false,
          reason: "You cannot vote on your own reviews",
        };
      }

      if (review.helpfulVotedBy.includes(userId)) {
        return {
          allowed: false,
          reason: "You have already voted on this review",
        };
      }

      return { allowed: true };

    case "report":
      if (review.user.equals(userId)) {
        return { allowed: false, reason: "You cannot report your own reviews" };
      }

      const alreadyReported = review.reportedBy.some((report: any) =>
        report.user.equals(userId),
      );
      if (alreadyReported) {
        return {
          allowed: false,
          reason: "You have already reported this review",
        };
      }

      return { allowed: true };

    case "moderate":
      // This would typically check for admin/moderator role
      // For now, we'll assume it's allowed if the user is not the review author
      if (review.user.equals(userId)) {
        return {
          allowed: false,
          reason: "You cannot moderate your own reviews",
        };
      }

      return { allowed: true };

    default:
      return { allowed: false, reason: "Unknown action" };
  }
}

/**
 * Generate review slug for SEO-friendly URLs
 * @param title - Review title
 * @param reviewId - Review ID
 * @returns SEO-friendly slug
 */
export function generateReviewSlug(title: string, reviewId: string): string {
  if (!title || title.trim().length === 0) {
    return `review-${reviewId}`;
  }

  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  return slug ? `${slug}-${reviewId}` : `review-${reviewId}`;
}
