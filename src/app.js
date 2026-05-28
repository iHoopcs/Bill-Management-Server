/**
 * App.js 
 * This file sets up the Express server, middleware, and routes.
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const apiRoutes = require("./api/routes");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API routes
app.use("/api", apiRoutes);

module.exports = app;
