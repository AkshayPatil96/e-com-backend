"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../../config"));
const catchAsyncErrors_1 = require("../../middleware/catchAsyncErrors");
const user_model_1 = __importDefault(require("../../model/user.model"));
const server_1 = require("../../server");
const ErrorHandler_1 = __importStar(require("../../utils/ErrorHandler"));
const jwt_1 = require("../../utils/jwt");
const logger_1 = require("../../utils/logger");
const sendMail_1 = __importDefault(require("../../utils/sendMail"));
const authController = {
    createAdminAccount: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { email, phone, firstName, lastName, password: reqPassword, } = req.body;
        const creator = req.user;
        // Only superadmin or admin with permission can create admin accounts
        if (!creator ||
            (creator.role !== "superadmin" &&
                !(creator.role === "admin" && creator.permissions?.admins?.canCreate))) {
            return next(ErrorHandler_1.default.authorization("Not authorized to create admin accounts"));
        }
        // Validate required fields
        if (!email || !firstName || !lastName) {
            const missingFields = [];
            if (!email)
                missingFields.push("email");
            if (!firstName)
                missingFields.push("firstName");
            if (!lastName)
                missingFields.push("lastName");
            return next(ErrorHandler_1.default.validation("Required fields are missing", {
                missingFields,
            }));
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return next(ErrorHandler_1.default.validation("Please provide a valid email address", {
                field: "email",
                value: email,
            }));
        }
        // Password: use provided or generate random
        let password = reqPassword;
        if (!password) {
            password =
                Math.random().toString(36).slice(-10) +
                    Math.random().toString(36).slice(-2);
        }
        if (password.length < 6) {
            return next(ErrorHandler_1.default.validation("Password must be at least 6 characters long", {
                field: "password",
                minLength: 6,
            }));
        }
        // Check for existing user
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser) {
            return next(ErrorHandler_1.default.validation("User with this email already exists", {
                field: "email",
                value: email,
            }));
        }
        // Create admin user with default empty permissions (superadmin will grant permissions)
        const adminUser = await user_model_1.default.create({
            email,
            firstName,
            lastName,
            password,
            phone: phone || undefined,
            username: email.split("@")[0],
            emailVerified: true,
            loginType: "email",
            role: "admin",
            status: "active",
            addresses: [],
            recentItems: {
                recentlyViewedProducts: [],
                recentlySearchedProducts: [],
                recentCategories: [],
                recentBrands: [],
                recentSearches: [],
            },
            lastLogin: null,
            isTempPassword: true,
            permissions: {
                brands: {
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canView: false,
                },
                categories: {
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canView: false,
                },
                products: {
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canView: false,
                    canApprove: false,
                },
                users: {
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canView: false,
                    canBan: false,
                },
                orders: {
                    canView: false,
                    canEdit: false,
                    canCancel: false,
                    canRefund: false,
                },
                admins: {
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canView: false,
                    canManagePermissions: false,
                },
                reports: { canView: false, canExport: false },
            },
        });
        // Send email with account details
        const loginUrl = `${config_1.default.FRONTEND_URL}/auth/login`;
        await (0, sendMail_1.default)({
            email,
            subject: "Your Admin Account Details",
            template: "admin-account-details.ejs",
            data: {
                user: { name: `${firstName} ${lastName}`, email },
                password,
                loginUrl,
                note: "Your account has been created with no permissions. Contact the superadmin to get necessary permissions assigned.",
            },
        });
        logger_1.loggerHelpers.auth("admin_account_created", adminUser._id.toString(), {
            email: adminUser.email,
            createdBy: creator._id?.toString(),
            ip: req.ip,
        });
        res.status(201).json({
            success: true,
            message: "Admin account created with default permissions (no access). Contact superadmin to assign permissions.",
            data: {
                adminId: adminUser._id,
                email,
                tempPassword: password,
                hasPermissions: false,
                note: "Admin created with no permissions. Superadmin must grant specific permissions for this admin to access resources.",
            },
        });
    }),
    signup: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { email, phone, firstName, lastName, password } = req.body;
        // Log business event
        logger_1.loggerHelpers.business("user_registration_attempt", {
            email: email?.substring(0, 3) + "***",
            phone: phone?.substring(0, 3) + "***",
        });
        // Validation for required fields
        if (!email || !firstName || !lastName || !password) {
            const missingFields = [];
            if (!email)
                missingFields.push("email");
            if (!firstName)
                missingFields.push("firstName");
            if (!lastName)
                missingFields.push("lastName");
            if (!password)
                missingFields.push("password");
            return next(ErrorHandler_1.default.validation("Required fields are missing", {
                missingFields,
                requiredFields: ["email", "firstName", "lastName", "password"],
            }));
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return next(ErrorHandler_1.default.validation("Please provide a valid email address", {
                field: "email",
                value: email?.substring(0, 3) + "***",
                code: "INVALID_EMAIL_FORMAT",
            }));
        }
        // Password validation
        if (password.length < 6) {
            return next(ErrorHandler_1.default.validation("Password must be at least 6 characters long", {
                field: "password",
                minLength: 6,
                provided: password.length,
            }));
        }
        // Basic phone validation (if provided)
        if (phone) {
            const phoneRegex = /^\+?[\d\s-()]{10,15}$/;
            if (!phoneRegex.test(phone)) {
                return next(ErrorHandler_1.default.validation("Please provide a valid phone number", {
                    field: "phone",
                    value: phone?.substring(0, 3) + "***",
                    code: "INVALID_PHONE_FORMAT",
                }));
            }
        }
        // Check for existing email or phone
        const existingUser = await user_model_1.default.findOne({
            $or: [{ email }, ...(phone ? [{ phone }] : [])],
        });
        if (existingUser) {
            const field = existingUser.email === email ? "email" : "phone";
            // Log security event for duplicate registration attempts
            logger_1.loggerHelpers.security("duplicate_registration_attempt", "MEDIUM", {
                email: email?.substring(0, 3) + "***",
                phone: phone?.substring(0, 3) + "***",
                field,
                ip: req.ip,
            });
            // Use enhanced error handler with category
            return next(ErrorHandler_1.default.validation(`User with this ${field} already exists`, {
                field,
                value: field === "email"
                    ? email?.substring(0, 3) + "***"
                    : phone?.substring(0, 3) + "***",
                code: "DUPLICATE_USER",
            }));
        }
        try {
            // Create simplified user data for activation token with defaults
            const userData = {
                email,
                firstName,
                lastName,
                password,
                phone: phone || undefined,
                username: email.split("@")[0], // Generate username from email
                emailVerified: false,
                loginType: "email",
                role: "user",
                status: "pending",
                // Add other required fields with sensible defaults
                addresses: [],
                recentItems: {
                    recentlyViewedProducts: [],
                    recentlySearchedProducts: [],
                    recentCategories: [],
                    recentBrands: [],
                    recentSearches: [],
                },
            };
            const activationToken = await (0, jwt_1.createActivationToken)(userData);
            const activationCode = activationToken.activationCode;
            let data = {
                user: { name: `${firstName} ${lastName}` },
                activationCode,
            };
            // Log email sending attempt
            logger_1.loggerHelpers.business("activation_email_sent", {
                email: email?.substring(0, 3) + "***",
                userId: null,
            });
            await (0, sendMail_1.default)({
                email: email,
                subject: "Welcome! Activate Your Account",
                template: "activation-mail.ejs",
                data,
            });
            res.status(201).json({
                success: true,
                message: "Account created successfully! Please check your email to activate your account.",
                activationToken: activationToken.token,
                data: {
                    email: email?.substring(0, 3) + "***",
                    name: `${firstName} ${lastName}`,
                },
            });
        }
        catch (error) {
            // Log email sending failure
            logger_1.loggerHelpers.security("email_sending_failed", "HIGH", {
                email: email?.substring(0, 3) + "***",
                error: error.message,
            });
            return next(new ErrorHandler_1.default(500, "Failed to send activation email. Please try again.", {
                category: ErrorHandler_1.ErrorCategory.SYSTEM,
                severity: ErrorHandler_1.ErrorSeverity.HIGH,
                context: {
                    originalError: error.message,
                    email: email?.substring(0, 3) + "***",
                },
            }));
        }
    }),
    activateUserAccount: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { activationCode, activationToken } = req.body;
        // Log business event
        logger_1.loggerHelpers.business("user_activation_attempt", {
            activationCode: "***",
        });
        if (!activationCode || !activationToken) {
            const missingFields = [];
            if (!activationCode)
                missingFields.push("activationCode");
            if (!activationToken)
                missingFields.push("activationToken");
            return next(ErrorHandler_1.default.validation("Activation code and token are required", {
                missingFields,
            }));
        }
        try {
            const newUser = await (0, jwt_1.verifyActivationToken)(activationToken);
            if (newUser.activationCode !== activationCode) {
                // Log security event for invalid activation attempt
                logger_1.loggerHelpers.security("invalid_activation_code", "MEDIUM", {
                    ip: req.ip,
                    providedCode: activationCode,
                });
                return next(ErrorHandler_1.default.authentication("Invalid activation code"));
            }
            const { email } = newUser.user;
            const existingUser = await user_model_1.default.findOne({ email });
            if (existingUser) {
                // Log security event for duplicate activation
                logger_1.loggerHelpers.security("duplicate_activation_attempt", "MEDIUM", {
                    email,
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.validation("Email already exists", {
                    field: "email",
                    value: email,
                    code: "EMAIL_ALREADY_EXISTS",
                }));
            }
            if (!newUser?.user?.username) {
                newUser.user.username = email.split("@")[0];
            }
            // Create user with simplified data - they can complete profile later
            const createdUser = await user_model_1.default.create({
                email: newUser.user.email,
                firstName: newUser.user.firstName,
                lastName: newUser.user.lastName,
                password: newUser.user.password,
                phone: newUser.user.phone,
                username: newUser.user.username,
                emailVerified: true, // Set email as verified after activation
                loginType: "email",
                role: "user",
                status: "active",
                lastLogin: new Date(), // Set first login time
                // Initialize with empty arrays/objects - user can fill these later
                addresses: [],
                recentItems: {
                    recentlyViewedProducts: [],
                    recentlySearchedProducts: [],
                    recentCategories: [],
                    recentBrands: [],
                    recentSearches: [],
                },
            });
            // Log successful activation
            logger_1.loggerHelpers.auth("user_activated_and_logged_in", createdUser._id.toString(), {
                email: createdUser.email,
                username: createdUser.username,
                autoLogin: true,
                ip: req.ip,
            });
            // 🚀 AUTOMATICALLY LOG IN USER AFTER ACTIVATION
            // Use sendToken to automatically log them in (same as login method)
            await (0, jwt_1.sendToken)(createdUser, 201, res);
        }
        catch (error) {
            // Log system error
            logger_1.loggerHelpers.security("activation_token_error", "HIGH", {
                error: error.message,
                ip: req.ip,
            });
            return next(new ErrorHandler_1.default(400, "Invalid or expired activation token", {
                category: ErrorHandler_1.ErrorCategory.AUTHENTICATION,
                severity: ErrorHandler_1.ErrorSeverity.MEDIUM,
                context: {
                    originalError: error.message,
                },
            }));
        }
    }),
    loginUser: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { email, password } = req.body;
        // Log login attempt
        logger_1.loggerHelpers.business("user_login_attempt", {
            email: email?.substring(0, 3) + "***", // Partially hide email for privacy
            ip: req.ip,
        });
        // Validation
        if (!email || !password) {
            const missingFields = [];
            if (!email)
                missingFields.push("email");
            if (!password)
                missingFields.push("password");
            logger_1.loggerHelpers.security("login_missing_credentials", "LOW", {
                missingFields,
                ip: req.ip,
            });
            return next(ErrorHandler_1.default.validation("Please enter email and password", {
                missingFields,
            }));
        }
        try {
            // Use findActiveOne to ensure user is active and not deleted
            const user = await user_model_1.default.findActiveOne({
                $or: [{ email: email }, { username: email }],
            }).select("+password");
            if (!user) {
                // Log failed login attempt
                logger_1.loggerHelpers.security("login_invalid_user", "MEDIUM", {
                    email: email?.substring(0, 3) + "***",
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.authentication("Invalid email or password"));
            }
            const isPasswordMatched = await user.comparePassword(password);
            if (!isPasswordMatched) {
                // Log password mismatch
                logger_1.loggerHelpers.security("login_invalid_password", "MEDIUM", {
                    userId: user._id.toString(),
                    email: email?.substring(0, 3) + "***",
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.authentication("Invalid email or password"));
            }
            // Check if email is verified
            if (!user.emailVerified) {
                logger_1.loggerHelpers.security("login_unverified_email", "MEDIUM", {
                    userId: user._id.toString(),
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.authentication("Please verify your email before logging in"));
            }
            // Check account status
            if (user.status !== "active") {
                const statusMessages = {
                    inactive: "Account is inactive. Please contact support.",
                    hold: "Account is on hold. Please contact support.",
                    blocked: "Account has been blocked. Please contact support.",
                    suspended: "Account is suspended. Please contact support.",
                    pending: "Account is pending approval.",
                };
                logger_1.loggerHelpers.security("login_account_status_denied", "HIGH", {
                    userId: user._id.toString(),
                    status: user.status,
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.authorization(statusMessages[user.status] ||
                    "Account access denied"));
            }
            // Update last login
            user.lastLogin = new Date();
            await user.save();
            // Log successful login
            logger_1.loggerHelpers.auth("user_login_success", user._id.toString(), {
                email: user.email,
                ip: req.ip,
                lastLogin: user.lastLogin,
            });
            await (0, jwt_1.sendToken)(user, 200, res);
        }
        catch (error) {
            logger_1.loggerHelpers.security("login_system_error", "HIGH", {
                error: error.message,
                ip: req.ip,
            });
            return next(new ErrorHandler_1.default(500, "Login failed due to system error", {
                category: ErrorHandler_1.ErrorCategory.SYSTEM,
                severity: ErrorHandler_1.ErrorSeverity.HIGH,
                context: {
                    originalError: error.message,
                },
            }));
        }
    }),
    logoutUser: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        try {
            const userId = req.user._id.toString();
            // Log logout attempt
            logger_1.loggerHelpers.auth("user_logout_attempt", userId, {
                ip: req.ip,
            });
            // Remove session from redis
            if (server_1.redis) {
                await server_1.redis.del(userId);
            }
            // Clear cookies
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            // Log successful logout
            logger_1.loggerHelpers.auth("user_logout_success", userId, {
                ip: req.ip,
            });
            res.status(200).json({
                success: true,
                message: "Logged out successfully",
            });
        }
        catch (error) {
            logger_1.loggerHelpers.security("logout_error", "MEDIUM", {
                userId: req.user?._id?.toString(),
                error: error.message,
                ip: req.ip,
            });
            // Still clear cookies even if Redis fails
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            res.status(200).json({
                success: true,
                message: "Logged out successfully",
            });
        }
    }),
    updateRefreshToken: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        // Check for refresh token in cookies first, then headers
        let refreshToken = req.cookies.refreshToken;
        // If no cookie, check Authorization header for refresh token
        if (!refreshToken) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                refreshToken = authHeader.substring(7);
            }
        }
        // Log refresh attempt
        logger_1.loggerHelpers.auth("token_refresh_attempt", undefined, {
            hasToken: !!refreshToken,
            method: refreshToken === req.cookies.refreshToken ? "cookie" : "header",
            ip: req.ip,
            userAgent: req.get("User-Agent"),
        });
        if (!refreshToken) {
            logger_1.loggerHelpers.security("refresh_token_missing", "MEDIUM", {
                ip: req.ip,
                userAgent: req.get("User-Agent"),
            });
            return next(ErrorHandler_1.default.authentication("Refresh token not found. Please login again"));
        }
        try {
            const decoded = await (0, jwt_1.verifyRefreshToken)(refreshToken);
            if (!decoded) {
                logger_1.loggerHelpers.security("invalid_refresh_token", "HIGH", {
                    ip: req.ip,
                    tokenHint: refreshToken.substring(0, 10) + "***",
                });
                return next(ErrorHandler_1.default.authentication("Invalid refresh token. Please login again"));
            }
            const session = await server_1.redis.get(decoded.id);
            if (!session) {
                logger_1.loggerHelpers.security("refresh_session_not_found", "HIGH", {
                    userId: decoded.id,
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.authentication("User session not found. Please login again"));
            }
            const sessionUser = JSON.parse(session);
            // Validate session user status
            if (sessionUser.isDeleted || sessionUser.status !== "active") {
                logger_1.loggerHelpers.security("refresh_invalid_session", "HIGH", {
                    userId: decoded.id,
                    status: sessionUser.status,
                    isDeleted: sessionUser.isDeleted,
                    ip: req.ip,
                });
                // Clear invalid session
                server_1.redis.del(decoded.id);
                res.clearCookie("accessToken");
                res.clearCookie("refreshToken");
                return next(ErrorHandler_1.default.authorization("Account is not active. Please login again"));
            }
            // Get fresh user data to ensure current status
            const user = await user_model_1.default.findActiveOne({ _id: decoded.id });
            if (!user) {
                logger_1.loggerHelpers.security("refresh_user_not_found", "HIGH", {
                    userId: decoded.id,
                    ip: req.ip,
                });
                // Clear invalid session
                server_1.redis.del(decoded.id);
                res.clearCookie("accessToken");
                res.clearCookie("refreshToken");
                return next(ErrorHandler_1.default.authentication("User not found. Please login again"));
            }
            // Double-check user status from database
            if (user.status !== "active" || user.isDeleted) {
                logger_1.loggerHelpers.security("refresh_user_status_changed", "HIGH", {
                    userId: user._id.toString(),
                    status: user.status,
                    isDeleted: user.isDeleted,
                    ip: req.ip,
                });
                // Clear session and cookies
                server_1.redis.del(decoded.id);
                res.clearCookie("accessToken");
                res.clearCookie("refreshToken");
                return next(ErrorHandler_1.default.authorization("Account status has changed. Please login again"));
            }
            // Update last refresh time for session tracking
            user.lastLogin = user.lastLogin || new Date(); // Keep original login time
            // Log successful token refresh
            logger_1.loggerHelpers.auth("token_refresh_success", user._id.toString(), {
                ip: req.ip,
                userAgent: req.get("User-Agent"),
            });
            // 🚀 USE sendToken - same as login method!
            await (0, jwt_1.sendToken)(user, 200, res);
        }
        catch (error) {
            logger_1.loggerHelpers.security("token_refresh_error", "HIGH", {
                error: error.message,
                ip: req.ip,
                userAgent: req.get("User-Agent"),
            });
            // Clear potentially invalid cookies
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return next(ErrorHandler_1.default.authentication("Token refresh failed. Please login again"));
        }
    }),
    forgetPassword: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { email } = req.body;
        // Log password reset attempt
        logger_1.loggerHelpers.business("password_reset_attempt", {
            email: email?.substring(0, 3) + "***",
            ip: req.ip,
        });
        if (!email) {
            return next(ErrorHandler_1.default.validation("Email is required", {
                field: "email",
                code: "MISSING_EMAIL",
            }));
        }
        try {
            // Use findActiveOne to ensure user is active
            const user = await user_model_1.default.findActiveOne({ email });
            if (!user) {
                // Log failed password reset attempt
                logger_1.loggerHelpers.security("password_reset_invalid_email", "MEDIUM", {
                    email: email?.substring(0, 3) + "***",
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.notFound("User not found with this email"));
            }
            const resetToken = crypto_1.default.randomBytes(20).toString("hex");
            let resetPasswordToken = crypto_1.default
                .createHash("sha256")
                .update(resetToken)
                .digest("hex");
            user.resetPasswordToken = resetPasswordToken;
            user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            await user.save({ validateBeforeSave: false });
            const resetUrl = `${config_1.default.FRONTEND_URL}/auth/reset-password/${resetToken}`;
            console.log("resetUrl: ", resetUrl);
            const message = {
                email: user.email,
                subject: "Password Reset Token",
                template: "forgot-token.ejs",
                data: { user: { name: user.name }, resetUrl },
            };
            try {
                await (0, sendMail_1.default)(message);
                // Log successful password reset email sent
                logger_1.loggerHelpers.business("password_reset_email_sent", {
                    userId: user._id.toString(),
                    email: email?.substring(0, 3) + "***",
                });
                res.status(200).json({
                    success: true,
                    message: `Password reset email sent to: ${user.email}`,
                });
            }
            catch (emailError) {
                // Reset the token fields if email fails
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                await user.save({ validateBeforeSave: false });
                // Log email sending failure
                logger_1.loggerHelpers.security("password_reset_email_failed", "HIGH", {
                    userId: user._id.toString(),
                    error: emailError.message,
                    ip: req.ip,
                });
                return next(new ErrorHandler_1.default(500, "Email could not be sent", {
                    category: ErrorHandler_1.ErrorCategory.EXTERNAL_SERVICE,
                    severity: ErrorHandler_1.ErrorSeverity.HIGH,
                    context: {
                        originalError: emailError.message,
                        email: user.email,
                    },
                }));
            }
        }
        catch (error) {
            logger_1.loggerHelpers.security("password_reset_system_error", "HIGH", {
                error: error.message,
                ip: req.ip,
            });
            return next(new ErrorHandler_1.default(500, "Password reset failed due to system error", {
                category: ErrorHandler_1.ErrorCategory.SYSTEM,
                severity: ErrorHandler_1.ErrorSeverity.HIGH,
                context: {
                    originalError: error.message,
                },
            }));
        }
    }),
    resetPassword: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { resetToken } = req.params;
        const { password, confirmPassword } = req.body;
        // Log password reset attempt
        logger_1.loggerHelpers.business("password_reset_execution_attempt", {
            resetToken: resetToken?.substring(0, 6) + "***",
            ip: req.ip,
        });
        // Validation
        if (!password || !confirmPassword) {
            const missingFields = [];
            if (!password)
                missingFields.push("password");
            if (!confirmPassword)
                missingFields.push("confirmPassword");
            return next(ErrorHandler_1.default.validation("Please enter password and confirm password", {
                missingFields,
            }));
        }
        if (password !== confirmPassword) {
            logger_1.loggerHelpers.security("password_reset_mismatch", "LOW", {
                ip: req.ip,
            });
            return next(ErrorHandler_1.default.validation("Passwords do not match", {
                field: "confirmPassword",
                code: "PASSWORD_MISMATCH",
            }));
        }
        if (password.length < 6) {
            return next(ErrorHandler_1.default.validation("Password must be at least 6 characters", {
                field: "password",
                minLength: 6,
                provided: password.length,
            }));
        }
        try {
            const resetPasswordToken = crypto_1.default
                .createHash("sha256")
                .update(resetToken)
                .digest("hex");
            const user = await user_model_1.default.findOne({
                resetPasswordToken,
                resetPasswordExpires: { $gt: new Date() },
                isDeleted: false, // Ensure user is not deleted
            });
            if (!user) {
                logger_1.loggerHelpers.security("password_reset_invalid_token", "MEDIUM", {
                    resetToken: resetToken?.substring(0, 6) + "***",
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.authentication("Invalid token or token expired"));
            }
            // Check if user is active
            if (user.status !== "active") {
                logger_1.loggerHelpers.security("password_reset_inactive_account", "HIGH", {
                    userId: user._id.toString(),
                    status: user.status,
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.authorization("Account is not active"));
            }
            // Update password and clear reset tokens
            user.password = password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            // Log successful password reset
            logger_1.loggerHelpers.auth("password_reset_success", user._id.toString(), {
                email: user.email,
                ip: req.ip,
            });
            res.status(200).json({
                success: true,
                message: "Password updated successfully",
            });
        }
        catch (error) {
            logger_1.loggerHelpers.security("password_reset_system_error", "HIGH", {
                error: error.message,
                ip: req.ip,
            });
            return next(new ErrorHandler_1.default(500, "Password reset failed due to system error", {
                category: ErrorHandler_1.ErrorCategory.SYSTEM,
                severity: ErrorHandler_1.ErrorSeverity.HIGH,
                context: {
                    originalError: error.message,
                },
            }));
        }
    }),
    // Enhanced resend activation email with logging and error handling
    resendActivationEmail: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { email } = req.body;
        // Log business event
        logger_1.loggerHelpers.business("activation_email_resend_attempt", {
            email: email?.substring(0, 3) + "***",
            ip: req.ip,
        });
        if (!email) {
            return next(ErrorHandler_1.default.validation("Email is required", {
                field: "email",
                code: "MISSING_EMAIL",
            }));
        }
        try {
            const user = await user_model_1.default.findOne({ email, emailVerified: false });
            if (!user) {
                logger_1.loggerHelpers.security("resend_activation_invalid_email", "MEDIUM", {
                    email: email?.substring(0, 3) + "***",
                    ip: req.ip,
                });
                return next(ErrorHandler_1.default.notFound("User not found or already verified"));
            }
            // Create new activation token
            const activationToken = await (0, jwt_1.createActivationToken)(user);
            const activationCode = activationToken.activationCode;
            const data = {
                user: { name: `${user.firstName} ${user.lastName}` },
                activationCode,
            };
            await (0, sendMail_1.default)({
                email: user.email,
                subject: "Account Activation - Resent",
                template: "activation-mail.ejs",
                data,
            });
            // Log successful resend
            logger_1.loggerHelpers.business("activation_email_resent", {
                userId: user._id.toString(),
                email: email?.substring(0, 3) + "***",
            });
            res.status(200).json({
                success: true,
                message: "Activation email resent successfully",
                activationToken: activationToken.token,
            });
        }
        catch (error) {
            logger_1.loggerHelpers.security("resend_activation_error", "HIGH", {
                error: error.message,
                ip: req.ip,
            });
            return next(new ErrorHandler_1.default(500, "Failed to resend activation email", {
                category: ErrorHandler_1.ErrorCategory.SYSTEM,
                severity: ErrorHandler_1.ErrorSeverity.HIGH,
                context: {
                    originalError: error.message,
                },
            }));
        }
    }),
};
exports.default = authController;
