import { IProduct } from "../../@types/product.type";
import { IVariation } from "../../@types/variation.type";
import Product from "../../model/product.model";
import Variation from "../../model/variation.model";
import { redis } from "../../server";

/**
 * Service to create a new product with variations.
 */
export const createProductService = async (
  productData: IProduct,
  variations: IVariation[],
): Promise<any> => {
  const session = await Product.startSession();
  session.startTransaction();

  try {
    // Create the product
    const newProduct = await Product.create([productData], { session });

    // Create variations and associate with the product
    const createdVariations = await Variation.create(
      variations.map((variation) => ({
        ...variation,
        productId: newProduct[0]._id, // Link variations to the newly created product
      })),
      { session },
    );

    // Commit the transaction
    await session.commitTransaction();

    // Cache the product and variations in Redis
    await redis.set(
      `product:${newProduct[0]._id}`,
      JSON.stringify(newProduct[0]),
    );
    await redis.set(
      `product:${newProduct[0]._id}:variations`,
      JSON.stringify(createdVariations),
    );

    return { product: newProduct[0], variations: createdVariations };
  } catch (error) {
    await session.abortTransaction();
    throw error; // Rethrow error to be handled in the controller
  } finally {
    session.endSession();
  }
};

/**
 * Service to update an existing product.
 */
export const updateProductService = async (
  productId: string,
  updateData: Partial<IProduct>,
): Promise<any> => {
  const session = await Product.startSession();
  session.startTransaction();

  try {
    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, session },
    );

    // Commit the transaction
    await session.commitTransaction();

    // Update Redis cache
    await redis.set(`product:${productId}`, JSON.stringify(updatedProduct));

    return updatedProduct;
  } catch (error) {
    await session.abortTransaction();
    throw error; // Rethrow error to be handled in the controller
  } finally {
    session.endSession();
  }
};
