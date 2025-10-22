import { Query } from "mongoose";
import { IProduct, ProductStatus } from "../../../@types/product.type";
import ErrorHandler from "../../../utils/ErrorHandler";
import { convertToSlug } from "../../../utils/logic";

/**
 * Pre-update middleware for findOneAndUpdate operations
 */
export const preUpdateMiddleware = async function (
  this: Query<any, IProduct>,
  next: any,
) {
  try {
    const update = this.getUpdate() as any;

    if (!update) {
      return next();
    }

    // Handle $set operations
    const setData = update.$set || update;

    // Update slug if name is being changed
    if (setData.name) {
      setData.slug = convertToSlug(setData.name);
    }

    // Update SEO fields if name or description changes
    if (setData.name && !setData["seo.metaTitle"]) {
      const metaTitle =
        setData.name.length > 60
          ? setData.name.substring(0, 57) + "..."
          : setData.name;
      setData["seo.metaTitle"] = metaTitle;
    }

    if (setData.shortDescription && !setData["seo.metaDescription"]) {
      const desc =
        setData.shortDescription.length > 160
          ? setData.shortDescription.substring(0, 157) + "..."
          : setData.shortDescription;
      setData["seo.metaDescription"] = desc;
    }

    // Update stock status based on inventory changes
    if (
      setData["inventory.stockQuantity"] !== undefined ||
      setData["inventory.reservedQuantity"] !== undefined
    ) {
      const currentDoc = await this.model.findOne(this.getQuery());
      if (currentDoc) {
        const newStockQuantity =
          setData["inventory.stockQuantity"] ??
          currentDoc.inventory.stockQuantity;
        const newReservedQuantity =
          setData["inventory.reservedQuantity"] ??
          currentDoc.inventory.reservedQuantity;
        const availableStock = newStockQuantity - newReservedQuantity;

        if (
          availableStock <= 0 &&
          currentDoc.status === ProductStatus.PUBLISHED
        ) {
          setData.status = ProductStatus.OUT_OF_STOCK;
        } else if (
          availableStock > 0 &&
          currentDoc.status === ProductStatus.OUT_OF_STOCK
        ) {
          setData.status = ProductStatus.PUBLISHED;
        }
      }
    }

    // Set isOnSale flag based on discount
    if (setData.discount !== undefined) {
      setData.isOnSale = setData.discount > 0;
    }

    // Set publishedAt timestamp when status changes to published
    if (setData.status === ProductStatus.PUBLISHED) {
      const currentDoc = await this.model.findOne(this.getQuery());
      if (currentDoc && !currentDoc.publishedAt) {
        setData.publishedAt = new Date();
      }
    }

    // Validate pricing and discount
    if (
      setData["pricing.basePrice"] !== undefined ||
      setData.discount !== undefined
    ) {
      const currentDoc = await this.model.findOne(this.getQuery());
      if (currentDoc) {
        const newBasePrice =
          setData["pricing.basePrice"] ?? currentDoc.pricing.basePrice;
        const newDiscount = setData.discount ?? currentDoc.discount ?? 0;
        const discountAmount = (newBasePrice * newDiscount) / 100;

        if (discountAmount > newBasePrice) {
          throw new ErrorHandler(
            400,
            "Discount amount cannot exceed base price",
          );
        }
      }
    }

    // Set updatedAt timestamp
    setData.updatedAt = new Date();

    // Update the query with validated data
    if (update.$set) {
      update.$set = setData;
    } else {
      this.setUpdate(setData);
    }

    next();
  } catch (error) {
    next(error as any);
  }
};
