const express = require("express");
const router = express.Router();

const { registerUser, loginUser } = require("../../modules/auth/auth.controller");
const { authLimiter } = require("../middleware/auth.middleware");

router.post("/login", authLimiter, loginUser);
router.post("/register", authLimiter, registerUser);

module.exports = router;
