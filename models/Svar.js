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
    required: true,
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
  riktig: {
    type: Boolean,
    default: null,
  },
});


// for at man ikke kan ungå et svar per luke per bruker ved å sende to svar sammtidig 
svarSchema.index({ lukeNr: 1, userId: 1 }, { unique: true });

const Svar = mongoose.model("Svar", svarSchema);

module.exports = Svar;
