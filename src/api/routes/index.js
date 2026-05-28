/**
 * This file defines the main router for the application, which aggregates all the individual route modules.
 * It also includes a simple health check endpoint at /api/ping.
 * The actual server setup and database connection are handled in server.js, while app.js is responsible for middleware and route integration.
 */
const express = require("express");
const router = express.Router();

const userRoutes = require("./user.routes");
const authRoutes = require("./auth.routes");
const billRoutes = require("./bill.routes");

// Health check endpoint
router.get("/ping", (req, res) => {
  res.status(200).json({ status: "OK", message: "Pinging..." });
});

// API routes
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/bills", billRoutes);

module.exports = router;
