import { IBrand } from "../../@types/brand.type";
import Brand from "../../model/brand.model";
import { redis } from "../../server";
import ErrorHandler from "../../utils/ErrorHandler";

export const getAllBrands = async () => {
  const cacheKey = "brand:allBrands";
  const cachedBrands = await redis.get(cacheKey);

  if (cachedBrands) return JSON.parse(cachedBrands);

  const brands = await Brand.find().populate("categories");
  await redis.set(cacheKey, JSON.stringify(brands), "EX", 3600);
  return brands;
};

export const getBrandById = async (slug: string) => {
  if (!slug) throw new ErrorHandler(400, "Brand slug is required");

  const cacheKey = `brand:${slug}`;
  const cachedBrand = await redis.get(cacheKey);

  if (cachedBrand) return JSON.parse(cachedBrand);

  const brand = await Brand.findOne({ slug }).populate("categories");
  if (!brand) throw new ErrorHandler(404, "Brand not found");

  await redis.set(cacheKey, JSON.stringify(brand), "EX", 3600);
  return brand;
};

export const createBrandService = async (data: Partial<IBrand>) => {
  const newBrand = new Brand(data);
  await newBrand.save();
  await clearBrandCache();
  return newBrand;
};

export const updateBrandService = async (id: string, data: Partial<IBrand>) => {
  const updatedBrand = await Brand.findByIdAndUpdate(id, data, { new: true });
  if (!updatedBrand) throw new ErrorHandler(404, "Brand not found");
  return updatedBrand;
};

export const softDeleteBrandService = async (id: string) => {
  const brand = await Brand.findById(id);
  if (!brand) throw new ErrorHandler(404, "Brand not found");

  await brand.softDelete();
  await clearBrandCache();
  return brand;
};

export const restoreBrandService = async (id: string) => {
  const brand = await Brand.findById(id);
  if (!brand) throw new ErrorHandler(404, "Brand not found");

  await brand.restore();
  await clearBrandCache();
  await redis.set(`brand:${brand.slug}`, JSON.stringify(brand), "EX", 3600);
  return brand;
};

export const deleteBrandService = async (id: string) => {
  const brand = await Brand.findOneAndDelete({ _id: id });
  if (!brand) throw new ErrorHandler(404, "Brand not found");
  await clearBrandCache();
  return brand;
};

export const clearBrandCache = async () => {
  await redis.keys("brand:*").then((keys) => {
    keys.forEach((key) => redis.del(key));
  });
};
