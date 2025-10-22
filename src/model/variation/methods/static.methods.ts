/**
 * Static methods for variation model
 * These methods are available on the model itself (e.g., Variation.findBySku())
 */

/**
 * Find variation by SKU
 */
export function findBySku(this: any, sku: string) {
  return this.findOne({ sku, isDeleted: { $ne: true } });
}

/**
 * Find variations by product ID
 */
export function findByProduct(
  this: any,
  productId: string,
  options: {
    includeDeleted?: boolean;
    sortBy?: "price" | "popularity" | "stock" | "name";
    sortOrder?: "asc" | "desc";
  } = {},
) {
  const {
    includeDeleted = false,
    sortBy = "price",
    sortOrder = "asc",
  } = options;

  const query: any = { productId };

  if (!includeDeleted) {
    query.isDeleted = { $ne: true };
  }

  let sortQuery: any = {};

  switch (sortBy) {
    case "price":
      sortQuery = {
        "pricing.basePrice": sortOrder === "asc" ? 1 : -1,
        price: sortOrder === "asc" ? 1 : -1,
      };
      break;
    case "popularity":
      sortQuery = {
        "analytics.performance.popularityScore": sortOrder === "asc" ? 1 : -1,
      };
      break;
    case "stock":
      sortQuery = {
        "inventory.quantity": sortOrder === "asc" ? 1 : -1,
        quantity: sortOrder === "asc" ? 1 : -1,
      };
      break;
    case "name":
      sortQuery = {
        "attributes.color.name": sortOrder === "asc" ? 1 : -1,
        color: sortOrder === "asc" ? 1 : -1,
      };
      break;
    default:
      sortQuery = { createdAt: -1 };
  }

  return this.find(query).sort(sortQuery);
}

/**
 * Search variations with advanced filters
 */
export function searchVariations(
  this: any,
  criteria: {
    searchTerm?: string;
    priceRange?: { min?: number; max?: number };
    colors?: string[];
    sizes?: string[];
    inStockOnly?: boolean;
    onSaleOnly?: boolean;
    categories?: string[];
    attributes?: Record<string, any>;
    sortBy?: "price" | "popularity" | "relevance" | "newest";
    sortOrder?: "asc" | "desc";
    limit?: number;
    skip?: number;
  },
) {
  const {
    searchTerm,
    priceRange,
    colors,
    sizes,
    inStockOnly = false,
    onSaleOnly = false,
    attributes = {},
    sortBy = "relevance",
    sortOrder = "desc",
    limit = 50,
    skip = 0,
  } = criteria;

  const query: any = { isDeleted: { $ne: true } };

  // Text search
  if (searchTerm) {
    query.$or = [
      { sku: new RegExp(searchTerm, "i") },
      { "attributes.color.name": new RegExp(searchTerm, "i") },
      { "attributes.size.value": new RegExp(searchTerm, "i") },
      { "seo.metadata.keywords": { $in: [new RegExp(searchTerm, "i")] } },
      {
        "seo.searchOptimization.searchKeywords": {
          $in: [new RegExp(searchTerm, "i")],
        },
      },
      // Legacy support
      { color: new RegExp(searchTerm, "i") },
      { size: new RegExp(searchTerm, "i") },
      { storage: new RegExp(searchTerm, "i") },
    ];
  }

  // Price range filter
  if (priceRange) {
    if (priceRange.min !== undefined || priceRange.max !== undefined) {
      const priceQuery: any = {};
      if (priceRange.min !== undefined) priceQuery.$gte = priceRange.min;
      if (priceRange.max !== undefined) priceQuery.$lte = priceRange.max;

      query.$or = query.$or || [];
      query.$or.push(
        { "pricing.basePrice": priceQuery },
        { price: priceQuery }, // Legacy support
      );
    }
  }

  // Color filter
  if (colors && colors.length > 0) {
    query.$or = query.$or || [];
    query.$or.push(
      { "attributes.color.name": { $in: colors } },
      { color: { $in: colors } }, // Legacy support
    );
  }

  // Size filter
  if (sizes && sizes.length > 0) {
    query.$or = query.$or || [];
    query.$or.push(
      { "attributes.size.value": { $in: sizes } },
      { size: { $in: sizes } }, // Legacy support
    );
  }

  // Stock filter
  if (inStockOnly) {
    query.$or = query.$or || [];
    query.$or.push(
      { "inventory.quantity": { $gt: 0 } },
      { quantity: { $gt: 0 } }, // Legacy support
    );
  }

  // Sale filter
  if (onSaleOnly) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { "pricing.isOnSale": true },
        {
          $and: [
            { "pricing.salePrice": { $exists: true } },
            { $expr: { $lt: ["$pricing.salePrice", "$pricing.basePrice"] } },
          ],
        },
      ],
    });
  }

  // Custom attributes filter
  Object.keys(attributes).forEach((key) => {
    if (attributes[key] !== undefined) {
      query[`attributes.${key}`] = attributes[key];
    }
  });

  // Sorting
  let sortQuery: any = {};
  switch (sortBy) {
    case "price":
      sortQuery = {
        "pricing.basePrice": sortOrder === "asc" ? 1 : -1,
        price: sortOrder === "asc" ? 1 : -1,
      };
      break;
    case "popularity":
      sortQuery = {
        "analytics.performance.popularityScore": sortOrder === "asc" ? 1 : -1,
      };
      break;
    case "newest":
      sortQuery = { createdAt: sortOrder === "asc" ? 1 : -1 };
      break;
    case "relevance":
    default:
      sortQuery = {
        "analytics.performance.popularityScore": -1,
        createdAt: -1,
      };
  }

  return this.find(query).sort(sortQuery).limit(limit).skip(skip);
}

/**
 * Get variations with low stock
 */
export function getLowStockVariations(this: any, threshold?: number) {
  const stockThreshold = threshold || 10;

  return this.find({
    isDeleted: { $ne: true },
    $or: [
      { "inventory.quantity": { $lte: stockThreshold } },
      { quantity: { $lte: stockThreshold } }, // Legacy support
    ],
  }).populate("productId", "name");
}

/**
 * Get variations that need reordering
 */
export function getReorderVariations(this: any) {
  return this.find({
    isDeleted: { $ne: true },
    $or: [
      { "inventory.needsReorder": true },
      { $expr: { $lte: ["$inventory.quantity", "$inventory.reorderPoint"] } },
      { $expr: { $lte: ["$quantity", 10] } }, // Legacy fallback
    ],
  }).populate("productId", "name");
}

/**
 * Get top selling variations
 */
export function getTopSelling(
  this: any,
  limit: number = 10,
  period?: "daily" | "weekly" | "monthly",
) {
  const matchStage: any = { isDeleted: { $ne: true } };

  // Add date filter if period is specified
  if (period) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "daily":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    matchStage["analytics.sales.lastSaleDate"] = { $gte: startDate };
  }

  return this.find(matchStage)
    .sort({ "analytics.sales.totalSold": -1 })
    .limit(limit)
    .populate("productId", "name");
}

/**
 * Get variations by color
 */
export function getByColor(this: any, color: string) {
  return this.find({
    isDeleted: { $ne: true },
    $or: [
      { "attributes.color.name": new RegExp(color, "i") },
      { color: new RegExp(color, "i") }, // Legacy support
    ],
  });
}

/**
 * Get variations by size
 */
export function getBySize(this: any, size: string) {
  return this.find({
    isDeleted: { $ne: true },
    $or: [
      { "attributes.size.value": size },
      { size: size }, // Legacy support
    ],
  });
}

/**
 * Get variations on sale
 */
export function getOnSale(this: any) {
  const now = new Date();

  return this.find({
    isDeleted: { $ne: true },
    $or: [
      { "pricing.isOnSale": true },
      {
        $and: [
          { "pricing.salePrice": { $exists: true } },
          { $expr: { $lt: ["$pricing.salePrice", "$pricing.basePrice"] } },
          {
            $or: [
              {
                $and: [
                  { "pricing.saleStartDate": { $lte: now } },
                  { "pricing.saleEndDate": { $gte: now } },
                ],
              },
              {
                $and: [
                  { "pricing.saleStartDate": { $exists: false } },
                  { "pricing.saleEndDate": { $exists: false } },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
}

/**
 * Get price range for variations of a product
 */
export function getPriceRange(this: any, productId: string) {
  return this.aggregate([
    {
      $match: {
        productId: productId,
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        minPrice: {
          $min: {
            $ifNull: ["$pricing.basePrice", "$price"], // Use pricing.basePrice or fallback to legacy price
          },
        },
        maxPrice: {
          $max: {
            $ifNull: ["$pricing.basePrice", "$price"],
          },
        },
        minSalePrice: {
          $min: "$pricing.salePrice",
        },
        maxSalePrice: {
          $max: "$pricing.salePrice",
        },
      },
    },
  ]);
}

/**
 * Get available colors for a product
 */
export function getAvailableColors(this: any, productId: string) {
  return this.aggregate([
    {
      $match: {
        productId: productId,
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: {
          name: { $ifNull: ["$attributes.color.name", "$color"] },
          code: "$attributes.color.code",
          family: "$attributes.color.family",
        },
        count: { $sum: 1 },
        inStock: {
          $sum: {
            $cond: [
              { $gt: [{ $ifNull: ["$inventory.quantity", "$quantity"] }, 0] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        name: "$_id.name",
        code: "$_id.code",
        family: "$_id.family",
        count: 1,
        inStock: 1,
        available: { $gt: ["$inStock", 0] },
      },
    },
    {
      $sort: { name: 1 },
    },
  ]);
}

/**
 * Get available sizes for a product
 */
export function getAvailableSizes(this: any, productId: string) {
  return this.aggregate([
    {
      $match: {
        productId: productId,
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: {
          value: { $ifNull: ["$attributes.size.value", "$size"] },
          type: "$attributes.size.type",
        },
        count: { $sum: 1 },
        inStock: {
          $sum: {
            $cond: [
              { $gt: [{ $ifNull: ["$inventory.quantity", "$quantity"] }, 0] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        value: "$_id.value",
        type: "$_id.type",
        count: 1,
        inStock: 1,
        available: { $gt: ["$inStock", 0] },
      },
    },
    {
      $sort: { value: 1 },
    },
  ]);
}

/**
 * Bulk update pricing for multiple variations
 */
export function bulkUpdatePricing(
  this: any,
  updates: Array<{
    id: string;
    basePrice?: number;
    salePrice?: number;
    isOnSale?: boolean;
  }>,
) {
  const bulkOps = updates.map((update) => ({
    updateOne: {
      filter: { _id: update.id },
      update: {
        $set: {
          ...(update.basePrice !== undefined && {
            "pricing.basePrice": update.basePrice,
          }),
          ...(update.salePrice !== undefined && {
            "pricing.salePrice": update.salePrice,
          }),
          ...(update.isOnSale !== undefined && {
            "pricing.isOnSale": update.isOnSale,
          }),
          updatedAt: new Date(),
        },
      },
    },
  }));

  return this.bulkWrite(bulkOps);
}

/**
 * Bulk update inventory for multiple variations
 */
export function bulkUpdateInventory(
  this: any,
  updates: Array<{
    id: string;
    quantity?: number;
    reorderPoint?: number;
  }>,
) {
  const bulkOps = updates.map((update) => ({
    updateOne: {
      filter: { _id: update.id },
      update: {
        $set: {
          ...(update.quantity !== undefined && {
            "inventory.quantity": update.quantity,
          }),
          ...(update.reorderPoint !== undefined && {
            "inventory.reorderPoint": update.reorderPoint,
          }),
          updatedAt: new Date(),
        },
      },
    },
  }));

  return this.bulkWrite(bulkOps);
}

// Export all static methods
export const staticMethods = {
  findBySku,
  findByProduct,
  searchVariations,
  getLowStockVariations,
  getReorderVariations,
  getTopSelling,
  getByColor,
  getBySize,
  getOnSale,
  getPriceRange,
  getAvailableColors,
  getAvailableSizes,
  bulkUpdatePricing,
  bulkUpdateInventory,
};
