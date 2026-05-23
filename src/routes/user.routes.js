const express = require("express");
const router = express.Router();
const {
  registerUser,
  getAllUsers,
  getUser,
} = require("../controllers/user.controller");

router.get("/", getAllUsers);
router.get("/:id", getUser);
router.post("/register", registerUser);

module.exports = router;
