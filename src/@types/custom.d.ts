import { Request } from "express";
import { IUser } from "./user.type";

declare global {
  namespace Express {
    interface Request {
      user?: IUser | any;
    }
  }
}
