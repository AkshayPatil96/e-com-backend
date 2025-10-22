import { Router } from "express";
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth.routes";
import brandRouter from "./routes/brand.routes";
import categoryRouter from "./routes/category.routes";
import productRouter from "./routes/product.routes";
import sellerRouter from "./routes/seller.routes";
import userRouter from "./routes/user.routes";
import variationRouter from "./routes/variation.routes";

const v1Router = Router();

v1Router.get("/", (req, res) => {
  res.send("Hello from v1 routes of e-com API");
});

v1Router.use("/auth", authRouter);
v1Router.use("/user", userRouter);
v1Router.use("/admin", adminRouter); // Admin routes now include categories, brands, products for admin panel
v1Router.use("/categories", categoryRouter); // Public category routes
v1Router.use("/product", productRouter); // Public product routes
v1Router.use("/variation", variationRouter);
v1Router.use("/sellers", sellerRouter); // Public seller routes
v1Router.use("/brand", brandRouter); // Public brand routes

export default v1Router;
