import { NextFunction, Request, Response } from "express";
import validator from "validator";
import ErrorHandler from "../utils/ErrorHandler";

/**
 * Input sanitization middleware for security
 */
export class InputSanitizer {
  /**
   * Light sanitization for trusted content (admin-created)
   */
  static sanitizeTrustedContent(input: string): string {
    if (typeof input !== "string") return input;

    // Only remove truly dangerous content, preserve formatting and normal text
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove scripts
      .replace(/javascript:/gi, "") // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .replace(/data:text\/html/gi, ""); // Remove data URLs

    // Basic cleanup only
    return sanitized.trim();
  }

  /**
   * Medium sanitization for seller content (moderate trust)
   */
  static sanitizeSellerContent(input: string): string {
    if (typeof input !== "string") return input;

    // Remove dangerous content but allow some basic HTML formatting
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove scripts
      .replace(/<iframe[^>]*>[^<]*<\/iframe>/gi, "") // Remove iframes
      .replace(/<object[^>]*>[^<]*<\/object>/gi, "") // Remove objects
      .replace(/<embed[^>]*>/gi, "") // Remove embeds
      .replace(/javascript:/gi, "") // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .replace(/data:text\/html/gi, "") // Remove data URLs
      .replace(/<form[^>]*>[^<]*<\/form>/gi, ""); // Remove forms

    // Allow basic formatting but encode critical entities
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // Note: Keep quotes and apostrophes for product names like "Men's Shoes"

    // Normalize whitespace
    return sanitized.trim().replace(/\s+/g, " ");
  }

  /**
   * Standard sanitization for user content
   */
  static sanitizeString(input: string): string {
    if (typeof input !== "string") return input;

    // Basic XSS prevention - remove HTML tags and encode special characters
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");

    // Encode HTML entities
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

    // Normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    return sanitized;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== "string") return email;

    const sanitized = email.toLowerCase().trim();

    if (!validator.isEmail(sanitized)) {
      throw ErrorHandler.validation("Invalid email format");
    }

    return sanitized;
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== "string") return phone;

    // Remove all non-numeric characters except + and spaces
    let sanitized = phone.replace(/[^\d+\s-()]/g, "");

    if (!validator.isMobilePhone(sanitized, "any")) {
      throw ErrorHandler.validation("Invalid phone number format");
    }

    return sanitized;
  }

  /**
   * Validate and sanitize password
   */
  static validatePassword(password: string): string {
    if (!password || typeof password !== "string") {
      throw ErrorHandler.validation("Password is required");
    }

    if (password.length < 8) {
      throw ErrorHandler.validation(
        "Password must be at least 8 characters long",
      );
    }

    if (password.length > 128) {
      throw ErrorHandler.validation(
        "Password must be less than 128 characters",
      );
    }

    // Check for at least one uppercase, lowercase, number, and special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!(hasUppercase && hasLowercase && hasNumbers && hasSpecialChar)) {
      throw ErrorHandler.validation(
        "Password must contain at least one uppercase letter, lowercase letter, number, and special character",
      );
    }

    return password;
  }

  /**
   * Context-aware object sanitization
   */
  static sanitizeObject(
    obj: any,
    context: "admin" | "seller" | "user" | "public" = "user",
  ): any {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, context));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        // Skip password fields completely
        if (key.toLowerCase().includes("password")) {
          sanitized[key] = value;
        }
        // Special handling for email and phone
        else if (key.toLowerCase().includes("email")) {
          sanitized[key] = this.sanitizeEmail(value);
        } else if (key.toLowerCase().includes("phone")) {
          sanitized[key] = this.sanitizePhone(value);
        }
        // Context-aware sanitization for text fields
        else {
          switch (context) {
            case "admin":
              // Admin context: light sanitization for names, descriptions, etc.
              sanitized[key] = this.sanitizeTrustedContent(value);
              break;
            case "seller":
              // Seller context: medium sanitization for product info, descriptions
              sanitized[key] = this.sanitizeSellerContent(value);
              break;
            case "user":
            case "public":
            default:
              // User/public context: full sanitization
              sanitized[key] = this.sanitizeString(value);
              break;
          }
        }
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeObject(value, context);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Enhanced middleware with context detection
   */
  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Determine context based on route
        let context: "admin" | "seller" | "user" | "public" = "public";

        if (req.path.includes("/admin/")) {
          context = "admin";
        } else if (req.path.includes("/seller/")) {
          context = "seller";
        } else if (req.path.includes("/auth/") || req.path.includes("/user/")) {
          context = "user";
        } else {
          context = "public";
        }

        // Apply context-aware sanitization
        if (req.body && typeof req.body === "object") {
          req.body = InputSanitizer.sanitizeObject(req.body, context);
        }

        if (req.query && typeof req.query === "object") {
          // Query parameters use the same context
          req.query = InputSanitizer.sanitizeObject(req.query, context);
        }

        if (req.params && typeof req.params === "object") {
          // URL parameters use the same context
          req.params = InputSanitizer.sanitizeObject(req.params, context);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

export default InputSanitizer.middleware;
