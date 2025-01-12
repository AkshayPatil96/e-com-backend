import { rateLimit } from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  limit: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  legacyHeaders: true,
  standardHeaders: true,
  // skip: (req) => {
  //   return req.originalUrl.includes("/api/v1");
  // },
});
