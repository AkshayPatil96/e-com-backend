import { NextFunction, Request, Response } from "express";

export interface IImage {
  url: string;
  alt: string;
  caption?: string;
  isPrimary?: boolean;
}

// interface for SEO metadata
export interface IMetadataSchema {
  title?: string;
  description?: string;
  keywords?: string[];
  images?: string[];
}

export type IController = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response<any, Record<string, any>>>;
