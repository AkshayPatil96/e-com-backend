import { ISellerAddress } from "../../../@types/seller.type";
import { deleteCheck } from "../middleware/deleteCheck.middleware";

/**
 * Instance method to check if the seller is active.
 */
export function isActive(this: any): boolean {
  return this.status === "active";
}

/**
 * Instance method to soft delete a seller.
 * Check if the seller has active products before deletion.
 */
export async function softDelete(this: any): Promise<any> {
  await deleteCheck(this._id, this);
  this.isDeleted = true;
  return this.save();
}

/**
 * Instance method to restore a soft-deleted seller
 */
export async function restore(this: any): Promise<any> {
  this.isDeleted = false;
  return this.save();
}

/**
 * Instance method to get default address
 */
export function getDefaultAddress(
  this: any,
  type?: string,
): ISellerAddress | null {
  if (!this.addresses || this.addresses.length === 0) return null;

  if (type) {
    return (
      this.addresses.find(
        (addr: ISellerAddress) => addr.type === type && addr.isDefault,
      ) ||
      this.addresses.find((addr: ISellerAddress) => addr.type === type) ||
      null
    );
  }

  return (
    this.addresses.find((addr: ISellerAddress) => addr.isDefault) ||
    this.addresses[0]
  );
}
