import { NextFunction, Request, Response } from "express";

/**
 * Enhanced image interface with additional metadata
 * Supports AWS S3 integration and image processing
 */
export interface IImage {
  url: string;
  alt: string;
  caption?: string;
  isPrimary?: boolean;

  // S3 specific fields
  s3Key?: string;
  bucket?: string;

  // Processed format variants
  processedFormats?: {
    webp?: string;
    thumbnail?: string;
    medium?: string;
    large?: string;
    original?: string;
  };

  // Image metadata
  width?: number;
  height?: number;
  size?: number; // File size in bytes
  format?: "jpg" | "jpeg" | "png" | "gif" | "webp" | "avif";

  // Processing metadata
  isProcessed?: boolean;
  processingStatus?: "pending" | "processing" | "completed" | "failed";
  compressionRatio?: number;

  // Upload tracking
  uploadMethod?: "direct" | "presigned" | "external_url" | "form_upload";
  originalUrl?: string; // For tracking external URLs that were downloaded
  uploadedAt?: Date;
  processedAt?: Date;
}

/**
 * Enhanced SEO metadata interface
 */
export interface IMetadataSchema {
  title?: string;
  description?: string;
  keywords?: string[];
  images?: string[];
  // Additional SEO fields
  canonicalUrl?: string;
  robots?:
    | "index,follow"
    | "noindex,follow"
    | "index,nofollow"
    | "noindex,nofollow";
  ogType?: "website" | "article" | "product";
}

/**
 * Address interface for consistent location handling
 * Uses GeoJSON Point structure for location coordinates
 */
export interface IAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  // GeoJSON Point structure for location
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  type?:
    | "home"
    | "work"
    | "billing"
    | "shipping"
    | "business"
    | "pickup"
    | "return"
    | "other";
  label?: string;
  isDefault?: boolean;
}

/**
 * Contact information interface
 */
export interface IContact {
  phone?: string;
  email?: string;
  website?: string;
  fax?: string;
}

/**
 * Social media links interface
 */
export interface ISocialMedia {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

/**
 * Price interface for consistent pricing
 */
export interface IPrice {
  amount: number;
  currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "INR";
  validFrom?: Date;
  validTo?: Date;
}

/**
 * Dimensions interface for physical products
 */
export interface IDimensions {
  length: number;
  width: number;
  height: number;
  unit: "mm" | "cm" | "m" | "in" | "ft";
  volume?: number;
}

export type IController = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response<any, Record<string, any>>>;
