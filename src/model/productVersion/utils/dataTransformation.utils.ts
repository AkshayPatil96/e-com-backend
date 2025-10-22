/**
 * Data Transformation Utilities
 * Helper functions for transforming and validating version data
 */

import { Types } from "mongoose";
import { IProductVersion, IVersionData } from "../../../@types/productVersion";

/**
 * Transform raw product data to version data format
 */
export function transformToVersionData(rawData: any): IVersionData {
  return {
    title: sanitizeString(rawData.title),
    description: sanitizeString(
      rawData.description || rawData.shortDescription,
    ),

    price: {
      basePrice: parseFloat(rawData.price?.basePrice || rawData.basePrice || 0),
      salePrice: rawData.price?.salePrice
        ? parseFloat(rawData.price.salePrice)
        : undefined,
      currency: rawData.price?.currency || rawData.currency || "USD",
    },

    category: ensureObjectId(rawData.category || rawData.categoryId),
    brand: ensureObjectId(rawData.brand || rawData.brandId),

    specifications: new Map(Object.entries(rawData.specifications || {})),

    inventory: {
      sku: sanitizeString(rawData.inventory?.sku || rawData.sku),
      stock: parseInt(rawData.inventory?.stock || rawData.stock || 0),
      lowStockThreshold: parseInt(
        rawData.inventory?.lowStockThreshold || rawData.lowStockThreshold || 10,
      ),
      trackInventory: Boolean(
        rawData.inventory?.trackInventory ?? rawData.trackInventory ?? true,
      ),
    },

    media: {
      images: transformImages(rawData.media?.images || rawData.images || []),
      videos: transformVideos(rawData.media?.videos || rawData.videos || []),
      documents: transformDocuments(
        rawData.media?.documents || rawData.documents || [],
      ),
    },

    seo: {
      metaTitle: sanitizeString(rawData.seo?.metaTitle || rawData.metaTitle),
      metaDescription: sanitizeString(
        rawData.seo?.metaDescription || rawData.metaDescription,
      ),
      keywords: transformKeywords(
        rawData.seo?.keywords || rawData.keywords || [],
      ),
      slug: generateSlug(
        rawData.seo?.slug || rawData.slug || rawData.title || "",
      ),
    },

    shipping: {
      weight: rawData.shipping?.weight
        ? parseFloat(rawData.shipping.weight)
        : undefined,
      dimensions: rawData.shipping?.dimensions
        ? {
            length: parseFloat(rawData.shipping.dimensions.length || 0),
            width: parseFloat(rawData.shipping.dimensions.width || 0),
            height: parseFloat(rawData.shipping.dimensions.height || 0),
            unit: rawData.shipping.dimensions.unit || "cm",
          }
        : {
            length: 0,
            width: 0,
            height: 0,
            unit: "cm",
          },
      shippingClass:
        (rawData.shipping?.shippingClass as
          | "standard"
          | "heavy"
          | "fragile"
          | "hazardous") || "standard",
    },

    attributes: transformAttributes(rawData.attributes || []),
    tags: transformTags(rawData.tags || []),

    status: rawData.status || "draft",
    visibility: rawData.visibility || "private",

    variations: (rawData.variations || []).map((v: any) => ensureObjectId(v)),
    metadata: new Map(Object.entries(rawData.metadata || {})),
  };
}

/**
 * Transform version data back to product format
 */
export function transformFromVersionData(versionData: IVersionData): any {
  return {
    title: versionData.title,
    description: versionData.description,
    shortDescription: versionData.description,

    basePrice: versionData.price.basePrice,
    salePrice: versionData.price.salePrice,
    currency: versionData.price.currency,

    categoryId: versionData.category,
    brandId: versionData.brand,

    sku: versionData.inventory.sku,
    stock: versionData.inventory.stock,
    lowStockThreshold: versionData.inventory.lowStockThreshold,
    trackInventory: versionData.inventory.trackInventory,

    images: versionData.media.images,
    videos: versionData.media.videos,
    documents: versionData.media.documents,

    metaTitle: versionData.seo.metaTitle,
    metaDescription: versionData.seo.metaDescription,
    keywords: versionData.seo.keywords,
    slug: versionData.seo.slug,

    weight: versionData.shipping?.weight,
    dimensions: versionData.shipping?.dimensions,
    shippingClass: versionData.shipping?.shippingClass,

    attributes: versionData.attributes,
    tags: versionData.tags,
    status: versionData.status,
    visibility: versionData.visibility,
  };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: any): string {
  if (typeof input !== "string") {
    return String(input || "");
  }
  return input.trim();
}

/**
 * Ensure value is ObjectId
 */
export function ensureObjectId(input: any): Types.ObjectId {
  if (Types.ObjectId.isValid(input)) {
    return typeof input === "string" ? new Types.ObjectId(input) : input;
  }
  throw new Error(`Invalid ObjectId: ${input}`);
}

/**
 * Transform images array
 */
export function transformImages(images: any[]): any[] {
  if (!Array.isArray(images)) return [];

  return images
    .map((img, index) => ({
      url: sanitizeString(img.url || img.src || ""),
      alt: sanitizeString(img.alt || img.altText || ""),
      isPrimary: Boolean(img.isPrimary || index === 0),
      order: typeof img.order === "number" ? img.order : index,
      size: img.size || undefined,
      format: img.format || "jpeg",
    }))
    .filter((img) => img.url);
}

/**
 * Transform videos array
 */
export function transformVideos(videos: any[]): any[] {
  if (!Array.isArray(videos)) return [];

  return videos
    .map((video, index) => ({
      url: sanitizeString(video.url || ""),
      thumbnail: sanitizeString(video.thumbnail || ""),
      title: sanitizeString(video.title || ""),
      duration: typeof video.duration === "number" ? video.duration : undefined,
      order: typeof video.order === "number" ? video.order : index,
    }))
    .filter((video) => video.url);
}

/**
 * Transform documents array
 */
export function transformDocuments(documents: any[]): any[] {
  if (!Array.isArray(documents)) return [];

  return documents
    .map((doc, index) => ({
      url: sanitizeString(doc.url || ""),
      name: sanitizeString(doc.name || doc.filename || ""),
      type: sanitizeString(doc.type || doc.mimeType || ""),
      size: typeof doc.size === "number" ? doc.size : undefined,
      order: typeof doc.order === "number" ? doc.order : index,
    }))
    .filter((doc) => doc.url);
}

/**
 * Transform keywords array
 */
export function transformKeywords(keywords: any): string[] {
  if (Array.isArray(keywords)) {
    return keywords.map((k) => sanitizeString(k)).filter((k) => k.length > 0);
  }
  if (typeof keywords === "string") {
    return keywords
      .split(",")
      .map((k) => sanitizeString(k))
      .filter((k) => k.length > 0);
  }
  return [];
}

/**
 * Transform attributes array
 */
export function transformAttributes(attributes: any[]): any[] {
  if (!Array.isArray(attributes)) return [];

  return attributes
    .map((attr) => ({
      name: sanitizeString(attr.name || attr.key || ""),
      value: sanitizeString(attr.value || ""),
      type: attr.type || "text",
      isRequired: Boolean(attr.isRequired || attr.required),
    }))
    .filter((attr) => attr.name && attr.value);
}

/**
 * Transform tags array
 */
export function transformTags(tags: any): string[] {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => sanitizeString(tag))
      .filter((tag) => tag.length > 0);
  }
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => sanitizeString(tag))
      .filter((tag) => tag.length > 0);
  }
  return [];
}

/**
 * Generate URL-friendly slug
 */
export function generateSlug(input: string): string {
  return sanitizeString(input)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Normalize price values
 */
export function normalizePrice(price: any): number {
  if (typeof price === "number") return Math.max(0, price);
  if (typeof price === "string") {
    const parsed = parseFloat(price.replace(/[^\d.-]/g, ""));
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }
  return 0;
}

/**
 * Validate version data structure
 */
export function validateVersionDataStructure(data: any): string[] {
  const errors: string[] = [];

  if (!data) {
    errors.push("Version data is required");
    return errors;
  }

  // Required fields validation
  if (!data.title?.trim()) {
    errors.push("Title is required");
  }

  if (!data.description?.trim()) {
    errors.push("Description is required");
  }

  if (!data.price?.basePrice || data.price.basePrice <= 0) {
    errors.push("Valid base price is required");
  }

  if (!data.category) {
    errors.push("Category is required");
  }

  if (!data.brand) {
    errors.push("Brand is required");
  }

  if (!data.inventory?.sku?.trim()) {
    errors.push("SKU is required");
  }

  if (data.inventory?.stock < 0) {
    errors.push("Stock cannot be negative");
  }

  // Optional field validation
  if (data.price?.salePrice && data.price.salePrice > data.price.basePrice) {
    errors.push("Sale price cannot be higher than base price");
  }

  if (data.shipping?.weight && data.shipping.weight < 0) {
    errors.push("Shipping weight cannot be negative");
  }

  return errors;
}

/**
 * Clean version data (remove undefined/null values)
 */
export function cleanVersionData(data: any): any {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data
      .map(cleanVersionData)
      .filter((item) => item !== null && item !== undefined);
  }

  if (typeof data === "object") {
    const cleaned: any = {};

    Object.keys(data).forEach((key) => {
      const value = cleanVersionData(data[key]);
      if (value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    });

    return cleaned;
  }

  return data;
}

/**
 * Extract searchable text from version data
 */
export function extractSearchableText(data: IVersionData): string {
  const searchableFields = [
    data.title,
    data.description,
    data.inventory?.sku,
    data.seo?.metaTitle,
    data.seo?.metaDescription,
    ...(data.seo?.keywords || []),
    ...(data.tags || []),
    ...(data.attributes?.map((attr) => `${attr.name}: ${attr.value}`) || []),
  ];

  return searchableFields
    .filter((field) => field && typeof field === "string")
    .join(" ")
    .toLowerCase();
}

/**
 * Convert version data to export format
 */
export function convertToExportFormat(
  version: IProductVersion,
  format: "json" | "csv" | "xml" = "json",
): string {
  const data = {
    versionNumber: version.versionNumber,
    productId: version.productId,
    isActive: version.isActive,
    isPublished: version.isPublished,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    ...version.versionData,
  };

  switch (format) {
    case "csv":
      return convertToCSV(data);
    case "xml":
      return convertToXML(data);
    default:
      return JSON.stringify(data, null, 2);
  }
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any): string {
  const flatData = flattenForExport(data);
  const headers = Object.keys(flatData);
  const values = headers.map((header) =>
    JSON.stringify(flatData[header] || ""),
  );

  return [headers.join(","), values.join(",")].join("\n");
}

/**
 * Convert data to XML format
 */
function convertToXML(data: any): string {
  const xmlParts = ['<?xml version="1.0" encoding="UTF-8"?>', "<version>"];

  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value !== null && value !== undefined) {
      xmlParts.push(`  <${key}>${escapeXML(String(value))}</${key}>`);
    }
  });

  xmlParts.push("</version>");
  return xmlParts.join("\n");
}

/**
 * Flatten nested object for export
 */
function flattenForExport(obj: any, prefix: string = ""): Record<string, any> {
  const flattened: Record<string, any> = {};

  Object.keys(obj || {}).forEach((key) => {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    const value = obj[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(flattened, flattenForExport(value, fullKey));
    } else {
      flattened[fullKey] = value;
    }
  });

  return flattened;
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default {
  transformToVersionData,
  transformFromVersionData,
  sanitizeString,
  ensureObjectId,
  transformImages,
  transformVideos,
  transformDocuments,
  transformKeywords,
  transformAttributes,
  transformTags,
  generateSlug,
  normalizePrice,
  validateVersionDataStructure,
  cleanVersionData,
  extractSearchableText,
  convertToExportFormat,
};
