# Common Schemas Documentation

## Overview
The `/model/schema/common.model.ts` file provides reusable Mongoose schemas that ensure consistency across the entire e-commerce platform. These schemas eliminate code duplication and maintain standardized data structures.

## Available Schemas

### 🖼️ **ImageSchema**
Enhanced image schema with comprehensive metadata and validation.

**Fields:**
- `url` (required): Valid image URL with format validation
- `alt` (required): Alt text for accessibility (max 150 chars)
- `caption` (optional): Image caption (max 200 chars)
- `isPrimary` (boolean): Primary image flag
- `width` (number): Image width in pixels
- `height` (number): Image height in pixels
- `size` (number): File size in bytes
- `format` (enum): Image format (jpg, jpeg, png, gif, webp)

**Usage:**
```typescript
import { ImageSchema } from '../schema/common.model';

// In your model
profileImage: ImageSchema,
gallery: [ImageSchema]
```

### 🔍 **metaDataSchema**
Enhanced SEO metadata schema with validation and modern SEO fields.

**Fields:**
- `title` (string): Meta title (max 60 chars)
- `description` (string): Meta description (max 160 chars)
- `keywords` (array): SEO keywords (max 10)
- `images` (array): Social media images
- `canonicalUrl` (string): Canonical URL
- `robots` (enum): Robot indexing instructions
- `ogType` (enum): OpenGraph type

**Usage:**
```typescript
import { metaDataSchema } from '../schema/common.model';

// In your model
seo: metaDataSchema
```

### 📍 **AddressSchema**
Standardized address schema with international support and coordinates.

**Fields:**
- `street` (required): Street address (max 200 chars)
- `city` (required): City name (max 100 chars)
- `state` (required): State/province (max 100 chars)
- `country` (required): Country name (max 100 chars)
- `zipCode` (required): ZIP/postal code with validation
- `coordinates` (object): Latitude/longitude
- `type` (enum): Address type (home, work, billing, shipping, other)
- `isDefault` (boolean): Default address flag

**Usage:**
```typescript
import { AddressSchema } from '../schema/common.model';

// In your model
shippingAddress: AddressSchema,
addresses: [AddressSchema]
```

### 📞 **ContactSchema**
Contact information schema with international validation.

**Fields:**
- `phone` (string): International phone number
- `email` (string): Email with validation
- `website` (string): Website URL
- `fax` (string): Fax number

**Usage:**
```typescript
import { ContactSchema } from '../schema/common.model';

// In your model
contact: ContactSchema
```

### 📱 **SocialMediaSchema**
Social media links schema with platform-specific validation.

**Fields:**
- `facebook` (string): Facebook URL
- `twitter` (string): Twitter URL or handle
- `instagram` (string): Instagram URL or handle
- `linkedin` (string): LinkedIn URL
- `youtube` (string): YouTube URL
- `tiktok` (string): TikTok URL or handle

**Usage:**
```typescript
import { SocialMediaSchema } from '../schema/common.model';

// In your model
socialMedia: SocialMediaSchema
```

### 💰 **PriceSchema**
Price schema with currency support and date ranges.

**Fields:**
- `amount` (required): Price amount (non-negative)
- `currency` (required): Currency code (USD, EUR, GBP, etc.)
- `validFrom` (date): Price effective date
- `validTo` (date): Price expiration date

**Usage:**
```typescript
import { PriceSchema } from '../schema/common.model';

// In your model
price: PriceSchema,
priceHistory: [PriceSchema]
```

### 📏 **DimensionsSchema**
Physical dimensions schema for products and shipping.

**Fields:**
- `length` (required): Length (non-negative)
- `width` (required): Width (non-negative)
- `height` (required): Height (non-negative)
- `unit` (required): Unit of measurement (mm, cm, m, in, ft)
- `volume` (calculated): Calculated volume

**Usage:**
```typescript
import { DimensionsSchema } from '../schema/common.model';

// In your model
dimensions: DimensionsSchema
```

## Key Features

### ✅ **Validation**
- Comprehensive field validation
- International standards support
- Business rule enforcement
- Data integrity checks

### ✅ **Accessibility**
- Required alt text for images
- SEO optimization ready
- Screen reader compatibility

### ✅ **Internationalization**
- Multi-currency support
- International phone numbers
- Global address formats
- Multiple measurement units

### ✅ **TypeScript Support**
- Full type safety
- IntelliSense support
- Interface definitions
- Compile-time checking

## Current Usage

The common schemas are actively used across:

- **Brand Model**: ImageSchema (logo, banner, images)
- **User Model**: ImageSchema (profileImage)
- **Product Model**: ImageSchema, metaDataSchema
- **Review Model**: ImageSchema
- **Seller Model**: metaDataSchema

## Best Practices

1. **Import Only What You Need**
   ```typescript
   import { ImageSchema, AddressSchema } from '../schema/common.model';
   ```

2. **Use TypeScript Interfaces**
   ```typescript
   import { IImage, IAddress } from '../../@types/common.type';
   ```

3. **Validate Before Save**
   ```typescript
   // Schemas include built-in validation
   const user = new User({
     profileImage: {
       url: 'https://example.com/image.jpg',
       alt: 'User profile picture'
     }
   });
   ```

4. **Handle Validation Errors**
   ```typescript
   try {
     await user.save();
   } catch (error) {
     if (error.name === 'ValidationError') {
       // Handle specific validation errors
     }
   }
   ```

## Version History

- **v2.0.0**: Enhanced schemas with validation, new common schemas added
- **v1.0.0**: Basic ImageSchema and metaDataSchema

## Migration Guide

If upgrading from v1.0.0:
1. Update imports to include new schemas
2. Update TypeScript interfaces
3. Test validation rules
4. Update existing data if needed

---

*This documentation is maintained by the development team. For questions or suggestions, please create an issue.*