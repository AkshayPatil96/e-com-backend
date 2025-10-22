import { IUser } from "../../../@types/user.type";

/**
 * Pre-save middleware to ensure only one default address
 */
export const addressValidationMiddleware = function (
  this: IUser,
  next: () => void,
) {
  if (
    this.isModified("addresses") &&
    this.addresses &&
    this.addresses.length > 0
  ) {
    const defaultAddresses = this.addresses.filter((addr) => addr.isDefault);
    if (defaultAddresses.length > 1) {
      // If multiple defaults, keep only the last one
      this.addresses.forEach((addr, index) => {
        if (index !== this.addresses!.length - 1) {
          addr.isDefault = false;
        }
      });
    }
  }
  next();
};
