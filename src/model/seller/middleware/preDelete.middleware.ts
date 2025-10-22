import { deleteCheck } from "./deleteCheck.middleware";

/**
 * Pre-delete middleware to check if seller can be deleted
 */
export const preDeleteMiddleware = async function (
  this: any,
  next: () => void,
) {
  const query = this.getQuery();
  const sellerId = query._id;

  await deleteCheck(sellerId, { next });

  next();
};
