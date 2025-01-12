import { Schema } from "mongoose";
import { IImage, IMetadataSchema } from "../../@types/common.type";

export const metaDataSchema = new Schema<IMetadataSchema>(
  {
    title: { type: String },
    description: { type: String },
    keywords: [{ type: String }],
    images: [{ type: String }],
  },
  { _id: false },
);

export const ImageSchema = new Schema<IImage>(
  {
    url: { type: String },
    alt: { type: String },
    caption: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);
