"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const validator_1 = __importDefault(require("validator"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = __importDefault(require("../config/index"));
/**
 * Recent item schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const RecentItemSchema = new mongoose_1.Schema({
    recentlySearchedProducts: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Product" }],
    recentlyViewedProducts: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Product" }],
}, { _id: false });
/**
 * User schema definition with fields and their validation.
 * Each field has a defined data type and certain constraints.
 */
const userSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: validator_1.default.default.isEmail,
    },
    firstName: {
        type: String,
        required: true,
        set: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    lastName: {
        type: String,
        required: true,
        set: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    gender: { type: String, enum: ["male", "female"] },
    dob: { type: Date },
    addresses: [
        {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            country: { type: String, required: true },
            postalCode: { type: String, required: true },
            isDefault: { type: Boolean, default: false }, // Default address flag
        },
    ],
    phone: { type: String },
    alternatePhone: { type: String },
    loginType: {
        type: String,
        enum: ["email", "google", "facebook"],
        default: "email",
    }, // Login type
    role: {
        type: String,
        enum: ["user", "admin", "super admin", "seller", "delivery"],
        default: "user",
    }, // Role management
    otp: { type: String, select: false }, // OTP for email verification
    otpExpiresAt: { type: Date, select: false }, // Expiration time for OTP
    isEmailVerified: { type: Boolean, default: false }, // Email verification status
    recentItems: RecentItemSchema, // Recent items for the user
    isDeleted: { type: Boolean, default: false }, // Soft delete flag
});
userSchema.virtual("name").get(function () {
    return `${this.firstName} ${this.lastName}`;
});
userSchema.virtual("age").get(function () {
    if (!this.dob) {
        return undefined;
    }
    const diff = Date.now() - this.dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
});
/**
 * Middleware to hash the password before saving the user document.
 */
// hash password before saving user
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    this.password = await bcryptjs_1.default.hash(this.password, 10);
    next();
});
/**
 * Method to compare the entered password with the hashed password in the database.
 * It returns a boolean value indicating whether the passwords match.
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcryptjs_1.default.compare(enteredPassword, this.password);
};
/**
 * Method to sign the access token for the user.
 * It returns a JWT access token string.
 */
userSchema.methods.signAccessToken = function () {
    return jsonwebtoken_1.default.sign({ id: this._id }, index_1.default.JWT_ACCESS_SECRET, {
        expiresIn: index_1.default.JWT_EXPIRES_IN,
    });
};
/**
 * Method to sign the refresh token for the user.
 * It returns a JWT refresh token string.
 */
userSchema.methods.signRefreshToken = function () {
    return jsonwebtoken_1.default.sign({ id: this._id }, index_1.default.JWT_REFRESH_SECRET, {
        expiresIn: index_1.default.JWT_REFRESH_EXPIRES_IN,
    });
};
/**
 * User model for interacting with the user collection in MongoDB.
 * It allows CRUD operations on user documents.
 */
const User = (0, mongoose_1.model)("User", userSchema);
exports.default = User;
