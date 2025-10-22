/**
 * Middleware Index for ProductVersion
 * Combines all middleware modules
 */

import { Schema } from "mongoose";
import AuditMiddleware from "./audit.middleware";
import ValidationMiddleware from "./validation.middleware";
import VersioningMiddleware from "./versioning.middleware";

/**
 * Apply all middleware to the ProductVersion schema
 */
export function applyAllMiddleware(schema: Schema): void {
  // Apply validation middleware
  ValidationMiddleware.applyValidationMiddleware(schema);

  // Apply audit middleware
  AuditMiddleware.applyAuditMiddleware(schema);

  // Apply versioning middleware
  VersioningMiddleware.applyVersioningMiddleware(schema);
}

// Export individual middleware modules
export { AuditMiddleware, ValidationMiddleware, VersioningMiddleware };

export default {
  applyAllMiddleware,
  ValidationMiddleware,
  AuditMiddleware,
  VersioningMiddleware,
};
