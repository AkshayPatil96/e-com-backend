import { NextFunction, Request, Response } from "express";
import { CatchAsyncErrors } from "../../middleware/catchAsyncErrors";
import {
  deleteUserSevice,
  getAllUsersService,
  getUserService,
  updateUserService,
} from "../services/user.service";
import ErrorHandler from "../../utils/ErrorHandler";
import { IUser } from "../../@types/user.type";

const userController = {
  myProfile: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;

      let data = await getUserService(user._id);

      if (!data) {
        return next(new ErrorHandler(404, "User not found"));
      }

      res.status(200).json({ success: true, messaage: "User profile", data });
    },
  ),

  // update profile
  updateProfile: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user as IUser;

      let data = await updateUserService({ _id: user._id }, req.body);

      res
        .status(data.status)
        .json({ success: true, message: data.message, data: data?.user });
    },
  ),

  // get all users
  getAllUsers: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      let { page = 1, limit = 20, status } = req.query;
      let filter: any = { isDeleted: false };
      if (status === "archive") filter = { ...filter, isDeleted: true };
      else filter = { ...filter, status: status };
      let data = await getAllUsersService(
        { ...filter },
        { createdAt: -1 },
        null,
        null,
        +limit,
        +page,
      );

      res.status(200).json({
        success: true,
        message: "All users",
        data: data?.users,
        itemsPerPage: data?.itemsPerPage,
        page: data?.page,
        total: data?.total,
      });
    },
  ),

  // delete user
  deleteUser: CatchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      let data = await deleteUserSevice(id);

      res.status(data.status).json({ success: true, message: data.message });
    },
  ),
};

export default userController;
