const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());

const swaggerJsDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "User API",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routers/*.js"], // đọc swagger từ routers
};

const swaggerSpec = swaggerJsDoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===== ROUTES =====
app.use("/api/doctors", require("./routers/doctors"));
app.use("/api/bookings", require("./routers/bookings"));
app.use("/api/users", require("./routers/users"));

// ===== CONNECT DB =====
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Kết nối MongoDB thành công");
    app.listen(process.env.PORT || 3000, () => {
      console.log(
        `🚀 Server chạy tại http://localhost:${process.env.PORT || 3000}`,
      );
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB lỗi:", err.message);
  });
