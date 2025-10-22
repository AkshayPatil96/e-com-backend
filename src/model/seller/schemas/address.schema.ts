import { SellerAddressSchema } from "../../schema/common.model";

/**
 * Seller address schema - imported from common schemas
 * This ensures consistency across the application while maintaining seller-specific requirements
 *
 * Features:
 * - Business-specific address types: business, pickup, billing, return
 * - GeoJSON Point structure for location coordinates
 * - Supports firstLine/secondLine address format
 * - Includes _id for subdocuments
 * - Comprehensive validation including coordinate validation
 */
export { SellerAddressSchema };
