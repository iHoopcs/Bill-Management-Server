const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String, // e.g., 'email', 'sms', 'push'
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    eventId: {
      type: String, // To ensure idempotency from Kafka events
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("NotificationLog", NotificationLogSchema);
