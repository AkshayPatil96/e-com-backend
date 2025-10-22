"use strict";
/**
 * Common Mongoose Schemas
 *
 * This module provides reusable Mongoose schemas that are shared across multiple models
 * to ensure consistency, reduce code duplication, and maintain standard data structures.
 *
 * Available Schemas:
 * - metaDataSchema: Enhanced SEO metadata with validation
 * - ImageSchema: Comprehensive image schema with S3 path support and metadata
 * - BaseAddressSchema: Basic address schema with GeoJSON Point coordinates
 * - UserAddressSchema: User-specific address schema with postalCode field
 * - SellerAddressSchema: Seller-specific address schema with business types and GeoJSON
 * - ContactSchema: Contact information with international phone validation
 * - SocialMediaSchema: Social media links with platform-specific URL validation
 * - PriceSchema: Price schema with multiple currencies and date range support
 * - DimensionsSchema: Physical dimensions for products with multiple units
 *
 * Usage:
 * import { ImageSchema, UserAddressSchema, SocialMediaSchema } from '../schema/common.model';
 *
 * Features:
 * - Full TypeScript support with interfaces
 * - Comprehensive validation rules
 * - SEO optimization ready
 * - S3 path validation for images
 * - GeoJSON Point structure for locations
 * - Platform-specific social media validation
 * - Multi-currency support
 * - International standards compliance
 *
 * @version 2.1.0
 * @author Development Team
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DimensionsSchema = exports.PriceSchema = exports.SocialMediaSchema = exports.ContactSchema = exports.SellerAddressSchema = exports.UserAddressSchema = exports.BaseAddressSchema = exports.ImageSchema = exports.metaDataSchema = void 0;
const mongoose_1 = require("mongoose");
/**
 * Enhanced metadata schema for SEO optimization
 * Used across multiple models for consistent SEO implementation
 */
exports.metaDataSchema = new mongoose_1.Schema({
    title: {
        type: String,
        trim: true,
        maxlength: [60, "Meta title cannot exceed 60 characters"],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [160, "Meta description cannot exceed 160 characters"],
    },
    keywords: {
        type: [String],
        validate: {
            validator: function (v) {
                return v.length <= 10; // SEO best practice
            },
            message: "Maximum 10 keywords allowed",
        },
    },
    images: [String],
    // Additional SEO fields
    canonicalUrl: {
        type: String,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^https?:\/\/.+/.test(v);
            },
            message: "Invalid canonical URL format",
        },
    },
    robots: {
        type: String,
        enum: [
            "index,follow",
            "noindex,follow",
            "index,nofollow",
            "noindex,nofollow",
        ],
        default: "index,follow",
    },
    ogType: {
        type: String,
        enum: ["website", "article", "product"],
        default: "website",
    },
}, { _id: false });
/**
 * Enhanced image schema with validation and additional metadata
 * Used across multiple models for consistent image handling
 * Supports AWS S3 paths, CloudFront URLs, and external URLs
 * Enhanced for presigned URL uploads and image processing
 */
exports.ImageSchema = new mongoose_1.Schema({
    url: {
        type: String,
        required: [true, "Image URL or S3 path is required"],
        validate: {
            validator: function (v) {
                // Support S3 paths, CloudFront URLs, and external URLs
                const s3PathRegex = /^[a-zA-Z0-9\-_/]+\.(jpg|jpeg|png|gif|webp|avif)$/i;
                const fullUrlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)$/i;
                const s3UrlRegex = /^https:\/\/[a-z0-9.-]+\.s3\.[a-z0-9-]+\.amazonaws\.com\/.+$/i;
                const cloudFrontRegex = /^https:\/\/[a-zA-Z0-9.-]+\.cloudfront\.net\/.+$/i;
                return (s3PathRegex.test(v) ||
                    fullUrlRegex.test(v) ||
                    s3UrlRegex.test(v) ||
                    cloudFrontRegex.test(v));
            },
            message: "Invalid image URL or S3 path. Must be a valid URL or end with jpg, jpeg, png, gif, webp, or avif",
        },
    },
    alt: {
        type: String,
        required: [true, "Alt text is required for accessibility"],
        trim: true,
        maxlength: [150, "Alt text cannot exceed 150 characters"],
    },
    caption: {
        type: String,
        trim: true,
        maxlength: [200, "Caption cannot exceed 200 characters"],
    },
    isPrimary: { type: Boolean, default: false },
    // S3 specific fields for better tracking
    s3Key: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                // S3 key validation: should not start with / and should contain valid characters
                return (!v ||
                    (v.length > 0 &&
                        !v.startsWith("/") &&
                        /^[a-zA-Z0-9!_.*'()\/-]*$/.test(v)));
            },
            message: "Invalid S3 key format",
        },
    },
    bucket: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                // S3 bucket name validation
                return !v || /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(v);
            },
            message: "Invalid S3 bucket name format",
        },
    },
    // Processed format variants (thumbnails, WebP versions, etc.)
    processedFormats: {
        webp: { type: String }, // WebP optimized version
        thumbnail: { type: String }, // Thumbnail version (300x300)
        medium: { type: String }, // Medium size version (600x600)
        large: { type: String }, // Large size version (1200x1200)
        original: { type: String }, // Original uploaded file
    },
    // Image metadata
    width: {
        type: Number,
        min: [1, "Image width must be positive"],
    },
    height: {
        type: Number,
        min: [1, "Image height must be positive"],
    },
    size: {
        type: Number, // File size in bytes
        min: [0, "File size cannot be negative"],
    },
    format: {
        type: String,
        enum: {
            values: ["jpg", "jpeg", "png", "gif", "webp", "avif"],
            message: "Image format must be one of: jpg, jpeg, png, gif, webp, avif",
        },
        lowercase: true,
    },
    // Processing metadata
    isProcessed: {
        type: Boolean,
        default: false,
    },
    processingStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
    },
    compressionRatio: {
        type: Number,
        min: [0, "Compression ratio cannot be negative"],
    },
    // Upload tracking
    uploadMethod: {
        type: String,
        enum: ["direct", "presigned", "external_url", "form_upload"],
        default: "direct",
    },
    originalUrl: {
        type: String, // For tracking external URLs that were downloaded
        trim: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    processedAt: {
        type: Date,
    },
}, { _id: false });
/**
 * Base Address schema for consistent address handling
 * Used in User, Seller, and other location-based models
 * Uses GeoJSON Point structure for location coordinates
 *
 * Note: This is a base schema that can be extended by specific models
 * Models may need to add their own fields or override field names
 */
exports.BaseAddressSchema = new mongoose_1.Schema({
    street: {
        type: String,
        required: [true, "Street address is required"],
        trim: true,
        maxlength: [200, "Street address cannot exceed 200 characters"],
    },
    city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
        maxlength: [100, "City name cannot exceed 100 characters"],
    },
    state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
        maxlength: [100, "State name cannot exceed 100 characters"],
    },
    country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
        maxlength: [100, "Country name cannot exceed 100 characters"],
    },
    zipCode: {
        type: String,
        required: [true, "ZIP/Postal code is required"],
        trim: true,
        validate: {
            validator: function (v) {
                // Basic zip code validation (can be enhanced for specific countries)
                return /^[A-Za-z0-9\s\-]{3,10}$/.test(v);
            },
            message: "Invalid ZIP/Postal code format",
        },
    },
    // GeoJSON Point structure for location
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            validate: {
                validator: function (coords) {
                    return (coords.length === 2 &&
                        coords[0] >= -180 &&
                        coords[0] <= 180 && // longitude
                        coords[1] >= -90 &&
                        coords[1] <= 90); // latitude
                },
                message: "Invalid coordinates format. Must be [longitude, latitude]",
            },
        },
    },
    // Address type classification
    type: {
        type: String,
        enum: {
            values: [
                "home",
                "work",
                "billing",
                "shipping",
                "business",
                "pickup",
                "return",
                "other",
            ],
            message: "Address type must be one of: home, work, billing, shipping, business, pickup, return, other",
        },
        default: "home",
    },
    label: {
        type: String,
        trim: true,
        maxlength: [50, "Address label cannot exceed 50 characters"],
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
}, { _id: false });
/**
 * User Address schema - extends base with user-specific requirements
 * Uses postalCode instead of zipCode to match existing user model
 */
exports.UserAddressSchema = new mongoose_1.Schema({
    street: {
        type: String,
        required: [true, "Street address is required"],
        trim: true,
        maxlength: [200, "Street address cannot exceed 200 characters"],
    },
    city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
        maxlength: [100, "City name cannot exceed 100 characters"],
    },
    state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
        maxlength: [100, "State name cannot exceed 100 characters"],
    },
    country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
        maxlength: [100, "Country name cannot exceed 100 characters"],
    },
    postalCode: {
        type: String,
        required: [true, "Postal code is required"],
        trim: true,
        validate: {
            validator: function (v) {
                return /^[A-Za-z0-9\s\-]{3,10}$/.test(v);
            },
            message: "Invalid postal code format",
        },
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    label: {
        type: String,
        trim: true,
        enum: ["Home", "Work", "Other"],
        default: "Home",
    },
}, { _id: true });
/**
 * Seller Address schema - extends base with seller-specific requirements
 * Includes business address types and GeoJSON location
 */
exports.SellerAddressSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ["business", "pickup", "billing", "return"],
        required: [true, "Address type is required for seller addresses"],
    },
    label: {
        type: String,
        trim: true,
        maxlength: [50, "Address label cannot exceed 50 characters"],
    },
    firstLine: {
        type: String,
        required: [true, "First line of address is required"],
        trim: true,
        maxlength: [200, "Address line cannot exceed 200 characters"],
    },
    secondLine: {
        type: String,
        trim: true,
        maxlength: [200, "Address line cannot exceed 200 characters"],
    },
    city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
        maxlength: [100, "City name cannot exceed 100 characters"],
    },
    state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
        maxlength: [100, "State name cannot exceed 100 characters"],
    },
    country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
        maxlength: [100, "Country name cannot exceed 100 characters"],
    },
    postalCode: {
        type: String,
        required: [true, "Postal code is required"],
        trim: true,
        validate: {
            validator: function (v) {
                return /^[A-Za-z0-9\s\-]{3,10}$/.test(v);
            },
            message: "Invalid postal code format",
        },
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    // GeoJSON Point structure for location
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            validate: {
                validator: function (coords) {
                    return (coords.length === 2 &&
                        coords[0] >= -180 &&
                        coords[0] <= 180 && // longitude
                        coords[1] >= -90 &&
                        coords[1] <= 90); // latitude
                },
                message: "Invalid coordinates format. Must be [longitude, latitude]",
            },
        },
    },
}, { _id: true });
/**
 * Contact information schema
 * Used for consistent contact info across models
 */
exports.ContactSchema = new mongoose_1.Schema({
    phone: {
        type: String,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                // International phone number validation
                return /^\+?[1-9]\d{1,14}$/.test(v.replace(/[\s\-\(\)]/g, ""));
            },
            message: "Invalid phone number format",
        },
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: "Invalid email format",
        },
    },
    website: {
        type: String,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^https?:\/\/.+\..+/.test(v);
            },
            message: "Invalid website URL format",
        },
    },
    fax: {
        type: String,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^\+?[1-9]\d{1,14}$/.test(v.replace(/[\s\-\(\)]/g, ""));
            },
            message: "Invalid fax number format",
        },
    },
}, { _id: false });
/**
 * Enhanced social media links schema with platform-specific validation
 * Used for consistent social media handling across models
 */
exports.SocialMediaSchema = new mongoose_1.Schema({
    facebook: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^https?:\/\/(www\.)?facebook\.com\/.+/.test(v);
            },
            message: "Invalid Facebook URL format",
        },
    },
    twitter: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return (/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/.test(v) ||
                    /^@[A-Za-z0-9_]+$/.test(v));
            },
            message: "Invalid Twitter/X URL or handle format",
        },
    },
    instagram: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return (/^https?:\/\/(www\.)?instagram\.com\/.+/.test(v) ||
                    /^@[A-Za-z0-9_.]+$/.test(v));
            },
            message: "Invalid Instagram URL or handle format",
        },
    },
    linkedin: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^https?:\/\/(www\.)?linkedin\.com\/.+/.test(v);
            },
            message: "Invalid LinkedIn URL format",
        },
    },
    youtube: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^https?:\/\/(www\.)?youtube\.com\/.+/.test(v);
            },
            message: "Invalid YouTube URL format",
        },
    },
    tiktok: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return (/^https?:\/\/(www\.)?tiktok\.com\/.+/.test(v) ||
                    /^@[A-Za-z0-9_.]+$/.test(v));
            },
            message: "Invalid TikTok URL or handle format",
        },
    },
    website: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return /^https?:\/\/.+/.test(v);
            },
            message: "Invalid website URL format",
        },
    },
}, { _id: false });
/**
 * Price schema for consistent pricing across models
 * Used in Product, Variation, and other price-related models
 */
exports.PriceSchema = new mongoose_1.Schema({
    amount: {
        type: Number,
        required: [true, "Price amount is required"],
        min: [0, "Price cannot be negative"],
    },
    currency: {
        type: String,
        required: [true, "Currency is required"],
        enum: {
            values: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"],
            message: "Currency must be one of: USD, EUR, GBP, JPY, CAD, AUD, INR",
        },
        default: "USD",
    },
    // For historical price tracking
    validFrom: {
        type: Date,
        default: Date.now,
    },
    validTo: {
        type: Date,
    },
}, { _id: false });
/**
 * Dimensions schema for physical products
 * Used in Product, Variation, and shipping calculations
 */
exports.DimensionsSchema = new mongoose_1.Schema({
    length: {
        type: Number,
        required: [true, "Length is required"],
        min: [0, "Length cannot be negative"],
    },
    width: {
        type: Number,
        required: [true, "Width is required"],
        min: [0, "Width cannot be negative"],
    },
    height: {
        type: Number,
        required: [true, "Height is required"],
        min: [0, "Height cannot be negative"],
    },
    unit: {
        type: String,
        enum: {
            values: ["mm", "cm", "m", "in", "ft"],
            message: "Unit must be one of: mm, cm, m, in, ft",
        },
        default: "cm",
    },
    // Calculated field
    volume: {
        type: Number,
        // This would be calculated automatically
    },
}, { _id: false });
