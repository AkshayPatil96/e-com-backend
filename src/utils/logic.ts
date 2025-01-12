import slugify from "slugify";

export const convertToSlug = (text: string) => {
  let slug = slugify(text, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });

  return slug;
};

// export const generateSKU =
export const generateSKU = (
  category: string,
  productName: string,
  type: string,
): string => {
  const index: number = Math.floor(Math.random() * 1000);

  const categoryCode = category.slice(0, 4).toUpperCase(); // First 4 letters of the category
  const productCode = productName.replace(/\s+/g, "-").toUpperCase(); // Replace spaces with hyphens
  const typeCode = type.slice(0, 2).toUpperCase(); // First 2 letters of the type
  return `${categoryCode}-${productCode}-${typeCode}-${index}`; // Ensure the number is 3 digits
};
