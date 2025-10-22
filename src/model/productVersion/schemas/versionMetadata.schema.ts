/**
 * Version Metadata Schema
 * Schema for storing version metadata, checksums, and technical information
 */

import { Schema } from "mongoose";
import { IVersionMetadata } from "../../../@types/productVersion";

export const versionMetadataSchema = new Schema<IVersionMetadata>(
  {
    size: {
      type: Number,
      required: [true, "Version size is required"],
      min: [0, "Size cannot be negative"],
      default: 0,
    },

    checksum: {
      type: String,
      required: [true, "Checksum is required"],
      trim: true,
      validate: {
        validator: function (value: string) {
          // MD5 hash validation (32 hex characters)
          return /^[a-f0-9]{32}$/i.test(value);
        },
        message: "Invalid MD5 checksum format",
      },
    },

    compression: {
      type: String,
      enum: {
        values: ["gzip", "brotli", "none"],
        message: "Invalid compression type",
      },
      default: "none",
    },

    source: {
      type: String,
      required: [true, "Source is required"],
      enum: {
        values: ["manual", "import", "api", "bulk", "migration"],
        message: "Invalid source type",
      },
      default: "manual",
    },

    migrationId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },

    importBatch: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [50, "Tag cannot exceed 50 characters"],
      },
    ],

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  {
    _id: false,
    timestamps: false,
  },
);

// Indexes for performance
versionMetadataSchema.index({ source: 1 });
versionMetadataSchema.index({ tags: 1 });
versionMetadataSchema.index({ migrationId: 1 }, { sparse: true });
versionMetadataSchema.index({ importBatch: 1 }, { sparse: true });

// Virtual for formatted size
versionMetadataSchema.virtual("formattedSize").get(function () {
  const bytes = this.size;
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
});

// Method to validate checksum
versionMetadataSchema.methods.validateChecksum = function (
  data: string,
): boolean {
  const crypto = require("crypto");
  const calculatedChecksum = crypto
    .createHash("md5")
    .update(data)
    .digest("hex");
  return calculatedChecksum === this.checksum;
};

// Method to add tag
versionMetadataSchema.methods.addTag = function (tag: string): void {
  const normalizedTag = tag.toLowerCase().trim();
  if (normalizedTag && !this.tags.includes(normalizedTag)) {
    this.tags.push(normalizedTag);
  }
};

// Method to remove tag
versionMetadataSchema.methods.removeTag = function (tag: string): void {
  const normalizedTag = tag.toLowerCase().trim();
  const index = this.tags.indexOf(normalizedTag);
  if (index > -1) {
    this.tags.splice(index, 1);
  }
};

export default versionMetadataSchema;
