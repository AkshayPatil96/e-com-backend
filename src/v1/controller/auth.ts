import crypto from "crypto";
import { isDate, parse } from "date-fns";
import e, { NextFunction, Request, Response } from "express";
import {
  ILoginUserBody,
  IRegisterUserBody,
  IUser,
} from "../../@types/user.type";
import config from "../../config";
import { CatchAsyncErrors } from "../../middleware/catchAsyncErrors";
import User from "../../model/user.model";
import { redis } from "../../server";
import ErrorHandler from "../../utils/ErrorHandler";
import {
  accessTokenOptions,
  createActivationToken,
  refreshTokenOptions,
  sendToken,
  signAccessToken,
  signRefreshToken,
  verifyActivationToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import sendMail from "../../utils/sendMail";

const authController = {
  signup: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, dob, firstName, lastName } = req.body as IRegisterUserBody;

      const existingUser = await User.findOne({ email });

      if (existingUser)
        return next(
          new ErrorHandler(400, "User with this email already exists"),
        );

      let formattedDob: Date | null = null;

      if (dob) {
        if (isDate(dob)) formattedDob = dob;
        else formattedDob = parse(dob, "dd-mm-yyyy", new Date());
      }

      const activationToken = await createActivationToken({
        ...req.body,
        dob: formattedDob,
      });

      const activationCode = activationToken.activationCode;

      let data = { user: { name: `${firstName} ${lastName}` }, activationCode };

      await sendMail({
        email: req.body.email,
        subject: "Account Activation",
        template: "activation-mail.ejs",
        data,
      });

      res.status(201).json({
        success: true,
        message:
          "Account created successfully. Please check your email to activate your account.",
        activationToken: activationToken.token,
      });
    },
  ),

  activateUserAccount: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { activationCode, activationToken } = req.body;

      const newUser: any = await verifyActivationToken(activationToken);
      if (newUser.activationCode !== activationCode)
        return next(new ErrorHandler(400, "Invalid activation code"));

      const { email } = newUser.user;
      const existingUser = await User.findOne({ email });
      if (existingUser)
        return next(new ErrorHandler(400, "Email already exists"));

      if (!newUser?.username) newUser.user.username = email.split("@")[0];

      await User.create({ ...newUser.user });
      // let data = new User({ ...newUser.user });

      // await data.save();

      res
        .status(200)
        .json({ success: true, message: "Account activated successfully" });
    },
  ),

  loginUser: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, password }: ILoginUserBody = req.body;

      if (!email || !password)
        return next(new ErrorHandler(400, "Please enter email and password"));

      const user = await User.findOne({
        $or: [{ email: email }, { username: email }],
      }).select("+password");

      if (!user)
        return next(new ErrorHandler(401, "Invalid email or password"));

      const isPasswordMatched = await user.comparePassword(password);

      if (!isPasswordMatched)
        return next(new ErrorHandler(401, "Invalid email or password"));

      user.lastLogin = new Date();
      await user.save();

      await sendToken(user, 200, res);
    },
  ),

  logoutUser: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      // remove session from redis
      redis.del(req.user._id.toString());

      // clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res
        .status(200)
        .json({ success: true, message: "Logged out successfully" });
    },
  ),

  updateRefreshToken: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { refreshToken } = req.cookies;

      const decoded = await verifyRefreshToken(refreshToken);

      if (!decoded)
        return next(
          new ErrorHandler(401, "Could not refresh token. Please login again"),
        );

      const session = await redis.get(decoded.id as string);

      if (!session)
        return next(
          new ErrorHandler(
            404,
            "Could not refresh token. User session not found",
          ),
        );

      const user = JSON.parse(session);

      const accessToken = signAccessToken(user);

      const newRefreshToken = signRefreshToken(user);
      req.user = user;

      res.cookie("accessToken", accessToken, accessTokenOptions);
      res.cookie("refreshToken", newRefreshToken, refreshTokenOptions);

      await redis.set(user._id, JSON.stringify(user), "EX", 7 * 24 * 60 * 60);

      res.status(200).json({
        success: true,
        accessToken,
      });
    },
  ),

  forgetPassword: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user)
        return next(new ErrorHandler(404, "User not found with this email"));

      const resetToken = crypto.randomBytes(20).toString("hex");

      let resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      user.resetPasswordToken = resetPasswordToken;

      user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await user.save({ validateBeforeSave: false });

      const resetUrl = `${config.FRONTEND_URL}/auth/reset-password/${resetToken}`;
      console.log("resetUrl: ", resetUrl);

      const message = {
        email: user.email,
        subject: "Password Reset Token",
        template: "forgot-token.ejs",
        data: { user, resetUrl },
      };

      try {
        await sendMail(message);

        res.status(200).json({
          success: true,
          message: `Email sent to: ${user.email}`,
        });
      } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save({ validateBeforeSave: false });

        return next(new ErrorHandler(500, "Email could not be sent"));
      }
    },
  ),

  resetPassword: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { resetToken } = req.params;
      const { password, confirmPassword } = req.body;

      if (!password || !confirmPassword)
        return next(new ErrorHandler(400, "Please enter password"));

      if (password !== confirmPassword)
        return next(new ErrorHandler(400, "Passwords do not match"));

      const resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user)
        return next(new ErrorHandler(400, "Invalid token or token expired"));

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully",
      });
    },
  ),

  getUser: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      let user = req.user;

      // const user = await User.findOne({ username });

      if (!user) {
        return next(new ErrorHandler(404, "User not found"));
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    },
  ),
};

export default authController;
