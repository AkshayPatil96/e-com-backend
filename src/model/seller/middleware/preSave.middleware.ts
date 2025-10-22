import { ISeller, ISellerAddress } from "../../../@types/seller.type";
import { convertToSlug } from "../../../utils/logic";

/**
 * Pre-save validation for storeName and slug generation
 */
export const preSaveSlugMiddleware = function (
  this: ISeller,
  next: () => void,
) {
  if (this.isModified("storeName")) {
    this.slug = convertToSlug(this.storeName);
  }

  // Ensure only one default address per type
  if (
    this.isModified("addresses") &&
    this.addresses &&
    this.addresses.length > 0
  ) {
    const addressTypes = ["business", "pickup", "billing", "return"];
    addressTypes.forEach((type) => {
      const addressesOfType = this.addresses!.filter(
        (addr) => addr.type === type,
      );
      const defaultAddresses = addressesOfType.filter((addr) => addr.isDefault);

      if (defaultAddresses.length > 1) {
        // Keep only the last one as default
        addressesOfType.forEach((addr, index) => {
          if (index !== addressesOfType.length - 1) {
            addr.isDefault = false;
          }
        });
      }
    });
  }

  next();
};
