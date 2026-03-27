const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

//Middleware
app.use(express.json());

//Routes
// app.use("/api/users",    require("./routers/user.router"));
app.use("/api/doctors", require("./routers/doctors"));
app.use("/api/bookings", require("./routers/bookings"));

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Kết nối MongoDB thành công");
    app.listen(process.env.PORT || 3000, () => {
      console.log(
        `🚀 Server đang chạy tại http://localhost:${process.env.PORT || 3000}`,
      );
    });
  })
  .catch((err) => {
    console.error("Kết nối MongoDB thất bại:", err.message);
    process.exit(1);
  });
