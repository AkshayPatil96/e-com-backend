import { Application } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

/**
 * Swagger/OpenAPI documentation configuration
 */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-Commerce API",
      version: "1.0.0",
      description:
        "A comprehensive e-commerce API with user management, products, orders, and more",
      contact: {
        name: "API Support",
        email: "support@ecommerce.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:5000",
        description: "Development server",
      },
      {
        url: "https://api.yourdomain.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            errorCode: {
              type: "string",
              example: "VALIDATION_400_xyz789",
            },
            requestId: {
              type: "string",
              example: "req_1234567890_abc123",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60d5f484c1b2f83d8c8b4567",
            },
            email: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            firstName: {
              type: "string",
              example: "John",
            },
            lastName: {
              type: "string",
              example: "Doe",
            },
            role: {
              type: "string",
              enum: ["user", "admin", "seller"],
              example: "user",
            },
            status: {
              type: "string",
              enum: ["active", "inactive", "blocked", "suspended"],
              example: "active",
            },
            emailVerified: {
              type: "boolean",
              example: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication and authorization endpoints",
      },
      {
        name: "Users",
        description: "User management operations",
      },
      {
        name: "Products",
        description: "Product catalog management",
      },
      {
        name: "Orders",
        description: "Order management system",
      },
      {
        name: "Categories",
        description: "Product categories management",
      },
      {
        name: "Brands",
        description: "Brand management",
      },
    ],
  },
  apis: [
    "./src/v1/routes/*.ts",
    "./src/v1/controller/*.ts",
    "./src/model/*.ts",
    "./docs/api/*.yaml",
  ],
};

/**
 * Initialize Swagger documentation
 */
export const setupSwagger = (app: Application) => {
  const specs = swaggerJsdoc(swaggerOptions);

  // Swagger UI options
  const swaggerUiOptions = {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "E-Commerce API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  };

  // Serve swagger docs
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, swaggerUiOptions),
  );

  // Serve raw swagger JSON
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  console.log("📚 API Documentation available at /api-docs");
};

export default setupSwagger;
