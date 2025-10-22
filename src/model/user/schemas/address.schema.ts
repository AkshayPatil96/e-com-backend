import { UserAddressSchema as AddressSchema } from "../../schema/common.model";

/**
 * User address schema - imported from common schemas
 * This ensures consistency across the application while maintaining user-specific requirements
 *
 * Features:
 * - Uses postalCode field to match existing user model
 * - Predefined label enums: Home, Work, Other
 * - Includes _id for subdocuments
 * - Comprehensive validation
 */
export { AddressSchema };
