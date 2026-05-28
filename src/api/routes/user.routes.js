/**
 * User Routes
 * Handles user profile management.
 * All routes are protected by the JWT gatekeeper middleware.
 **/
const express = require("express");
const router = express.Router();
const { getAllUsers, getUser } = require("../../modules/users/user.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, getAllUsers);
router.get("/me", protect, getUser);

module.exports = router;
