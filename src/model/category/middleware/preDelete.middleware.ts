import { Schema } from "mongoose";
import { ICategory } from "../../../@types/category.type";

/**
 * Pre-delete middleware for category
 */
export function preDeleteMiddleware(schema: Schema<ICategory>) {
  schema.pre(
    ["findOneAndDelete", "deleteOne", "deleteMany"],
    async function () {
      try {
        const CategoryModel = this.model;
        const doc = await CategoryModel.findOne(this.getQuery());

        if (doc) {
          // Check if category has children
          const childrenCount = await CategoryModel.countDocuments({
            parent: doc._id,
          });
          if (childrenCount > 0) {
            throw new Error(
              "Cannot delete category with subcategories. Please delete or move subcategories first.",
            );
          }

          // Check if category has products (would need Product model)
          // This is a placeholder - you might want to implement this check
          console.log(`Deleting category: ${doc.name} (${doc._id})`);
        }
      } catch (error) {
        throw error;
      }
    },
  );
}
