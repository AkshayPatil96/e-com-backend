import { ISeller } from "../../@types/seller.type";
import Seller from "../../model/seller.model";
import { redis } from "../../server";
import ErrorHandler from "../../utils/ErrorHandler";

/**
 * Service to create a new seller.
 */
export const createSellerService = async (
  sellerData: ISeller,
): Promise<ISeller> => {
  try {
    const newSeller = new Seller(sellerData);
    await newSeller.save();

    await clearSellerCache();

    // Cache the newly created seller in Redis
    await redis.set(`seller:${newSeller._id}`, JSON.stringify(newSeller));

    return newSeller;
  } catch (error) {
    throw error; // Handle error in controller
  }
};

/**
 * Service to update an existing seller by ID.
 */
export const updateSellerService = async (
  sellerId: string,
  updateData: Partial<ISeller>,
): Promise<ISeller | null> => {
  try {
    console.log("updateData: ", updateData);
    const updatedSeller = await Seller.findByIdAndUpdate(sellerId, updateData, {
      new: true,
    });

    await clearSellerCache();

    if (updatedSeller) {
      // Update the cached seller in Redis
      await redis.set(
        `seller:${updatedSeller._id}`,
        JSON.stringify(updatedSeller),
      );
    }

    return updatedSeller;
  } catch (error) {
    throw error; // Handle error in controller
  }
};

/**
 * Service to get a seller by ID (including from Redis cache).
 */
export const getSellerByIdService = async (
  sellerId: string,
): Promise<ISeller | null> => {
  try {
    // Check if the seller is in Redis
    const cachedSeller = await redis.get(`seller:${sellerId}`);

    if (cachedSeller) {
      return JSON.parse(cachedSeller); // Return the cached seller
    }

    // If not in cache, fetch from database
    const seller = await Seller.findOne({ slug: sellerId }).populate(
      "categories userId",
    );

    // Cache the fetched seller in Redis
    if (seller) {
      await redis.set(`seller:${seller.slug}`, JSON.stringify(seller));
    }

    return seller;
  } catch (error) {
    throw error; // Handle error in controller
  }
};

/**
 * Service to get all sellers with optional filtering (including from Redis cache).
 * @param query - Query parameters for filtering.
 */
export const getAllSellersService = async (query: {
  isDeleted?: boolean;
  status?: string;
}): Promise<ISeller[]> => {
  try {
    // Build filter based on query parameters
    const filter: any = {};
    if (query.isDeleted !== undefined) filter.isDeleted = query.isDeleted;
    if (query.status) filter.status = query.status;

    // If not in cache, fetch from database with filtering
    const sellers = await Seller.find(filter).populate("categories"); // Populate categories if needed

    return sellers;
  } catch (error) {
    throw error; // Handle error in controller
  }
};

/**
 * Service to soft delete a seller by ID.
 * @param sellerId - ID of the seller to delete.
 * @param isDeleted - Flag to set the seller as deleted.
 * @returns The deleted seller.
 * @throws Error if the seller is not found.
 */
export const softDeleteSellerService = async (sellerId: string) => {
  try {
    const deletedSeller = await Seller.findOne({ _id: sellerId });

    if (!deletedSeller) throw new ErrorHandler(404, "Seller not found");

    // Soft delete the seller
    await deletedSeller.softDelete();

    // Remove the seller from Redis cache
    await redis.del(`seller:${deletedSeller?.slug}`);

    await clearSellerCache();

    return deletedSeller;
  } catch (error) {
    throw error; // Handle error in controller
  }
};

/**
 * Service to restore a soft-deleted seller by ID.
 * @param sellerId - ID of the seller to restore.
 * @returns The restored seller.
 * @throws Error if the seller is not found.
 */
export const restoreSellerService = async (sellerId: string) => {
  try {
    const restoredSeller = await Seller.findOne({ _id: sellerId });

    if (!restoredSeller) throw new ErrorHandler(404, "Seller not found");

    // Restore the soft-deleted seller
    await restoredSeller.restore();

    // Cache the restored seller in Redis
    await redis.set(
      `seller:${restoredSeller?.slug}`,
      JSON.stringify(restoredSeller),
    );

    await clearSellerCache();

    return restoredSeller;
  } catch (error) {
    throw error; // Handle error in controller
  }
};

/**
 * Service to delete a seller by ID.
 * @param sellerId - ID of the seller to delete.
 * @returns The deleted seller.
 * @throws Error if the seller is not found.
 */
export const deleteSellerService = async (sellerId: string) => {
  try {
    const deletedSeller = await Seller.findOneAndDelete({ _id: sellerId });

    if (!deletedSeller) throw new ErrorHandler(404, "Seller not found");

    // Remove the seller from Redis cache
    await redis.del(`seller:${deletedSeller?.slug}`);

    await clearSellerCache();

    return deletedSeller;
  } catch (error) {
    throw error; // Handle error in controller
  }
};

export const clearSellerCache = async () => {
  redis.keys("seller:*", (err, keys) => {
    if (err) console.error(err);
    if (keys) keys.forEach((key) => redis.del(key));
  });
};
