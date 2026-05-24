require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 8080;

const connectDB = require("./configs/database.config");
const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");
const billRoutes = require("./routes/bill.routes");

//Middleware
const allowedOrigins = ["http://localhost:4200"];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

app.use(express.json());

//Endpoints
app.get("/api/ping", (req, res) => {
  res.status(200).json({ status: "OK", message: "Pinging..." });
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bills", billRoutes);

// Export app for testing without binding a port
module.exports = app;

// Only start the server if this file is run directly (not imported by tests)
if (require.main === module) {
  const startServer = async () => {
    try {
      await connectDB();
      app.listen(port, () => {
        console.log(`Finance Management Server is running on port ${port}!!!`);
      });
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  };
  startServer();
}
