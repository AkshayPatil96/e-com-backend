/**
 * Review Model Export
 *
 * This file maintains backward compatibility by re-exporting
 * the new modular review model structure.
 *
 * The review model has been restructured into a more organized format:
 * - review/schemas/: Schema definitions
 * - review/methods/: Instance and static methods
 * - review/middleware/: Validation and other middleware
 * - review/utils/: Analytics and moderation utilities
 * - review/index.ts: Main model assembly
 *
 * All existing functionality is preserved and enhanced.
 */

import Review from "./review/index";

export default Review;

// Re-export utilities for convenience
export {
  AUTO_MODERATION_CONFIG,
  autoModerateReview,
  BulkModerationActions,
  calculateReviewQuality,
  calculateSentimentScore,
  detectFakeReview,
  generateModerationQueue,
  generateModerationRecommendations,
  generateModerationReport,
  generateReviewInsights,
} from "./review/index";

// Export the model interface
export type { IReviewModel } from "./review/index";
