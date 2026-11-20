
const mongoose = require("mongoose");

const vinnerSchema = new mongoose.Schema({
  // hvilken luke vinneren vant
  lukeNr: {
    type: Number,
    required: true,
    min: 1,
    max: 24,
    unique: true,
  },

  // brukeren som vant
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // når vinneren ble trukket
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Vinner", vinnerSchema);
