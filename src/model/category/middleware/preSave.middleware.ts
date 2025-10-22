import { Schema, Types } from "mongoose";
import { ICategory } from "../../../@types/category.type";
import { generateSlugAndPath } from "../utils/hierarchy.utils";

/**
 * Pre-save middleware for category
 */
export function preSaveMiddleware(schema: Schema<ICategory>) {
  schema.pre("save", async function (next) {
    try {
      // Generate slug and path if this is a new document or name/parent changed
      if (this.isNew || this.isModified("name") || this.isModified("parent")) {
        const parentId = this.parent ? this.parent.toString() : null;
        const result = await generateSlugAndPath(this.name, parentId);
        this.slug = result.slug;
        this.path = result.path;
        this.materializedPath = result.materializedPath;
        this.level = result.level;
        this.ancestors = result.ancestors.map(
          (id: string) => new Types.ObjectId(id),
        );
      }

      // Set order if not provided
      if (this.isNew && this.order === undefined) {
        try {
          const CategoryModel = this.constructor as any;
          const maxOrder = await CategoryModel.findOne(
            { parent: this.parent },
            { order: 1 },
          ).sort({ order: -1 });
          this.order = maxOrder ? maxOrder.order + 1 : 0;
        } catch (error) {
          console.warn("Error setting category order:", error);
          this.order = 0;
        }
      }

      // Update timestamps
      if (this.isNew) {
        this.createdAt = new Date();
      }
      this.updatedAt = new Date();

      next();
    } catch (error) {
      next(error as Error);
    }
  });
}
