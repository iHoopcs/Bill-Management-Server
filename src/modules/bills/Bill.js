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
    recurrence: {
      type: String, // 'monthly' | 'yearly'
      enum: ["monthly", "yearly"],
      default: null,
      trim: true,
    },

    // For 'monthly' recurrence: which day of the month is this bill due? (1–31)
    // Used to populate the full year calendar (e.g., rent is always due on the 1st)
    recurringDayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
    },

    // For 'yearly' recurrence: which month (1–12) and day (1–31) is this bill due?
    // e.g., car registration every March 15 → yearlyDueMonth: 3, yearlyDueDay: 15
    yearlyDueMonth: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
    yearlyDueDay: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
    },

    // Optional end date for recurring bills (null = recurs indefinitely)
    recurrenceEndDate: {
      type: Date,
      default: null,
    },

    // How many days before the due date to send a reminder (e.g., 3 = remind 3 days early)
    reminderDays: {
      type: Number,
      default: 3,
      min: 0,
    },

    isPaid: {
      type: Boolean,
      default: false,
    },
    paidDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficiently querying a user's bills within a date range (calendar views)
BillSchema.index({ user: 1, dueDate: 1 });

// Index for fetching bills by recurrence type (year calendar population)
BillSchema.index({ user: 1, recurrence: 1 });

module.exports = mongoose.model("Bill", BillSchema);
