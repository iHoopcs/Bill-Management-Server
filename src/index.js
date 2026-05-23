require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 8080;

//CORS Middleware
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

app.get("/api/ping", (req, res) => {
  res.status(200).json({ status: "SUCCESS", message: "Pinging..." });
});

app.listen(port, () => {
  console.log(`Finance Management Server is running on port ${port}!!!`);
});
