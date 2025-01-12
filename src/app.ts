import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import config, { corsOptions } from "./config";
import ErrorMiddleware from "./middleware/Error";
import { rateLimiter } from "./utils/rate-limiter";
import v1Router from "./v1";

const port = config.PORT;
const app: Application = express();

dotenv.config();
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(morgan("dev"));
app.use(cors(corsOptions));
app.use(rateLimiter);
app.set("port", port);
app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }),
);

app.get("/favicon.ico", (req: Request, res: Response) => res.status(204).end());

app.use("/api/v1", v1Router);

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const errorMessage = `404 Not Found: The requested resource at '${req.originalUrl}' with method '${req.method}' could not be found on this server. Please check the URL and try again, or visit our help section for more information.`;
  const err = new Error(errorMessage) as any;
  err.statusCode = 404;

  next(err);
});

app.use(ErrorMiddleware);

export default app;
