import { Schema } from "mongoose";
import type { IVariation as IVariationBase } from "../../../@types/variation.type";

// Extend IVariation to include inventory property for middleware context
type IVariation = IVariationBase & {
  inventory?: {
    quantity: number;
    reservedQuantity: number;
    availableQuantity?: number;
    lowStockThreshold: number;
    stockStatus?: string;
    trackInventory?: boolean;
  };
  attributes?: {
    color?: {
      code?: string;
      name?: string;
    };
    size?: {
      value?: string;
    };
    [key: string]: any;
  };
};

/**
 * Pre-save middleware for variation model
 * Handles validation, calculations, and data normalization before saving
 */
export function preSaveMiddleware(this: any, next: Function) {
  try {
    // Auto-generate SKU if not provided
    if (!this.sku) {
      this.sku = generateSKU(this);
    }

    // Normalize color codes
    if (this.attributes?.color?.code) {
      this.attributes.color.code = normalizeColorCode(
        this.attributes.color.code,
      );
    }

    // Calculate available quantity for inventory
    if (this.inventory) {
      this.inventory.availableQuantity = Math.max(
        0,
        this.inventory.quantity - this.inventory.reservedQuantity,
      );

      // Update stock status based on quantity
      this.inventory.stockStatus = calculateStockStatus(this.inventory);
    }

    // Set pricing flags
    if (this.pricing) {
      this.pricing.isOnSale = checkIfOnSale(this.pricing);

      // Calculate margin if cost price is available
      if (this.pricing.costPrice) {
        this.pricing.margin = calculateMargin(
          this.pricing.basePrice,
          this.pricing.costPrice,
        );
      }
    }

    // Update analytics last updated timestamp
    if (this.analytics) {
      this.analytics.lastUpdated = new Date();
    }

    // Update SEO last updated timestamp
    if (this.seo) {
      this.seo.lastUpdated = new Date();

      // Auto-generate slug if not provided
      if (!this.seo.metadata?.slug && this.seo.metadata?.title) {
        this.seo.metadata.slug = generateSlug(this.seo.metadata.title);
      }
    }

    // Set timestamps
    if (this.isNew) {
      this.createdAt = new Date();
    }
    this.updatedAt = new Date();

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Pre-update middleware for variation model
 * Handles updates to calculated fields and maintains data integrity
 */
export function preUpdateMiddleware(this: any, next: Function) {
  try {
    const update = this.getUpdate();

    // Update the updatedAt timestamp
    if (update.$set) {
      update.$set.updatedAt = new Date();
    } else {
      this.set({ updatedAt: new Date() });
    }

    // Handle inventory updates
    if (update.$set?.inventory || update.inventory) {
      const inventory = update.$set?.inventory || update.inventory;
      if (inventory) {
        // Recalculate available quantity
        inventory.availableQuantity = Math.max(
          0,
          inventory.quantity - (inventory.reservedQuantity || 0),
        );

        // Update stock status
        inventory.stockStatus = calculateStockStatus(inventory);
      }
    }

    // Handle pricing updates
    if (update.$set?.pricing || update.pricing) {
      const pricing = update.$set?.pricing || update.pricing;
      if (pricing) {
        // Update sale status
        pricing.isOnSale = checkIfOnSale(pricing);

        // Recalculate margin if cost price is available
        if (pricing.costPrice && pricing.basePrice) {
          pricing.margin = calculateMargin(
            pricing.basePrice,
            pricing.costPrice,
          );
        }
      }
    }

    // Handle analytics updates
    if (update.$set?.analytics || update.analytics) {
      const analytics = update.$set?.analytics || update.analytics;
      if (analytics) {
        analytics.lastUpdated = new Date();
      }
    }

    // Handle SEO updates
    if (update.$set?.seo || update.seo) {
      const seo = update.$set?.seo || update.seo;
      if (seo) {
        seo.lastUpdated = new Date();

        // Auto-generate slug if title is updated but slug is not provided
        if (seo.metadata?.title && !seo.metadata?.slug) {
          seo.metadata.slug = generateSlug(seo.metadata.title);
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Post-save middleware for variation model
 * Handles post-save operations like notifications and cache updates
 */
export function postSaveMiddleware(this: IVariation, next: Function) {
  try {
    // Update product's variation count and price range
    updateProductVariationStats(this.productId);

    // Send notifications for low stock
    if (this.inventory && shouldSendLowStockNotification(this.inventory)) {
      sendLowStockNotification(this);
    }

    // Update search index
    updateSearchIndex(this);

    // Clear related caches
    clearVariationCaches(this._id, this.productId);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Post-update middleware for variation model
 * Handles post-update operations
 */
export function postUpdateMiddleware(this: any, result: any, next: Function) {
  try {
    // Update search index if relevant fields were modified
    const modifiedPaths = this.getChangedPaths ? this.getChangedPaths() : [];
    const searchRelevantFields = [
      "sku",
      "attributes",
      "seo.metadata",
      "pricing.basePrice",
    ];

    if (
      modifiedPaths.some((path: string) =>
        searchRelevantFields.some((field) => path.includes(field)),
      )
    ) {
      // We need to fetch the updated document to update search index
      this.model.findById(this.getQuery()._id).then((doc: IVariation) => {
        if (doc) {
          updateSearchIndex(doc);
        }
      });
    }

    // Clear caches
    const query = this.getQuery();
    if (query._id) {
      clearVariationCaches(query._id);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Pre-remove middleware for variation model
 * Handles cleanup before deletion
 */
export function preRemoveMiddleware(this: IVariation, next: Function) {
  try {
    // Check if this is the last variation of a product
    checkLastVariationRemoval(this.productId, this._id);

    // Update related orders to handle removed variations
    handleOrdersWithRemovedVariation(this._id);

    // Remove from search index
    removeFromSearchIndex(this._id);

    // Clear all related caches
    clearVariationCaches(this._id, this.productId);

    next();
  } catch (error) {
    next(error);
  }
}

// Helper functions

function generateSKU(variation: IVariation): string {
  const productId = variation.productId.toString().slice(-6);
  const colorCode =
    variation.attributes?.color?.name?.substring(0, 2).toUpperCase() || "XX";
  const sizeCode =
    variation.attributes?.size?.value?.substring(0, 2).toUpperCase() || "XX";
  const timestamp = Date.now().toString().slice(-4);

  return `${productId}-${colorCode}${sizeCode}-${timestamp}`;
}

function normalizeColorCode(code: string): string {
  // Ensure color code is in proper hex format
  if (code.startsWith("#")) {
    return code.toUpperCase();
  } else if (/^[0-9A-Fa-f]{6}$/.test(code)) {
    return `#${code.toUpperCase()}`;
  }
  return code; // Return as-is if not a standard hex format
}

function calculateStockStatus(
  inventory: any,
): "in_stock" | "low_stock" | "out_of_stock" | "discontinued" {
  if (inventory.quantity <= 0) {
    return "out_of_stock";
  } else if (inventory.quantity <= inventory.lowStockThreshold) {
    return "low_stock";
  } else {
    return "in_stock";
  }
}

function checkIfOnSale(pricing: any): boolean {
  if (!pricing.salePrice) return false;

  if (pricing.saleStartDate && pricing.saleEndDate) {
    const now = new Date();
    return now >= pricing.saleStartDate && now <= pricing.saleEndDate;
  }

  return pricing.salePrice < pricing.basePrice;
}

function calculateMargin(basePrice: number, costPrice: number): number {
  if (costPrice <= 0) return 0;
  return ((basePrice - costPrice) / basePrice) * 100;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Async helper functions (these would typically integrate with your app's services)

async function updateProductVariationStats(productId: any) {
  // Update product's variation count, price range, etc.
  // Implementation depends on your product model structure
  console.log(`Updating product ${productId} variation stats`);
}

function shouldSendLowStockNotification(inventory: any): boolean {
  return (
    inventory.quantity <= inventory.lowStockThreshold &&
    inventory.trackInventory
  );
}

async function sendLowStockNotification(variation: IVariation) {
  // Send notification to admin/staff about low stock
  console.log(`Low stock notification for variation ${variation.sku}`);
}

async function updateSearchIndex(variation: IVariation) {
  // Update search index (Elasticsearch, Algolia, etc.)
  console.log(`Updating search index for variation ${variation.sku}`);
}

async function clearVariationCaches(variationId: any, productId?: any) {
  // Clear Redis/memory caches
  console.log(`Clearing caches for variation ${variationId}`);
}

async function removeFromSearchIndex(variationId: any) {
  // Remove from search index
  console.log(`Removing variation ${variationId} from search index`);
}

async function checkLastVariationRemoval(productId: any, variationId: any) {
  // Check if this is the last variation and handle accordingly
  console.log(`Checking last variation removal for product ${productId}`);
}

async function handleOrdersWithRemovedVariation(variationId: any) {
  // Handle existing orders that reference this variation
  console.log(`Handling orders with removed variation ${variationId}`);
}
