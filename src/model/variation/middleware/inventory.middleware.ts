import type { IEnhancedVariation } from "../../../@types/variation.type";

/**
 * Pre-save middleware for inventory management
 * Validates and calculates inventory-related fields before saving
 */
export async function inventoryPreSaveMiddleware(
  this: IEnhancedVariation,
  next: Function,
) {
  try {
    // Initialize inventory if not present
    if (!this.inventory) {
      this.inventory = {
        quantity: this.quantity || 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        reorderPoint: 10,
        trackInventory: true,
        allowBackorders: false,
        lowStockThreshold: 5,
        stockStatus: "in_stock",
        stockMovements: [],
      };
    }

    // Sync legacy quantity with inventory
    if (this.quantity !== undefined && this.inventory) {
      this.inventory.quantity = this.quantity;
    } else if (this.inventory?.quantity !== undefined) {
      this.quantity = this.inventory.quantity;
    }

    // Calculate available quantity
    if (this.inventory) {
      this.inventory.availableQuantity = Math.max(
        0,
        this.inventory.quantity - (this.inventory.reservedQuantity || 0),
      );

      // Update stock status based on quantity
      if (this.inventory.quantity <= 0) {
        this.inventory.stockStatus = "out_of_stock";
      } else if (this.inventory.quantity <= this.inventory.lowStockThreshold) {
        this.inventory.stockStatus = "low_stock";
      } else {
        this.inventory.stockStatus = "in_stock";
      }

      // Validate reorder point
      if (this.inventory.reorderPoint < 0) {
        this.inventory.reorderPoint = 0;
      }

      // Validate reserved quantity
      if (this.inventory.reservedQuantity < 0) {
        this.inventory.reservedQuantity = 0;
      }

      // Ensure reserved quantity doesn't exceed total quantity
      if (this.inventory.reservedQuantity > this.inventory.quantity) {
        this.inventory.reservedQuantity = this.inventory.quantity;
      }

      // Update last updated timestamp
      // Note: lastUpdated is not in the interface, remove this line
      // this.inventory.lastUpdated = new Date();
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Pre-update middleware for inventory management
 * Handles inventory updates during document updates
 */
export async function inventoryPreUpdateMiddleware(this: any, next: Function) {
  try {
    const update = this.getUpdate();

    if (update) {
      // If updating quantity, sync with inventory
      if (update.quantity !== undefined && update.inventory) {
        update.inventory.quantity = update.quantity;
      } else if (update.inventory?.quantity !== undefined) {
        update.quantity = update.inventory.quantity;
      }

      // If inventory is being updated, recalculate available quantity
      if (update.inventory) {
        update.inventory.availableQuantity = Math.max(
          0,
          (update.inventory.quantity || 0) -
            (update.inventory.reservedQuantity || 0),
        );

        // Update stock status
        if (update.inventory.quantity <= 0) {
          update.inventory.stockStatus = "out_of_stock";
        } else if (
          update.inventory.quantity <= (update.inventory.lowStockThreshold || 5)
        ) {
          update.inventory.stockStatus = "low_stock";
        } else {
          update.inventory.stockStatus = "in_stock";
        }

        // Update timestamp - removed since lastUpdated not in interface
        // update.inventory.lastUpdated = new Date();
      }

      // Set the modified update
      this.setUpdate(update);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Post-save middleware for inventory management
 * Handles post-save inventory operations like logging stock movements
 */
export async function inventoryPostSaveMiddleware(
  this: IEnhancedVariation,
  next: Function,
) {
  try {
    // Log stock movement if this is a new document or quantity changed
    if (
      this.isNew ||
      this.isModified("inventory.quantity") ||
      this.isModified("quantity")
    ) {
      if (this.inventory && this.inventory.trackInventory) {
        const movement = {
          type: this.isNew ? ("in" as const) : ("adjustment" as const),
          quantity: this.inventory.quantity,
          reason: this.isNew ? "Initial stock" : "Stock adjustment",
          date: new Date(),
          reference: this._id.toString(),
        };

        // Add to stock movements (limit to last 100 movements)
        if (!this.inventory.stockMovements) {
          this.inventory.stockMovements = [];
        }

        this.inventory.stockMovements.unshift(movement);

        // Keep only last 100 movements
        if (this.inventory.stockMovements.length > 100) {
          this.inventory.stockMovements = this.inventory.stockMovements.slice(
            0,
            100,
          );
        }

        // Save the updated stock movements without triggering middleware again
        await this.updateOne(
          {
            $set: { "inventory.stockMovements": this.inventory.stockMovements },
          },
          { timestamps: false },
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Helper function to reserve inventory
 */
export async function reserveInventory(
  model: any,
  variationId: string,
  quantity: number,
  reason: string = "Order reservation",
): Promise<boolean> {
  try {
    const result = await model.updateOne(
      {
        _id: variationId,
        "inventory.availableQuantity": { $gte: quantity },
        isDeleted: false,
      },
      {
        $inc: { "inventory.reservedQuantity": quantity },
        $push: {
          "inventory.stockMovements": {
            $each: [
              {
                type: "reserved",
                quantity: quantity,
                reason: reason,
                date: new Date(),
                reference: `reservation_${Date.now()}`,
              },
            ],
            $position: 0,
            $slice: 100,
          },
        },
      },
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error reserving inventory:", error);
    return false;
  }
}

/**
 * Helper function to release reserved inventory
 */
export async function releaseReservedInventory(
  model: any,
  variationId: string,
  quantity: number,
  reason: string = "Order cancellation",
): Promise<boolean> {
  try {
    const result = await model.updateOne(
      {
        _id: variationId,
        "inventory.reservedQuantity": { $gte: quantity },
        isDeleted: false,
      },
      {
        $inc: { "inventory.reservedQuantity": -quantity },
        $push: {
          "inventory.stockMovements": {
            $each: [
              {
                type: "unreserved",
                quantity: quantity,
                reason: reason,
                date: new Date(),
                reference: `release_${Date.now()}`,
              },
            ],
            $position: 0,
            $slice: 100,
          },
        },
      },
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error releasing reserved inventory:", error);
    return false;
  }
}

/**
 * Helper function to reduce inventory (for completed orders)
 */
export async function reduceInventory(
  model: any,
  variationId: string,
  quantity: number,
  reason: string = "Order fulfillment",
): Promise<boolean> {
  try {
    const result = await model.updateOne(
      {
        _id: variationId,
        "inventory.quantity": { $gte: quantity },
        isDeleted: false,
      },
      {
        $inc: {
          "inventory.quantity": -quantity,
          "inventory.reservedQuantity": -quantity,
        },
        $push: {
          "inventory.stockMovements": {
            $each: [
              {
                type: "out",
                quantity: quantity,
                reason: reason,
                date: new Date(),
                reference: `fulfillment_${Date.now()}`,
              },
            ],
            $position: 0,
            $slice: 100,
          },
        },
      },
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error reducing inventory:", error);
    return false;
  }
}

/**
 * Helper function to restock inventory
 */
export async function restockInventory(
  model: any,
  variationId: string,
  quantity: number,
  reason: string = "Restock",
): Promise<boolean> {
  try {
    const result = await model.updateOne(
      {
        _id: variationId,
        isDeleted: false,
      },
      {
        $inc: { "inventory.quantity": quantity },
        $push: {
          "inventory.stockMovements": {
            $each: [
              {
                type: "in",
                quantity: quantity,
                reason: reason,
                date: new Date(),
                reference: `restock_${Date.now()}`,
              },
            ],
            $position: 0,
            $slice: 100,
          },
        },
        $set: {
          "inventory.lastRestockDate": new Date(),
          "inventory.restockQuantity": quantity,
        },
      },
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error restocking inventory:", error);
    return false;
  }
}

/**
 * Helper function to check if reorder is needed
 */
export function needsReorder(this: IEnhancedVariation): boolean {
  if (!this.inventory || !this.inventory.trackInventory) {
    return false;
  }

  return this.inventory.availableQuantity <= this.inventory.reorderPoint;
}

/**
 * Helper function to get low stock variations
 */
export async function getLowStockVariations(model: any, productId?: string) {
  const query: any = {
    isDeleted: false,
    "inventory.trackInventory": true,
    $expr: {
      $lte: ["$inventory.availableQuantity", "$inventory.reorderPoint"],
    },
  };

  if (productId) {
    query.productId = productId;
  }

  return await model
    .find(query)
    .populate("productId", "name")
    .select(
      "sku inventory.quantity inventory.reservedQuantity inventory.reorderPoint productId",
    )
    .sort({ "inventory.availableQuantity": 1 });
}

/**
 * Helper function to get inventory forecast
 */
export function getInventoryForecast(
  this: IEnhancedVariation,
  days: number = 30,
) {
  if (!this.inventory || !this.analytics) {
    return null;
  }

  const dailyAverageSales = this.analytics.temporal?.dailyAverages?.sales || 0;
  const currentStock = this.inventory.availableQuantity;

  if (dailyAverageSales === 0) {
    return {
      daysUntilStockOut: currentStock > 0 ? Infinity : 0,
      projectedStockOut: null,
      recommendedReorderQuantity: this.inventory.reorderPoint,
    };
  }

  const daysUntilStockOut = Math.floor(currentStock / dailyAverageSales);
  const projectedStockOut = new Date(
    Date.now() + daysUntilStockOut * 24 * 60 * 60 * 1000,
  );

  // Calculate recommended reorder quantity for the forecast period
  const demandForPeriod = dailyAverageSales * days;
  const recommendedReorderQuantity = Math.max(
    demandForPeriod - currentStock,
    this.inventory.reorderPoint,
  );

  return {
    daysUntilStockOut,
    projectedStockOut: daysUntilStockOut > 0 ? projectedStockOut : new Date(),
    recommendedReorderQuantity: Math.ceil(recommendedReorderQuantity),
  };
}
