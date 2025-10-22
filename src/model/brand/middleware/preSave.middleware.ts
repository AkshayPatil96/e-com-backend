import { IBrand } from "../../../@types/brand.type";
import { convertToSlug } from "../../../utils/logic";

/**
 * Pre-save middleware for slug generation and SEO fields
 */
export const preSaveMiddleware = function (this: IBrand, next: () => void) {
  // Generate slug from name
  if (this.isModified("name")) {
    this.slug = convertToSlug(this.name);
  }

  // Auto-generate SEO fields if not provided
  if (!this.seo.metaTitle) {
    this.seo.metaTitle = this.name;
  }

  if (!this.seo.metaDescription && this.description) {
    this.seo.metaDescription = this.description.substring(0, 160);
  }

  next();
};
