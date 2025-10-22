/**
 * Audit Trail Schema
 * Schema for tracking all changes and actions on product versions
 */

import { Schema } from "mongoose";
import { IAuditTrail } from "../../../@types/productVersion";

export const auditTrailSchema = new Schema<IAuditTrail>(
  {
    action: {
      type: String,
      required: [true, "Action is required"],
      enum: {
        values: [
          "created",
          "updated",
          "published",
          "archived",
          "restored",
          "deleted",
        ],
        message: "Invalid action type",
      },
    },

    timestamp: {
      type: Date,
      required: [true, "Timestamp is required"],
      default: Date.now,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    userRole: {
      type: String,
      required: [true, "User role is required"],
      trim: true,
    },

    changes: [
      {
        field: {
          type: String,
          required: true,
          trim: true,
        },
        oldValue: {
          type: Schema.Types.Mixed,
        },
        newValue: {
          type: Schema.Types.Mixed,
        },
      },
    ],

    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },

    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: function (value: string) {
          if (!value) return true;
          // Basic IP validation (IPv4 and IPv6)
          const ipv4Regex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(value) || ipv6Regex.test(value);
        },
        message: "Invalid IP address format",
      },
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: [1000, "User agent cannot exceed 1000 characters"],
    },
  },
  {
    _id: false,
    timestamps: false,
  },
);

// Indexes for performance
auditTrailSchema.index({ timestamp: -1 });
auditTrailSchema.index({ userId: 1, timestamp: -1 });
auditTrailSchema.index({ action: 1, timestamp: -1 });

// Virtual for formatted timestamp
auditTrailSchema.virtual("formattedTimestamp").get(function () {
  return this.timestamp.toISOString();
});

// Method to get change summary
auditTrailSchema.methods.getChangeSummary = function (): string {
  if (!this.changes || this.changes.length === 0) {
    return `${this.action.charAt(0).toUpperCase() + this.action.slice(1)} action performed`;
  }

  const changeCount = this.changes.length;
  const fields = this.changes.map((change: any) => change.field).join(", ");

  return `${changeCount} field${changeCount > 1 ? "s" : ""} changed: ${fields}`;
};
export default auditTrailSchema;
