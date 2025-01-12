import { ICategory } from "../../@types/category.type";
import Category from "../../model/category.model";
import { redis } from "../../server";
import ErrorHandler from "../../utils/ErrorHandler";

export const addCategoryService = async (payload: any) => {
  // Validate the payload here if necessary
  const category = new Category(payload);

  const data = await category.save();

  clearCategoryCache();

  // Cache the newly created category in Redis
  await redis.set(
    `category:${data.slug}`,
    JSON.stringify(data),
    "EX",
    24 * 60 * 60, // Cache for 24 hours
  );

  return data;
};

export const getCategoryService = async (
  slug: string,
  populate: string,
  select: string,
) => {
  const category = await redis.get(`category:${slug}`);
  if (category) {
    return JSON.parse(category);
  } else {
    const category = await Category.findActiveOne({ _id: slug })
      .populate(populate)
      .select(select)
      .lean()
      .exec();
    return category;
  }
};

export const getAllCategoriesService = async (
  filter: any = { isDeleted: false },
  sort: any = { order: 1 },
  populate?: any,
  select?: any,
  limit?: number,
  page?: number,
) => {
  if (page && limit) {
    const categories = await Category.find({ ...filter })
      .sort(sort)
      .populate(populate)
      .select(select)
      .limit(limit)
      .skip(limit * (page - 1))
      .lean()
      .exec();

    let total = await Category.countDocuments(filter);
    return { categories, total, itemsPerPage: limit, page };
  } else if (limit) {
    const categories = await Category.find({ ...filter })
      .sort(sort)
      .populate(populate)
      .select(select)
      .limit(limit)
      .lean()
      .exec();

    let total = await Category.countDocuments(filter);
    return { categories, total, itemsPerPage: limit };
  } else {
    const categories = await Category.find({ ...filter })
      .sort(sort)
      .populate(populate)
      .select(select)
      .lean()
      .exec();

    let total = await Category.countDocuments(filter);
    return { categories, total };
  }
};

export const updateCategoryService = async (filter: any, update: any) => {
  const category = await Category.findOneAndUpdate(
    { ...filter },
    { ...update },
    { new: true },
  );
  let data = category?.toObject();

  clearCategoryCache();

  if (data?._id)
    await redis.set(
      `category:${data.slug}`,
      JSON.stringify(data),
      "EX",
      24 * 60 * 60,
    );

  return data;
};

export const softDeleteCategoryService = async (id: string) => {
  const category = await Category.findById(id);

  if (!category) return new ErrorHandler(404, "Category not found");

  await category.softDelete();

  clearCategoryCache();

  return category;
};

export const restoreCategoryService = async (id: string) => {
  const category = await Category.findById(id);

  if (!category) return new ErrorHandler(404, "Category not found");

  await category.restore();

  clearCategoryCache();

  redis.set(
    `category:${category?.slug}`,
    JSON.stringify(category),
    "EX",
    24 * 60 * 60,
  );

  return category;
};

export const deleteCategoryService = async (id: string) => {
  const category = await Category.findOneAndDelete({ _id: id });

  clearCategoryCache();

  return category;
};

// Function to recursively fetch subcategories
export const getSubcategories = async (parentId: string): Promise<any[]> => {
  const subcategories = await Category.findActiveCategories({
    parent: parentId,
  })
    .populate("ancestors")
    .sort({ order: 1 })
    .lean();
  const result = [];

  for (const subcategory of subcategories) {
    const nestedSubcategories = await getSubcategories(
      (subcategory._id as string).toString(),
    ); // Recursively fetch subcategories
    result.push({
      ...subcategory,
      subcategories: nestedSubcategories, // Add nested subcategories
    });
  }

  return result;
};

// Main function to fetch category with its subcategories
export const getCategoryWithNestedSubcategoriesService = async (
  slug: string,
) => {
  // Check Redis cache first
  const cacheKey = `category:${slug}:subcategories`;
  const cachedData = await redis.get(cacheKey);

  // Parse and return cached data if found
  if (cachedData) return JSON.parse(cachedData);

  // If data not found in Redis, fetch from the database
  const parentCategory = await Category.findActiveOne({ slug })
    .populate("ancestors")
    .sort({ order: 1 })
    .lean();

  if (!parentCategory) return null;

  // Fetch all subcategories recursively
  const subcategories = await getSubcategories(
    (parentCategory._id as string)?.toString(),
  );

  // Combine the parent category with its subcategories
  const categoryWithSubcategories = {
    ...parentCategory,
    subcategories, // Add all subcategories to the parent category
  };

  // Cache the result in Redis with an expiration time (e.g., 24 hours)
  await redis.set(
    cacheKey,
    JSON.stringify(categoryWithSubcategories),
    "EX",
    24 * 60 * 60,
  );

  return categoryWithSubcategories;
};

/**
 * Get all parent categories from DB, with Redis caching
 * @returns {Promise<ICategory[]>} - Array of parent categories
 */
export const getAllParentCategories = async (): Promise<ICategory[]> => {
  return new Promise((resolve, reject) => {
    try {
      // Try to get data from Redis cache
      redis.get("category:parentCategories", async (err, cachedData) => {
        if (err) return reject(err);

        if (cachedData) {
          // Data exists in cache, parse and return it
          console.log("Fetching data from Redis cache");
          return resolve(JSON.parse(cachedData));
        } else {
          // Data doesn't exist in cache, query the database
          const parentCategories = await Category.findActiveCategories({
            parent: null,
            isDeleted: false,
          }).select("-ancestors -isDeleted -__v");

          // If no parent categories found, resolve with an empty array
          if (!parentCategories || parentCategories.length === 0) {
            return resolve([]);
          }

          // Cache the data in Redis with a timeout of 1 day
          redis.setex(
            "category:parentCategories",
            24 * 60 * 60, // Cache for 1 day
            JSON.stringify(parentCategories), // Store the data in Redis as a string
          );

          // Return the parent categories fetched from DB
          return resolve(parentCategories);
        }
      });
    } catch (error) {
      // Handle any errors and reject the promise
      console.error("Error in fetching parent categories:", error);
      return reject(error);
    }
  });
};

/**
 * Invalidate Redis Cache for Parent Categories
 * This can be called when a category is created, updated, or deleted
 */
export const invalidateParentCategoryCache = async () => {
  try {
    redis.del("category:parentCategories", (err, reply) => {
      if (err) console.error("Error invalidating Redis cache:", err);
      else console.log("Redis cache invalidated:", reply);
    });
  } catch (error) {
    console.error("Error invalidating parent category cache:", error);
  }
};

// Function to build a nested category structure
export const getAllCategoriesNested = async () => {
  return new Promise((resolve, reject) => {
    redis.get("category:allCategoriesNested", async (err, cachedData) => {
      if (err) return reject(err);
      if (cachedData) return resolve(JSON.parse(cachedData));

      try {
        const categories = (await Category.findActiveCategories({})
          .populate("ancestors")
          .sort({ order: 1 })
          .lean()) as ICategory[];

        // Organize categories in nested format
        const nestedCategories = buildCategoryTree(categories);

        // Cache the result for 1 hour
        if (nestedCategories.length)
          redis.setex(
            "category:allCategoriesNested",
            3600,
            JSON.stringify(nestedCategories),
          );

        resolve(nestedCategories);
      } catch (error) {
        console.error("Error fetching categories: ", error);
        reject(error);
      }
    });
  });
};

// Helper function to build a nested category tree
interface ICategoryWithChildren extends ICategory {
  children?: ICategoryWithChildren[];
}

const buildCategoryTree = (
  categories: ICategory[],
  parentId: string | null = null,
): ICategoryWithChildren[] => {
  const categoryTree: ICategoryWithChildren[] = [];

  categories.forEach((category) => {
    console.log("category: ", category);

    // If the current category's parent matches the parentId
    if (String(category.parent) === String(parentId)) {
      // Recursively get children categories
      const children = buildCategoryTree(categories, category._id.toString());

      // Create a new category object with children
      const categoryWithChildren: ICategoryWithChildren | any = {
        ...category, // Spread the existing category properties
        children: children.length ? children : undefined, // Assign children if they exist
      };

      categoryTree.push(categoryWithChildren);
    }
  });

  return categoryTree;
};

// Function to get category by slug and its nested subcategories
export const CategoryBySlug = async (slug: string) => {
  return new Promise((resolve, reject) => {
    // Use Redis cache to check for the category by slug
    redis.get(`category:${slug}`, async (err, cachedData) => {
      if (err) return reject(err);

      if (cachedData) return resolve(JSON.parse(cachedData));

      try {
        // Find the category with the matching slug
        const category = await Category.findActiveOne({ slug })
          .populate("ancestors")
          .lean();

        if (!category)
          return reject(new ErrorHandler(404, "Category not found"));

        // Find subcategories where the parent matches the category's ID
        const subcategories = await Category.findActiveCategories({
          parent: category._id,
        })
          .populate("ancestors")
          .lean();

        // Attach subcategories to the category object
        const categoryWithSubcategories = {
          ...category,
          children: subcategories,
        };

        // Cache the result for 1 day
        redis.setex(
          `category:${slug}`,
          24 * 60 * 60, // Cache for 1 day
          JSON.stringify(categoryWithSubcategories),
        );

        resolve(categoryWithSubcategories);
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Recursive function to fetch subcategories up to a certain level
const fetchSubcategoriesByLevel = async (
  parentId: string,
  level: number,
): Promise<any[]> => {
  if (level <= 0) return []; // Base case: If level is 0, return no subcategories

  // Find all subcategories where parent matches the given parentId
  const subcategories = await Category.findActiveCategories({
    parent: parentId,
  })
    .populate("ancestors")
    .lean();

  // Recursively fetch each subcategory's children if level > 1
  const result = await Promise.all(
    subcategories.map(async (subCategory) => {
      const children = await fetchSubcategoriesByLevel(
        (subCategory._id as string)?.toString(),
        level - 1,
      );
      return { ...subCategory, children }; // Append children to each subcategory
    }),
  );

  return result;
};

// Service to get subcategories by slug and level
export const subcategoriesBySlugAndLevel = async (
  slug: string,
  level: number,
) => {
  return new Promise((resolve, reject) => {
    // Use Redis cache to check for subcategories by slug and level
    redis.get(
      `category:subcategories_${slug}_level_${level}`,
      async (err, cachedData) => {
        if (err) return reject(err);

        if (cachedData) return resolve(JSON.parse(cachedData));

        try {
          // Find the parent category by slug
          const parentCategory = await Category.findActiveOne({
            slug,
          })
            .populate("ancestors")
            .lean();

          if (!parentCategory) {
            return reject(new ErrorHandler(404, "Parent category not found"));
          }

          // Fetch subcategories recursively by level
          const subcategories = await fetchSubcategoriesByLevel(
            (parentCategory._id as string)?.toString(),
            level,
          );

          // Combine the parent category with its nested subcategories
          const categoryWithSubcategories = {
            ...parentCategory,
            children: subcategories,
          };

          // Cache the result for 1 day
          redis.setex(
            `category:subcategories_${slug}_level_${level}`,
            24 * 60 * 60, // Cache for 1 day
            JSON.stringify(categoryWithSubcategories),
          );

          resolve(categoryWithSubcategories);
        } catch (error) {
          reject(error);
        }
      },
    );
  });
};

// Recursive function to fetch subcategories up to a certain level for all categories
const fetchCategoriesByLevel = async (
  parentId: string | null,
  level: number,
): Promise<any[]> => {
  if (level <= 0) return []; // Base case: If level is 0, return no categories

  const filter = parentId ? { parent: parentId } : { parent: null };

  // Find all categories that match the given parentId (or root categories if parentId is null)
  const categories = await Category.findActiveCategories(filter)
    .populate("ancestors")
    .lean();

  // Recursively fetch each category's children if level > 1
  const result = await Promise.all(
    categories.map(async (category) => {
      const children = await fetchCategoriesByLevel(
        (category._id as string)?.toString(),
        level - 1,
      );
      return { ...category, children }; // Append children to each category
    }),
  );

  return result;
};

// Service to get all categories up to a certain level
export const allCategoriesByLevel = async (level: number) => {
  return new Promise((resolve, reject) => {
    // Use Redis cache to check if data for this level is cached
    redis.get(`category:categories_level_${level}`, async (err, cachedData) => {
      if (err) return reject(err);

      if (cachedData) {
        return resolve(JSON.parse(cachedData));
      }

      try {
        // Fetch all categories starting from root (parent: null) and recursively up to the given level
        const categories = await fetchCategoriesByLevel(null, level);

        // Cache the result for 1 hour
        redis.setex(
          `category:categories_level_${level}`,
          3600,
          JSON.stringify(categories),
        );

        resolve(categories);
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Service to search categories by name or other fields
export const searchCategoriesByName = async (searchTerm: string) => {
  return new Promise((resolve, reject) => {
    // Use Redis cache to check if data for this search term is cached
    redis.get(
      `category:categories_search_${searchTerm}`,
      async (err, cachedData) => {
        if (err) return reject(err);

        if (cachedData) {
          return resolve(JSON.parse(cachedData));
        }

        try {
          // Using a regular expression to search for partial matches in name, description, or metadata
          const regex = new RegExp(searchTerm, "i"); // Case insensitive
          const categories = await Category.findActiveCategories({
            $or: [
              { name: { $regex: regex } },
              { description: { $regex: regex } },
              { "metadata.title": { $regex: regex } },
              { "metadata.keywords": { $regex: regex } },
            ],
          })
            .populate("ancestors")
            .lean();

          // Cache the result for 1 hour
          redis.setex(
            `category:categories_search_${searchTerm}`,
            3600,
            JSON.stringify(categories),
          );

          resolve(categories);
        } catch (error) {
          reject(error);
        }
      },
    );
  });
};

export const clearCategoryCache = async () => {
  redis.keys("category:*", (err, keys) => {
    if (err) console.error(err);
    if (keys) keys.forEach((key) => redis.del(key));
  });
};
