/**
 * Bill Routes
 * Handles bill creation, retrieval, updates, and deletion.
 **/

const express = require("express");
const router = express.Router();
const {
  getBill,
  addBill,
  getAllUserBills,
  updateBill,
  deleteBill,
} = require("../../modules/bills/bill.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/individual/:id", protect, getBill);
router.get("/all/:userId", protect, getAllUserBills);
router.post("/add", protect, addBill);
router.put("/update/:id", protect, updateBill);
router.delete("/delete/:id", protect, deleteBill);

module.exports = router;
