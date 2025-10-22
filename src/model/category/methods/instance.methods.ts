import { Model, Schema } from "mongoose";
import { ICategory } from "../../../@types/category.type";

/**
 * Instance methods for Category
 */
export function instanceMethods(schema: Schema<ICategory>) {
  /**
   * Soft delete the category
   */
  schema.methods.softDelete = async function (this: ICategory): Promise<void> {
    this.isDeleted = true;
    this.isActive = false;
    await this.save();
  };

  /**
   * Restore the category
   */
  schema.methods.restore = async function (this: ICategory): Promise<void> {
    this.isDeleted = false;
    this.isActive = true;
    await this.save();
  };

  /**
   * Update product count for this category
   */
  schema.methods.updateProductCount = async function (
    this: ICategory,
  ): Promise<void> {
    try {
      // This would require the Product model
      // For now, we'll implement a placeholder
      const ProductModel = require("../../product.model").default;

      const count = await ProductModel.countDocuments({
        category: this._id,
        isActive: true,
        isDeleted: false,
      });

      this.productCount = count;
      await this.save();
    } catch (error) {
      console.warn("Could not update product count:", error);
    }
  };

  /**
   * Get direct children of this category
   */
  schema.methods.getChildren = async function (
    this: ICategory,
  ): Promise<ICategory[]> {
    const CategoryModel = this.constructor as Model<ICategory>;
    return await CategoryModel.find({
      parent: this._id,
      isDeleted: false,
    }).sort({ order: 1 });
  };

  /**
   * Get full hierarchy from root to this category
   */
  schema.methods.getFullHierarchy = async function (
    this: ICategory,
  ): Promise<ICategory[]> {
    const CategoryModel = this.constructor as Model<ICategory>;
    const hierarchy: ICategory[] = [];

    // Get all ancestors
    if (this.ancestors.length > 0) {
      const ancestors = await CategoryModel.find({
        _id: { $in: this.ancestors },
      }).sort({ level: 1 });
      hierarchy.push(...ancestors);
    }

    // Add current category
    hierarchy.push(this as ICategory);

    return hierarchy;
  };

  /**
   * Check if this is a leaf category (has no children)
   */
  schema.methods.isLeafCategory = async function (
    this: ICategory,
  ): Promise<boolean> {
    const CategoryModel = this.constructor as Model<ICategory>;
    const childCount = await CategoryModel.countDocuments({
      parent: this._id,
      isDeleted: false,
    });
    return childCount === 0;
  };
}
