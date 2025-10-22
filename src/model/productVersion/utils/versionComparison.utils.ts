/**
 * Version Comparison Utilities
 * Helper functions for comparing versions and detecting changes
 */

import crypto from "crypto";
import {
  IVersionComparison,
  IVersionData,
} from "../../../@types/productVersion";

/**
 * Compare two version numbers using semantic versioning
 */
export function compareVersionNumbers(
  version1: string,
  version2: string,
): number {
  const v1Parts = parseVersionNumber(version1);
  const v2Parts = parseVersionNumber(version2);

  // Compare major, minor, patch
  for (let i = 0; i < 3; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }

  return 0; // Equal
}

/**
 * Parse version number into numeric parts
 */
export function parseVersionNumber(version: string): number[] {
  // Handle semantic versioning (1.2.3)
  const semanticMatch = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (semanticMatch) {
    return [
      parseInt(semanticMatch[1]),
      parseInt(semanticMatch[2]),
      parseInt(semanticMatch[3]),
    ];
  }

  // Handle simple versioning (v1, v2, etc.)
  const simpleMatch = version.match(/^v?(\d+)$/i);
  if (simpleMatch) {
    return [parseInt(simpleMatch[1]), 0, 0];
  }

  // Fallback to string comparison
  return [0, 0, 0];
}

/**
 * Generate next version number based on increment type
 */
export function generateNextVersion(
  currentVersion: string,
  incrementType: "major" | "minor" | "patch" = "patch",
): string {
  const parts = parseVersionNumber(currentVersion);

  switch (incrementType) {
    case "major":
      return `${parts[0] + 1}.0.0`;
    case "minor":
      return `${parts[0]}.${parts[1] + 1}.0`;
    case "patch":
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

/**
 * Deep compare two objects and return detailed differences
 */
export function deepCompareObjects(
  obj1: any,
  obj2: any,
  path: string = "",
): Array<{
  field: string;
  type: "added" | "modified" | "removed";
  oldValue: any;
  newValue: any;
  significance: "high" | "medium" | "low";
}> {
  const differences: Array<{
    field: string;
    type: "added" | "modified" | "removed";
    oldValue: any;
    newValue: any;
    significance: "high" | "medium" | "low";
  }> = [];

  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(obj1 || {}),
    ...Object.keys(obj2 || {}),
  ]);

  allKeys.forEach((key) => {
    const currentPath = path ? `${path}.${key}` : key;
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    if (val1 === undefined && val2 !== undefined) {
      differences.push({
        field: currentPath,
        type: "added",
        oldValue: undefined,
        newValue: val2,
        significance: determineFieldSignificance(currentPath),
      });
    } else if (val1 !== undefined && val2 === undefined) {
      differences.push({
        field: currentPath,
        type: "removed",
        oldValue: val1,
        newValue: undefined,
        significance: determineFieldSignificance(currentPath),
      });
    } else if (val1 !== undefined && val2 !== undefined) {
      if (isObject(val1) && isObject(val2)) {
        // Recursively compare nested objects
        differences.push(...deepCompareObjects(val1, val2, currentPath));
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences.push({
          field: currentPath,
          type: "modified",
          oldValue: val1,
          newValue: val2,
          significance: determineFieldSignificance(currentPath),
        });
      }
    }
  });

  return differences;
}

/**
 * Determine significance of field change
 */
export function determineFieldSignificance(
  fieldPath: string,
): "high" | "medium" | "low" {
  const highSignificanceFields = [
    "price.basePrice",
    "price.salePrice",
    "title",
    "category",
    "brand",
    "inventory.sku",
    "inventory.stock",
  ];

  const mediumSignificanceFields = [
    "description",
    "media.images",
    "seo.slug",
    "seo.metaTitle",
    "shipping.weight",
    "inventory.lowStockThreshold",
  ];

  if (highSignificanceFields.some((field) => fieldPath.includes(field))) {
    return "high";
  }

  if (mediumSignificanceFields.some((field) => fieldPath.includes(field))) {
    return "medium";
  }

  return "low";
}

/**
 * Check if value is an object (but not array or null)
 */
export function isObject(value: any): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Calculate compatibility score between two versions
 */
export function calculateCompatibilityScore(differences: any[]): number {
  if (differences.length === 0) return 100;

  let score = 100;

  differences.forEach((diff) => {
    switch (diff.significance) {
      case "high":
        score -= 15;
        break;
      case "medium":
        score -= 8;
        break;
      case "low":
        score -= 3;
        break;
    }

    // Additional penalty for removed fields
    if (diff.type === "removed") {
      score -= 5;
    }
  });

  return Math.max(0, score);
}

/**
 * Generate diff summary text
 */
export function generateDiffSummary(differences: any[]): string {
  if (differences.length === 0) {
    return "No differences found between versions.";
  }

  const added = differences.filter((d) => d.type === "added").length;
  const modified = differences.filter((d) => d.type === "modified").length;
  const removed = differences.filter((d) => d.type === "removed").length;

  const highImpact = differences.filter(
    (d) => d.significance === "high",
  ).length;
  const mediumImpact = differences.filter(
    (d) => d.significance === "medium",
  ).length;

  let summary = `${differences.length} total changes: `;

  const parts = [];
  if (added > 0) parts.push(`${added} added`);
  if (modified > 0) parts.push(`${modified} modified`);
  if (removed > 0) parts.push(`${removed} removed`);

  summary += parts.join(", ");

  if (highImpact > 0) {
    summary += `. ${highImpact} high-impact changes`;
  } else if (mediumImpact > 0) {
    summary += `. ${mediumImpact} medium-impact changes`;
  }

  return summary;
}

/**
 * Create checksum for version data integrity
 */
export function createChecksum(data: any): string {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash("md5").update(jsonString).digest("hex");
}

/**
 * Validate checksum for version data
 */
export function validateChecksum(data: any, expectedChecksum: string): boolean {
  const actualChecksum = createChecksum(data);
  return actualChecksum === expectedChecksum;
}

/**
 * Calculate data size in bytes
 */
export function calculateDataSize(data: any): number {
  const jsonString = JSON.stringify(data);
  return Buffer.byteLength(jsonString, "utf8");
}

/**
 * Flatten nested object into dot notation paths
 */
export function flattenObject(
  obj: any,
  prefix: string = "",
): Record<string, any> {
  const flattened: Record<string, any> = {};

  Object.keys(obj || {}).forEach((key) => {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (isObject(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], fullPath));
    } else {
      flattened[fullPath] = obj[key];
    }
  });

  return flattened;
}

/**
 * Get value from object using dot notation path
 */
export function getValueByPath(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Set value in object using dot notation path
 */
export function setValueByPath(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  const lastKey = keys.pop();

  if (!lastKey) return;

  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * Sanitize version data for comparison (remove timestamps, IDs, etc.)
 */
export function sanitizeVersionData(data: IVersionData): IVersionData {
  const sanitized = JSON.parse(JSON.stringify(data));

  // Remove fields that shouldn't affect comparison
  const fieldsToRemove = [
    "createdAt",
    "updatedAt",
    "lastModified",
    "_id",
    "id",
  ];

  fieldsToRemove.forEach((field) => {
    delete sanitized[field];
  });

  return sanitized;
}

/**
 * Merge version data with conflict resolution
 */
export function mergeVersionData(
  baseData: IVersionData,
  incomingData: IVersionData,
  strategy:
    | "prefer-incoming"
    | "prefer-base"
    | "merge-deep" = "prefer-incoming",
): IVersionData {
  switch (strategy) {
    case "prefer-base":
      return { ...incomingData, ...baseData };

    case "prefer-incoming":
      return { ...baseData, ...incomingData };

    case "merge-deep":
      return deepMerge(baseData, incomingData);

    default:
      return incomingData;
  }
}

/**
 * Deep merge two objects
 */
export function deepMerge(obj1: any, obj2: any): any {
  const result = { ...obj1 };

  Object.keys(obj2).forEach((key) => {
    if (isObject(result[key]) && isObject(obj2[key])) {
      result[key] = deepMerge(result[key], obj2[key]);
    } else {
      result[key] = obj2[key];
    }
  });

  return result;
}

export default {
  compareVersionNumbers,
  parseVersionNumber,
  generateNextVersion,
  deepCompareObjects,
  determineFieldSignificance,
  isObject,
  calculateCompatibilityScore,
  generateDiffSummary,
  createChecksum,
  validateChecksum,
  calculateDataSize,
  flattenObject,
  getValueByPath,
  setValueByPath,
  sanitizeVersionData,
  mergeVersionData,
  deepMerge,
};
