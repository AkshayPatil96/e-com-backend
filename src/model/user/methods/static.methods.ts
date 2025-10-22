import { Query } from "mongoose";
import { IUser } from "../../../@types/user.type";

/**
 * Static method to find all active users based on the query.
 * @param {Record<string, any>} additionalQuery - Additional query parameters
 * @returns {Query<IUser[], IUser>}
 */
export function findActiveUser(
  this: any,
  additionalQuery: Record<string, any> = {},
): Query<IUser[], IUser> {
  const query = { isDeleted: false, status: "active", ...additionalQuery };
  return this.find(query);
}

/**
 * Static method to find the first active user based on the query.
 * @param {Record<string, any>} query - Query parameters
 * @returns {Query<IUser | null, IUser>}
 */
export function findActiveOne(
  this: any,
  query: Record<string, any>,
): Query<IUser | null, IUser> {
  return this.findOne({ isDeleted: false, status: "active", ...query });
}

/**
 * Static method to find users by role.
 * @param {string} role - User role
 * @param {Record<string, any>} additionalQuery - Additional query parameters
 * @returns {Query<IUser[], IUser>}
 */
export function findByRole(
  this: any,
  role: string,
  additionalQuery: Record<string, any> = {},
): Query<IUser[], IUser> {
  return this.find({ isDeleted: false, role, ...additionalQuery });
}
