/**
 * Utils Index for ProductVersion
 * Combines all utility modules
 */

import DataTransformationUtils from "./dataTransformation.utils";
import VersionComparisonUtils from "./versionComparison.utils";

// Export individual utility modules
export { DataTransformationUtils, VersionComparisonUtils };

// Export commonly used functions directly
export const {
  compareVersionNumbers,
  generateNextVersion,
  deepCompareObjects,
  calculateCompatibilityScore,
  createChecksum,
  validateChecksum,
} = VersionComparisonUtils;

export const {
  transformToVersionData,
  transformFromVersionData,
  sanitizeString,
  generateSlug,
  validateVersionDataStructure,
  cleanVersionData,
} = DataTransformationUtils;

export default {
  VersionComparisonUtils,
  DataTransformationUtils,
};
