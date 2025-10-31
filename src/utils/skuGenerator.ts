/**
 * @fileoverview SKU Generation Utility
 * 
 * This module provides functions to generate unique SKUs for products.
 * SKU Format: {BRAND_CODE}-{CATEGORY_CODE}-{SIZE_CODE}-{COLOR_CODE}-{SEQUENCE}
 * 
 * Examples:
 * - NIKE-SHO-L-BLK-001 (Nike Shoes, Large, Black, 001st variant)
 * - ADIDAS-TSH-M-RED-002 (Adidas T-Shirt, Medium, Red, 002nd variant)
 * - PUMA-ACC-OS-GLD-001 (Puma Accessories, One-Size, Gold, 001st variant)
 * 
 * @author E-commerce API Team
 * @version 1.0.0
 */

import crypto from "crypto";
import Product from "../model/product";

// Color code mappings for common colors
const COLOR_CODES: Record<string, string> = {
  // Basic Colors
  black: "BLK",
  white: "WHT",
  red: "RED",
  blue: "BLU",
  green: "GRN",
  yellow: "YEL",
  orange: "ORG",
  purple: "PUR",
  pink: "PNK",
  brown: "BRN",
  gray: "GRY",
  grey: "GRY",
  
  // Extended Colors
  navy: "NVY",
  maroon: "MAR",
  olive: "OLV",
  lime: "LIM",
  aqua: "AQU",
  teal: "TEL",
  silver: "SLV",
  gold: "GLD",
  beige: "BEG",
  tan: "TAN",
  cream: "CRM",
  ivory: "IVY",
  
  // Multi-color
  multicolor: "MUL",
  mixed: "MIX",
  rainbow: "RNB",
  
  // No color / Default
  default: "DEF",
  none: "NON",
  transparent: "TRN",
};

// Size code mappings
const SIZE_CODES: Record<string, string> = {
  // Clothing Sizes
  "extra small": "XS",
  "x-small": "XS",
  "xs": "XS",
  
  "small": "S",
  "s": "S",
  
  "medium": "M",
  "m": "M",
  
  "large": "L",
  "l": "L",
  
  "extra large": "XL",
  "x-large": "XL",
  "xl": "XL",
  
  "2xl": "XXL",
  "xxl": "XXL",
  "xx-large": "XXL",
  
  "3xl": "XXXL",
  "xxxl": "XXXL",
  
  // Shoe Sizes (US)
  "6": "06",
  "6.5": "065",
  "7": "07",
  "7.5": "075",
  "8": "08",
  "8.5": "085",
  "9": "09",
  "9.5": "095",
  "10": "10",
  "10.5": "105",
  "11": "11",
  "11.5": "115",
  "12": "12",
  "13": "13",
  
  // Universal
  "one size": "OS",
  "onesize": "OS",
  "free size": "FS",
  "freesize": "FS",
  "adjustable": "ADJ",
  
  // Default
  "default": "DEF",
  "none": "NON",
};

/**
 * Interface for SKU generation parameters
 */
export interface ISKUGenerationParams {
  brandCode: string;
  categoryCode: string;
  size?: string;
  color?: string;
  customSuffix?: string;
  forceSequence?: number;
}

/**
 * Interface for SKU generation result
 */
export interface ISKUGenerationResult {
  sku: string;
  components: {
    brand: string;
    category: string;
    size: string;
    color: string;
    sequence: string;
  };
  isCustom: boolean;
}

/**
 * Normalize and get color code
 */
const getColorCode = (color?: string): string => {
  if (!color) return "NON";
  
  const normalizedColor = color.toLowerCase().trim();
  return COLOR_CODES[normalizedColor] || color.substring(0, 3).toUpperCase();
};

/**
 * Normalize and get size code
 */
const getSizeCode = (size?: string): string => {
  if (!size) return "OS";
  
  const normalizedSize = size.toLowerCase().trim();
  return SIZE_CODES[normalizedSize] || size.substring(0, 3).toUpperCase();
};

/**
 * Generate a random sequence number
 */
const generateSequence = (): string => {
  return Math.floor(Math.random() * 999 + 1).toString().padStart(3, '0');
};

/**
 * Generate a cryptographically secure sequence
 */
const generateSecureSequence = (): string => {
  const randomBytes = crypto.randomBytes(2);
  const randomNumber = randomBytes.readUInt16BE(0) % 999 + 1;
  return randomNumber.toString().padStart(3, '0');
};

/**
 * Check if SKU already exists in database
 */
const isSkuUnique = async (sku: string): Promise<boolean> => {
  try {
    const existingProduct = await Product.findOne({ sku });
    return !existingProduct;
  } catch (error) {
    console.error("Error checking SKU uniqueness:", error);
    return false;
  }
};

/**
 * Generate next sequence number for a brand-category combination
 */
const getNextSequenceForBrandCategory = async (
  brandCode: string, 
  categoryCode: string
): Promise<string> => {
  try {
    const pattern = `^${brandCode}-${categoryCode}-`;
    
    // Find the latest SKU with this brand-category pattern
    const latestProduct = await Product.findOne(
      { sku: { $regex: pattern } },
      { sku: 1 },
      { sort: { sku: -1 } }
    );
    
    if (!latestProduct) {
      return "001";
    }
    
    // Extract sequence number from SKU
    const skuParts = latestProduct.sku.split('-');
    const lastSequence = skuParts[skuParts.length - 1];
    const nextNumber = parseInt(lastSequence) + 1;
    
    return nextNumber.toString().padStart(3, '0');
  } catch (error) {
    console.error("Error getting next sequence:", error);
    return generateSequence();
  }
};

/**
 * Main SKU generation function
 */
export const generateSKU = async (
  params: ISKUGenerationParams
): Promise<ISKUGenerationResult> => {
  const {
    brandCode,
    categoryCode,
    size,
    color,
    customSuffix,
    forceSequence
  } = params;
  
  // Validate required parameters
  if (!brandCode || !categoryCode) {
    throw new Error("Brand code and category code are required for SKU generation");
  }
  
  // Normalize codes
  const normalizedBrandCode = brandCode.toUpperCase().trim();
  const normalizedCategoryCode = categoryCode.toUpperCase().trim();
  const sizeCode = getSizeCode(size);
  const colorCode = getColorCode(color);
  
  // Generate sequence
  let sequence: string;
  
  if (forceSequence) {
    sequence = forceSequence.toString().padStart(3, '0');
  } else if (customSuffix) {
    sequence = customSuffix.toUpperCase();
  } else {
    sequence = await getNextSequenceForBrandCategory(
      normalizedBrandCode, 
      normalizedCategoryCode
    );
  }
  
  // Construct SKU
  const sku = `${normalizedBrandCode}-${normalizedCategoryCode}-${sizeCode}-${colorCode}-${sequence}`;
  
  // Verify uniqueness (with retry mechanism)
  let finalSku = sku;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!(await isSkuUnique(finalSku)) && attempts < maxAttempts) {
    attempts++;
    const newSequence = generateSecureSequence();
    finalSku = `${normalizedBrandCode}-${normalizedCategoryCode}-${sizeCode}-${colorCode}-${newSequence}`;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error("Unable to generate unique SKU after multiple attempts");
  }
  
  return {
    sku: finalSku,
    components: {
      brand: normalizedBrandCode,
      category: normalizedCategoryCode,
      size: sizeCode,
      color: colorCode,
      sequence: finalSku.split('-').pop() || sequence,
    },
    isCustom: !!customSuffix || !!forceSequence,
  };
};

/**
 * Generate SKU from product data
 */
export const generateSKUFromProduct = async (productData: {
  brand: { code: string };
  category: { code: string };
  attributes?: Record<string, any>;
  size?: string;
  color?: string;
}): Promise<ISKUGenerationResult> => {
  // Extract size and color from attributes if not directly provided
  const size = productData.size || 
               productData.attributes?.size || 
               productData.attributes?.Size;
  
  const color = productData.color || 
                productData.attributes?.color || 
                productData.attributes?.Color;
  
  return generateSKU({
    brandCode: productData.brand.code,
    categoryCode: productData.category.code,
    size,
    color,
  });
};

/**
 * Validate SKU format
 */
export const validateSKUFormat = (sku: string): boolean => {
  const skuPattern = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/;
  return skuPattern.test(sku);
};

/**
 * Parse SKU into components
 */
export const parseSKU = (sku: string): {
  brand: string;
  category: string;
  size: string;
  color: string;
  sequence: string;
} | null => {
  if (!validateSKUFormat(sku)) {
    return null;
  }
  
  const parts = sku.split('-');
  
  if (parts.length < 5) {
    return null;
  }
  
  return {
    brand: parts[0],
    category: parts[1],
    size: parts[2],
    color: parts[3],
    sequence: parts.slice(4).join('-'), // Handle multi-part sequences
  };
};

/**
 * Generate multiple SKUs for product variations
 */
export const generateVariationSKUs = async (
  baseParams: Omit<ISKUGenerationParams, 'size' | 'color'>,
  variations: Array<{ size?: string; color?: string; customSuffix?: string }>
): Promise<ISKUGenerationResult[]> => {
  const results: ISKUGenerationResult[] = [];
  
  for (const variation of variations) {
    const result = await generateSKU({
      ...baseParams,
      size: variation.size,
      color: variation.color,
      customSuffix: variation.customSuffix,
    });
    
    results.push(result);
  }
  
  return results;
};

/**
 * Suggest SKU based on product name and existing patterns
 */
export const suggestSKU = async (
  brandCode: string,
  categoryCode: string,
  productName: string
): Promise<string> => {
  // Extract potential size and color from product name
  const nameWords = productName.toLowerCase().split(/\s+/);
  
  let suggestedSize: string | undefined;
  let suggestedColor: string | undefined;
  
  // Look for size indicators in product name
  for (const word of nameWords) {
    if (SIZE_CODES[word]) {
      suggestedSize = word;
      break;
    }
  }
  
  // Look for color indicators in product name
  for (const word of nameWords) {
    if (COLOR_CODES[word]) {
      suggestedColor = word;
      break;
    }
  }
  
  const result = await generateSKU({
    brandCode,
    categoryCode,
    size: suggestedSize,
    color: suggestedColor,
  });
  
  return result.sku;
};

export default {
  generateSKU,
  generateSKUFromProduct,
  validateSKUFormat,
  parseSKU,
  generateVariationSKUs,
  suggestSKU,
  COLOR_CODES,
  SIZE_CODES,
};