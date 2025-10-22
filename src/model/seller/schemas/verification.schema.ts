import { Schema } from "mongoose";
import { IBusinessVerification } from "../../../@types/seller.type";

/**
 * Business verification schema
 */
export const BusinessVerificationSchema = new Schema<IBusinessVerification>(
  {
    businessLicense: {
      number: { type: String, trim: true },
      document: {
        url: { type: String },
        publicId: { type: String },
      },
      verified: { type: Boolean, default: false },
    },
    taxId: {
      number: { type: String, trim: true },
      document: {
        url: { type: String },
        publicId: { type: String },
      },
      verified: { type: Boolean, default: false },
    },
    bankAccount: {
      accountNumber: { type: String, trim: true },
      routingNumber: { type: String, trim: true },
      bankName: { type: String, trim: true },
      verified: { type: Boolean, default: false },
    },
    identityVerification: {
      document: {
        url: { type: String },
        publicId: { type: String },
      },
      documentType: {
        type: String,
        enum: ["passport", "license", "nationalId"],
      },
      verified: { type: Boolean, default: false },
    },
  },
  { _id: false },
);
