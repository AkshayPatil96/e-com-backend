import { IProduct } from "../../@types/product.type";
import ErrorHandler from "../../utils/ErrorHandler";
import { convertToSlug } from "../../utils/logic";

/**
 * Utility function to validate product data and generate slug
 */
export const validateProductData = (
  product: IProduct,
  update?: Partial<IProduct>,
) => {
  const pricing = update?.pricing ?? product.pricing;
  const discount = update?.discount ?? product.discount;

  // Validate discount does not exceed base price
  if (pricing && discount && discount > 0) {
    const discountAmount = (pricing.basePrice * discount) / 100;
    if (discountAmount > pricing.basePrice) {
      throw new ErrorHandler(
        400,
        "Discount amount cannot exceed the base price of the product",
      );
    }
  }

  // Validate compare price is higher than base price
  if (pricing?.comparePrice && pricing.comparePrice <= pricing.basePrice) {
    throw new ErrorHandler(400, "Compare price must be higher than base price");
  }

  // Generate slug from product name
  const name = update?.name ?? product.name;
  if (name) {
    product.slug = convertToSlug(name);
  }
};
