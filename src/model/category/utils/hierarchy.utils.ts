import mongoose from "mongoose";
import { convertToSlug } from "../../../utils/logic";

/**
 * Utility function to generate slug, path, and hierarchy data
 */
export const generateSlugAndPath = async (
  name: string,
  parentId: string | null,
): Promise<{
  slug: string;
  path: string;
  materializedPath: string;
  ancestors: string[];
  level: number;
}> => {
  let path = name;
  let slug = convertToSlug(name);
  let materializedPath = "";
  let ancestors: string[] = [];
  let level = 0;

  if (parentId) {
    try {
      // Use mongoose.model to avoid circular dependency
      const CategoryModel = mongoose.model("Category");

      const parentCategory = await CategoryModel.findById(parentId).exec();
      if (parentCategory) {
        ancestors = [
          ...parentCategory.ancestors.map((id: any) => id.toString()),
          parentCategory._id.toString(),
        ];
        path = `${parentCategory.path} > ${name}`;
        level = parentCategory.level + 1;
        materializedPath = `${parentCategory.materializedPath}${parentCategory._id}/`;

        // Ensure unique slug by including parent context
        const baseSlug = convertToSlug(name);
        const existingSlug = await CategoryModel.findOne({
          slug: baseSlug,
          _id: { $ne: parentId },
        });

        if (existingSlug) {
          slug = `${convertToSlug(parentCategory.name)}-${baseSlug}`;
        } else {
          slug = baseSlug;
        }
      }
    } catch (error) {
      // Fallback if model not registered yet
      materializedPath = "/";
      slug = convertToSlug(name);
    }
  } else {
    materializedPath = "/";
    slug = convertToSlug(name);
  }

  return { slug, path, materializedPath, ancestors, level };
};
