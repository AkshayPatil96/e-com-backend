/**
 * Version Comparison Schema
 * Schema for storing version comparison results and change analysis
 */

import { Schema } from "mongoose";
import { IVersionComparison } from "../../../@types/productVersion";

export const versionComparisonSchema = new Schema<IVersionComparison>(
  {
    fromVersion: {
      type: String,
      required: [true, "From version is required"],
      trim: true,
    },

    toVersion: {
      type: String,
      required: [true, "To version is required"],
      trim: true,
    },

    changes: [
      {
        field: {
          type: String,
          required: [true, "Field name is required"],
          trim: true,
        },
        type: {
          type: String,
          required: [true, "Change type is required"],
          enum: {
            values: ["added", "removed", "modified"],
            message: "Invalid change type",
          },
        },
        oldValue: {
          type: Schema.Types.Mixed,
        },
        newValue: {
          type: Schema.Types.Mixed,
        },
        impact: {
          type: String,
          required: [true, "Impact level is required"],
          enum: {
            values: ["low", "medium", "high", "critical"],
            message: "Invalid impact level",
          },
          default: "low",
        },
      },
    ],

    summary: {
      totalChanges: {
        type: Number,
        required: [true, "Total changes count is required"],
        min: [0, "Total changes cannot be negative"],
        default: 0,
      },
      criticalChanges: {
        type: Number,
        required: [true, "Critical changes count is required"],
        min: [0, "Critical changes cannot be negative"],
        default: 0,
      },
      compatibilityScore: {
        type: Number,
        required: [true, "Compatibility score is required"],
        min: [0, "Compatibility score cannot be negative"],
        max: [100, "Compatibility score cannot exceed 100"],
        default: 100,
      },
    },
  },
  {
    _id: false,
    timestamps: false,
  },
);

// Indexes for efficient querying
versionComparisonSchema.index({ fromVersion: 1, toVersion: 1 });
versionComparisonSchema.index({ "summary.compatibilityScore": -1 });
versionComparisonSchema.index({ "changes.impact": 1 });

// Virtual for change breakdown
versionComparisonSchema.virtual("changeBreakdown").get(function () {
  const breakdown = {
    added: 0,
    removed: 0,
    modified: 0,
    byImpact: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
  };

  this.changes.forEach((change: any) => {
    breakdown[change.type as keyof typeof breakdown]++;
    breakdown.byImpact[change.impact as keyof typeof breakdown.byImpact]++;
  });

  return breakdown;
});

// Virtual for risk assessment
versionComparisonSchema.virtual("riskLevel").get(function () {
  if (this.summary.criticalChanges > 0) return "critical";
  if (this.summary.compatibilityScore < 70) return "high";
  if (this.summary.compatibilityScore < 85) return "medium";
  return "low";
});

// Method to get changes by field
versionComparisonSchema.methods.getChangesByField = function (
  fieldName: string,
) {
  return this.changes.filter((change: any) => change.field === fieldName);
};

// Method to get changes by impact
versionComparisonSchema.methods.getChangesByImpact = function (impact: string) {
  return this.changes.filter((change: any) => change.impact === impact);
};

// Method to get changes by type
versionComparisonSchema.methods.getChangesByType = function (type: string) {
  return this.changes.filter((change: any) => change.type === type);
};

// Method to check if upgrade is recommended
versionComparisonSchema.methods.isUpgradeRecommended = function (): boolean {
  return (
    this.summary.compatibilityScore >= 80 && this.summary.criticalChanges === 0
  );
};

// Method to generate comparison report
versionComparisonSchema.methods.generateReport = function (): any {
  const breakdown = this.changeBreakdown;

  return {
    versions: {
      from: this.fromVersion,
      to: this.toVersion,
    },
    summary: {
      totalChanges: this.summary.totalChanges,
      criticalChanges: this.summary.criticalChanges,
      compatibilityScore: this.summary.compatibilityScore,
      riskLevel: this.riskLevel,
    },
    breakdown,
    recommendations: {
      upgradeRecommended: this.isUpgradeRecommended(),
      requiresReview:
        this.summary.criticalChanges > 0 ||
        this.summary.compatibilityScore < 70,
      requiresTesting:
        breakdown.byImpact.high > 0 || breakdown.byImpact.critical > 0,
    },
    criticalChanges: this.getChangesByImpact("critical"),
    highImpactChanges: this.getChangesByImpact("high"),
  };
};

export default versionComparisonSchema;
