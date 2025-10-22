import { Model, Query, Schema } from "mongoose";
import { ICategory } from "../../../@types/category.type";

/**
 * Static methods for Category
 */
export function staticMethods(schema: Schema<ICategory>) {
  /**
   * Find active categories with additional query parameters
   */
  schema.statics.findActiveCategories = function (
    additionalQuery: Record<string, any> = {},
  ): Query<ICategory[], ICategory> {
    return this.find({
      isDeleted: false,
      isActive: true,
      ...additionalQuery,
    });
  };

  /**
   * Find one active category
   */
  schema.statics.findActiveOne = function (
    query: Record<string, any>,
  ): Query<ICategory | null, ICategory> {
    return this.findOne({
      ...query,
      isDeleted: false,
      isActive: true,
    });
  };

  /**
   * Get category hierarchy tree structure
   */
  schema.statics.getHierarchyTree = async function (parentId?: string) {
    const query = parentId ? { parent: parentId } : { parent: null };

    const categories = await this.find({
      ...query,
      isDeleted: false,
      isActive: true,
    }).sort({ order: 1 });

    return categories;
  };

  /**
   * Get all leaf categories (categories with no children)
   */
  schema.statics.getLeafCategories = async function () {
    const allCategories = await this.find({ isDeleted: false, isActive: true });
    const leafCategories = [];

    for (const category of allCategories) {
      const hasChildren = await this.countDocuments({
        parent: category._id,
        isDeleted: false,
      });

      if (hasChildren === 0) {
        leafCategories.push(category);
      }
    }

    return leafCategories;
  };

  /**
   * Get breadcrumb path for a category
   */
  schema.statics.getBreadcrumbPath = async function (categoryId: string) {
    const category = await this.findById(categoryId);
    if (!category) {
      return [];
    }

    const breadcrumb = [];

    // Get ancestors
    if (category.ancestors.length > 0) {
      const ancestors = await this.find({
        _id: { $in: category.ancestors },
      }).sort({ level: 1 });

      breadcrumb.push(
        ...ancestors.map((cat: any) => ({
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          level: cat.level,
        })),
      );
    }

    // Add current category
    breadcrumb.push({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      level: category.level,
    });

    return breadcrumb;
  };

  /**
   * Move category to a new parent
   */
  schema.statics.moveCategory = async function (
    categoryId: string,
    newParentId?: string,
  ) {
    const category = await this.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Check for circular reference
    if (newParentId) {
      const newParent = await this.findById(newParentId);
      if (!newParent) {
        throw new Error("New parent category not found");
      }

      // Check if the new parent is a descendant of the current category
      if (
        newParent.ancestors.includes(category._id) ||
        newParent._id.equals(category._id)
      ) {
        throw new Error("Cannot move category to its own descendant");
      }
    }

    // Update the category's parent
    category.parent = newParentId ? (newParentId as any) : undefined;
    await category.save(); // This will trigger pre-save middleware to update hierarchy

    // Update all descendants - use find and save instead of calling static method
    const descendants = await this.find({
      ancestors: categoryId,
    });

    for (const descendant of descendants) {
      // Force recalculation by triggering save
      descendant.markModified("parent");
      await descendant.save();
    }

    return category;
  };

  /**
   * Update hierarchy for all descendants of a category
   */
  schema.statics.updateDescendantHierarchy = async function (parentId: string) {
    const descendants = await this.find({
      ancestors: parentId,
    });

    for (const descendant of descendants) {
      // Force recalculation by triggering save
      descendant.markModified("parent");
      await descendant.save();
    }
  };
}
