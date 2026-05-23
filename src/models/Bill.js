const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BillSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrence: {
      type: String, // e.g., 'daily', 'weekly', 'monthly', 'yearly'
      trim: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Bill", BillSchema);
