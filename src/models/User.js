const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    bills: [
        {
            type: Schema.Types.ObjectId, 
            ref: "Bill", 
            required: true
        }
    ]
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", UserSchema);
