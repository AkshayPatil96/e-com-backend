"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const date_fns_1 = require("date-fns");
const catchAsyncErrors_1 = require("../../middleware/catchAsyncErrors");
const user_model_1 = __importDefault(require("../../model/user.model"));
const server_1 = require("../../server");
const ErrorHandler_1 = __importDefault(require("../../utils/ErrorHandler"));
const jwt_1 = require("../../utils/jwt");
const sendMail_1 = __importDefault(require("../../utils/sendMail"));
const authController = {
    signup: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { email, dob, firstName, lastName } = req.body;
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser) {
            return next(new ErrorHandler_1.default(400, "User with this email already exists"));
        }
        let formattedDob = null;
        if ((0, date_fns_1.isDate)(dob)) {
            formattedDob = dob;
        }
        else {
            formattedDob = (0, date_fns_1.parse)(dob, "dd-mm-yyyy", new Date());
        }
        const activationToken = await (0, jwt_1.createActivationToken)({
            ...req.body,
            dob: formattedDob,
        });
        const activationCode = activationToken.activationCode;
        let data = { user: { name: `${firstName} ${lastName}` }, activationCode };
        await (0, sendMail_1.default)({
            email: req.body.email,
            subject: "Account Activation",
            template: "activation-mail.ejs",
            data,
        });
        res.status(201).json({
            success: true,
            message: "Account created successfully. Please check your email to activate your account.",
            activationToken: activationToken.token,
        });
    }),
    activateUserAccount: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { activationCode, activationToken } = req.body;
        const newUser = await (0, jwt_1.verifyActivationToken)(activationToken);
        if (newUser.activationCode !== activationCode)
            return next(new ErrorHandler_1.default(400, "Invalid activation code"));
        const { email } = newUser.user;
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser)
            return next(new ErrorHandler_1.default(400, "Email already exists"));
        // await User.create({ ...newUser.user });
        let data = new user_model_1.default({ ...newUser.user });
        await data.save();
        res
            .status(200)
            .json({ success: true, message: "Account activated successfully" });
    }),
    loginUser: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ErrorHandler_1.default(400, "Please enter email and password"));
        }
        const user = await user_model_1.default.findOne({
            $or: [{ email: email }, { username: email }],
        }).select("+password");
        if (!user)
            return next(new ErrorHandler_1.default(401, "Invalid email or password"));
        const isPasswordMatched = await user.comparePassword(password);
        if (!isPasswordMatched)
            return next(new ErrorHandler_1.default(401, "Invalid email or password"));
        await (0, jwt_1.sendToken)(user, 200, res);
    }),
    logoutUser: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        // remove session from redis
        // if (req?.user) {
        console.log("req.user: ", req.user);
        server_1.redis.del(req.user._id.toString());
        // }
        // clear cookies
        // res.clearCookie("accessToken");
        // res.clearCookie("refreshToken");
        res
            .status(200)
            .json({ success: true, message: "Logged out successfully" });
    }),
    // updateRefreshToken: CatchAsyncErrors(
    //   async (req: Request, res: Response, next: NextFunction) => {
    //     const { refreshToken } = req.cookies;
    //     const decoded = jwt.verify(
    //       refreshToken,
    //       process.env.REFRESH_TOKEN as string,
    //     ) as JwtPayload;
    //     if (!decoded) {
    //       return next(
    //         new ErrorHandler(401, "Could not refresh token. Please login again"),
    //       );
    //     }
    //     // const session = await redis.get(decoded.id as string);
    //     // if (!session) {
    //     //   return next(
    //     //     new ErrorHandler(
    //     //       404,
    //     //       "Could not refresh token. User session not found",
    //     //     ),
    //     //   );
    //     // }
    //     // const user = JSON.parse(session);
    //     const accessToken = signAccessToken(user);
    //     const newRefreshToken = signRefreshToken(user);
    //     req.user = user;
    //     res.cookie("accessToken", accessToken, accessTokenOptions);
    //     res.cookie("refreshToken", newRefreshToken, refreshTokenOptions);
    //     // await redis.set(user._id, JSON.stringify(user), "EX", 7 * 24 * 60 * 60);
    //     res.status(200).json({
    //       success: true,
    //       accessToken,
    //     });
    //   },
    // ),
    getUser: (0, catchAsyncErrors_1.CatchAsyncErrors)(async (req, res, next) => {
        let user = req.user;
        // const user = await User.findOne({ username });
        if (!user) {
            return next(new ErrorHandler_1.default(404, "User not found"));
        }
        res.status(200).json({
            success: true,
            data: user,
        });
    }),
};
exports.default = authController;
