// category.validation.ts
import * as yup from "yup";

export const categoryValidation = yup.object().shape({
  name: yup
    .string()
    .required("Name is required")
    .min(3, "Name must be at least 3 characters long"),
  slug: yup
    .string()
    .required("Slug is required")
    .matches(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, numbers, and hyphens only",
    ),
  description: yup.string().optional(),
  images: yup
    .array()
    .of(
      yup.object().shape({
        url: yup.string(),

        alt: yup
          .string()
          .max(200, "Alt text must be at most 200 characters long"), // Optional: set a maximum length
      }),
    )
    .optional(),
  banner: yup
    .object()
    .shape({
      url: yup.string(),
      alt: yup.string(),
    })
    .optional(),
  parent: yup.string().nullable().optional(), // assuming this is an ObjectId as a string
  isDeleted: yup.boolean().default(false).optional(),
});
