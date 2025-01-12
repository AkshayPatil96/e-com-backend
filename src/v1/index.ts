import { Router } from "express";
import userRouter from "./routes/user.routes";
import authRouter from "./routes/auth.routes";
import categoryRouter from "./routes/category.routes";
import productRouter from "./routes/product.routers";
import variationRouter from "./routes/variation.routes";
import sellerRouter from "./routes/seller.routes";
import brandRouter from "./routes/brand.routes";

const v1Router = Router();

v1Router.get("/", (req, res) => {
  res.send("Hello from v1 routes of e-com API");
});

v1Router.use("/auth", authRouter);
v1Router.use("/user", userRouter);
v1Router.use("/category", categoryRouter);
v1Router.use("/product", productRouter);
v1Router.use("/variation", variationRouter);
v1Router.use("/seller", sellerRouter);
v1Router.use("/brand", brandRouter);

export default v1Router;
