const mongoose = require("mongoose");

const svarSchema = new mongoose.Schema({
  //hvilken luke svarene er til
  lukeNr: {
    type: Number,
    required: true,
  },

  //for logget inn brukeres ID'r
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  //lagrer det de svarte
  svar: {
    type: String,
    required: true,
  },

  //datoen og tiden de sendte det in
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Svar = mongoose.model("Svar", svarSchema);

module.exports = Svar;
