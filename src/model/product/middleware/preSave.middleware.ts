import { IProduct, ProductStatus } from "../../../@types/product.type";
import ErrorHandler from "../../../utils/ErrorHandler";
import { convertToSlug } from "../../../utils/logic";
import { validateProductData } from "../validation";

/**
 * Pre-save middleware for validation and business logic
 */
export const preSaveMiddleware = async function (this: IProduct, next: any) {
  try {
    // Call validation function
    validateProductData(this);

    // Auto-generate SKU if not provided
    if (!this.sku) {
      const timestamp = Date.now().toString().slice(-6);
      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 5)
        .toUpperCase();
      this.sku = `PRD-${timestamp}-${randomSuffix}`;
    }

    // Auto-generate slug from name if not provided
    if (!this.slug && this.name) {
      this.slug = convertToSlug(this.name);
    }

    // Auto-populate SEO fields if not provided
    if (this.name && !this.seo.metaTitle) {
      this.seo.metaTitle =
        this.name.length > 60 ? this.name.substring(0, 57) + "..." : this.name;
    }

    if (this.shortDescription && !this.seo.metaDescription) {
      const desc =
        this.shortDescription.length > 160
          ? this.shortDescription.substring(0, 157) + "..."
          : this.shortDescription;
      this.seo.metaDescription = desc;
    }

    // Update stock status based on inventory
    if (this.inventory.trackQuantity) {
      const availableStock =
        this.inventory.stockQuantity - this.inventory.reservedQuantity;

      // Auto-update status based on stock
      if (availableStock <= 0 && this.status === ProductStatus.PUBLISHED) {
        this.status = ProductStatus.OUT_OF_STOCK;
      } else if (
        availableStock > 0 &&
        this.status === ProductStatus.OUT_OF_STOCK
      ) {
        this.status = ProductStatus.PUBLISHED;
      }

      // Set isOnSale flag based on discount
      this.isOnSale = (this.discount ?? 0) > 0;
    }

    // Set publishedAt timestamp when status changes to published
    if (
      this.isModified("status") &&
      this.status === ProductStatus.PUBLISHED &&
      !this.publishedAt
    ) {
      this.publishedAt = new Date();
    }

    // Update analytics conversion rate
    if (this.analytics.viewCount > 0) {
      this.analytics.conversionRate =
        (this.analytics.purchaseCount / this.analytics.viewCount) * 100;
    }

    // Validate business rules
    if (this.isModified("pricing.basePrice") || this.isModified("discount")) {
      const discount = this.discount ?? 0;
      const discountAmount = (this.pricing.basePrice * discount) / 100;
      if (discountAmount > this.pricing.basePrice) {
        throw new ErrorHandler(400, "Discount amount cannot exceed base price");
      }
    }

    // Ensure required fields for published products
    if (this.status === ProductStatus.PUBLISHED) {
      if (!this.images || this.images.length === 0) {
        throw new ErrorHandler(
          400,
          "Published products must have at least one image",
        );
      }
      if (!this.shipping.weight || !this.shipping.dimensions.length) {
        throw new ErrorHandler(
          400,
          "Published products must have complete shipping information",
        );
      }
    }

    next();
  } catch (error) {
    next(error as any);
  }
};
