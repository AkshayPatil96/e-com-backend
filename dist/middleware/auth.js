"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const catchAsyncErrors_1 = require("./catchAsyncErrors");
const server_1 = require("../server");
const jwt_1 = require("../utils/jwt");
exports.isAuthenticated = (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    console.log("accessToken: ", accessToken);
    if (!accessToken)
        return next(new ErrorHandler_1.default(400, "Please login to access this resource (no access token provided)"));
    const decoded = (0, jwt_1.verifyAccessToken)(accessToken);
    console.log("decoded: ", decoded);
    if (!decoded)
        return next(new ErrorHandler_1.default(401, "Please login to access this resource"));
    let user = await server_1.redis.get(decoded.id);
    console.log("user: ", user);
    if (!user)
        return next(new ErrorHandler_1.default(401, "Please login to access this resource"));
    user = JSON.parse(user);
    console.log("user: ", user);
    req.user = user;
    next();
});
// export const authorizeRoles = (...allowedRoles: string[]) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     if (req?.user) {
//     }
//     const userRole = req?.user?.role;
//     if (!userRole || !allowedRoles.includes(userRole)) {
//       return next({
//         message: `Role (${userRole}) is not allowed to access this resource`,
//         status: 403, // Forbidden
//       });
//     }
//     next();
//   };
// };
