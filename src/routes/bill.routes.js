/**
 * Bill Routes
 * Handles bill creation, retrieval, updates, and deletion.
 **/

const express = require("express");
const router = express.Router();
const { getBill, addBill } = require("../controllers/bill.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/:id", protect, getBill);
router.post("/", protect, addBill);

module.exports = router;
