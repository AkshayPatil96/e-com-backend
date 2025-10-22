import { SocialMediaSchema as BrandSocialMediaSchema } from "../../schema/common.model";

/**
 * Brand social media schema - imported from common schemas
 * This ensures consistency across the application while providing comprehensive social media validation
 *
 * Features:
 * - Platform-specific URL validation for Facebook, Twitter/X, Instagram, LinkedIn, YouTube, TikTok
 * - Support for both full URLs and social media handles (where applicable)
 * - Website URL validation for brand websites
 * - Comprehensive error messages
 * - Trim whitespace automatically
 */
export { BrandSocialMediaSchema };
