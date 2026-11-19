const mongoose = require("mongoose");

const lukeSchema = mongoose.Schema({
  //sier hvilken luke fra 1-24 som det er, selve luken sitt navn.
  lukeNr: {
    type: Number,
    required: true,
    min: 1,
    max: 24,
    unique: true,
  },

  //bare en vei admin kan deaktivere en luke i mongodb, f eks hvis de har skrivet feil info så kan de lukke den for elever.
  aktiv: {
    type: Boolean,
    default: true,
  },

  //tittel på luker eller spørsmal
  tittel: {
    type: String,
    default: "",
  },
  //selve spørsmalet
  sporsmal: {
    type: String,
    default: "",
  },

  svarType: {
    type: String,
    enum: ["open", "multiple_choice", "video"],
    default: "open",
  },
  alternativer: {
    type: [String],
    default: [],
  },
  riktigSvar: {
    type: String,
    default: "",
  },
  //link til video eller bilde
  media: {
    type: String,
    default: "",
  },

  //type media som man kan se om det er et bilde eller en video i mongodb og ikke bare en lenke
  mediaType: {
    type: String,
    enum: ["bilde", "video", "ingen"],
    default: "ingen",
  },

});

const Luke = mongoose.model("Luke", lukeSchema);

module.exports = Luke;
