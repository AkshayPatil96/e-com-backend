/**
 * Soft delete a user by setting isDeleted to true.
 * @returns {Promise<void>}
 */
export async function softDelete(this: any): Promise<void> {
  this.isDeleted = true;
  await this.save();
}

/**
 * Restore a soft-deleted user by setting isDeleted to false.
 * @returns {Promise<void>}
 */
export async function restore(this: any): Promise<void> {
  this.isDeleted = false;
  await this.save();
}
