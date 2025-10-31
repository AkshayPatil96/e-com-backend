import { model, Model, Query, Schema } from "mongoose";
import { ICategory } from "../../@types/category.type";
import { IMetadataSchema } from "../../@types/common.type";
import { instanceMethods, staticMethods } from "./methods";
import {
  preDeleteMiddleware,
  preSaveMiddleware,
  preUpdateMiddleware,
} from "./middleware";
import {
  CategoryAttributeSchema,
  CategorySEOSchema,
  CategorySettingsSchema,
} from "./schemas";

// Interface for the model with static methods
export interface ICategoryModel extends Model<ICategory> {
  findActiveCategories(
    additionalQuery?: Record<string, any>,
  ): Query<ICategory[], ICategory>;
  findActiveOne(query: Record<string, any>): Query<ICategory | null, ICategory>;
  getHierarchyTree(parentId?: string): Promise<ICategory[]>;
  getLeafCategories(): Promise<ICategory[]>;
  getBreadcrumbPath(categoryId: string): Promise<any[]>;
  moveCategory(categoryId: string, newParentId?: string): Promise<ICategory>;
  updateDescendantHierarchy(parentId: string): Promise<void>;
}

/**
 * Category Schema Definition
 */
const CategorySchema = new Schema<ICategory>(
  {
    order: { type: Number, default: 0 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, "Category code must be at least 2 characters"],
      maxlength: [6, "Category code cannot exceed 6 characters"],
      match: [/^[A-Z0-9]+$/, "Category code can only contain uppercase letters and numbers"],
    },
    slug: { type: String, required: true, unique: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    ancestors: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    level: { type: Number, default: 0, min: 0 },
    path: { type: String, required: true, trim: true },
    materializedPath: { type: String, required: true, trim: true },

    // Content and display
    description: { type: String, trim: true, maxlength: 1000 },
    shortDescription: { type: String, trim: true, maxlength: 200 },
    images: [{ type: Schema.Types.Mixed }], // IImage[]
    banner: { type: Schema.Types.Mixed }, // IImage
    icon: { type: Schema.Types.Mixed }, // IImage

    // Attributes and filtering
    attributes: [CategoryAttributeSchema],
    brands: [{ type: Schema.Types.ObjectId, ref: "Brand" }],

    // SEO and metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    } as any, // IMetadataSchema
    seo: {
      type: CategorySEOSchema,
      default: () => ({}),
    },
    searchKeywords: [{ type: String, trim: true }],

    // Business settings
    settings: {
      type: CategorySettingsSchema,
      default: () => ({
        allowProducts: true,
        requireApproval: false,
        featuredProductsLimit: 10,
      }),
    },

    // Analytics and metrics
    productCount: { type: Number, default: 0, min: 0 },
    totalProductCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, min: 0, max: 5 },

    // Status and flags
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    showInMenu: { type: Boolean, default: true },
    showInHomepage: { type: Boolean, default: false },

    // Timestamps and tracking
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false, // We handle timestamps manually
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Apply middleware
preSaveMiddleware(CategorySchema);
preUpdateMiddleware(CategorySchema);
preDeleteMiddleware(CategorySchema);

// Apply methods
instanceMethods(CategorySchema);
staticMethods(CategorySchema);

// Indexes for performance
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ code: 1 }, { unique: true });
CategorySchema.index({ parent: 1, order: 1 });
CategorySchema.index({ ancestors: 1 });
CategorySchema.index({ level: 1 });
CategorySchema.index({ materializedPath: 1 });
CategorySchema.index({ isActive: 1, isDeleted: 1 });
CategorySchema.index({ isFeatured: 1 });
CategorySchema.index({ isPopular: 1 });
CategorySchema.index({ showInMenu: 1 });
CategorySchema.index({ searchKeywords: 1 });
CategorySchema.index({ createdAt: -1 });
CategorySchema.index({ viewCount: -1 });

// Export the schema and model
export { CategorySchema };
export default model<ICategory, ICategoryModel>("Category", CategorySchema);
