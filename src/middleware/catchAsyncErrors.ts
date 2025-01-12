import { NextFunction, Request, Response } from "express";
import { IController } from "../@types/common.type";

export const CatchAsyncErrors =
  (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
