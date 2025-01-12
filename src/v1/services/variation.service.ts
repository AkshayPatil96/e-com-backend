import { IVariation } from "../../@types/variation.type";
import Variation from "../../model/variation.model";
import { redis } from "../../server";

/**
 * Service to create new variations for an existing product.
 */
export const createVariations = async (
  productId: string,
  variations: IVariation[],
): Promise<any> => {
  try {
    // Check for existing variations for the product
    const existingVariations = await Variation.find({ productId });

    // Logic to filter out duplicates or merge as necessary
    const existingVariationIds = existingVariations.map((v) =>
      v._id.toString(),
    );
    const newVariationsToCreate = variations.filter(
      (variation) => !existingVariationIds.includes(variation._id.toString()),
    );

    // Create variations and associate with the product
    const createdVariations = await Variation.create(
      newVariationsToCreate.map((variation) => ({
        ...variation,
        productId,
      })),
    );

    // Combine existing variations with newly created ones
    const allVariations = [...existingVariations, ...createdVariations];

    // Cache the combined variations in Redis
    await redis.set(
      `product:${productId}:variations`,
      JSON.stringify(allVariations),
    );

    return createdVariations;
  } catch (error) {
    throw error;
  }
};

/**
 * Service to update existing variations for a product.
 */
export const updateVariationsService = async (
  productId: string,
  variations: IVariation[],
): Promise<any> => {
  const session = await Variation.startSession();
  session.startTransaction();

  try {
    const updatedVariations = await Promise.all(
      variations.map(async (variation) => {
        return await Variation.findByIdAndUpdate(variation._id, variation, {
          new: true,
          session,
        });
      }),
    );

    // Commit the transaction
    await session.commitTransaction();

    // Update Redis cache
    await redis.set(
      `product:${productId}:variations`,
      JSON.stringify(updatedVariations),
    );

    return updatedVariations;
  } catch (error) {
    await session.abortTransaction();
    throw error; // Rethrow error to be handled in the controller
  } finally {
    session.endSession();
  }
};
