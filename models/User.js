const mongoose = require("mongoose"); // mongoose for å koble til mongodb

//lager userSchema variabel, og så lager en schema gjennom mongoose.
//en schema forklarer databasen hvordan informasjon gitt til den skal være strukturert.
const userSchema = mongoose.Schema({
  //strukturen databasen skal bruke. f eks "email" er navnet på det feltet, mens string er data typen.
  email: {
    type: String,
    // "." er hva som helst karakter, "+" er en eller fler karakterer, afk delen får at adressen MÅ ha "@afk.no" og "$" betyr at det må ende etter .no
    match: /.+@afk\.no$/,
    //mellomromm og sån før eller etter teksten blir fjernet på start og slutt.
    trim: true,

    //det må være lowercase for at match skal fungere
    lowercase: true,
  },
  navn: {
    type: String,
    required: true,
  },
  //variabel for roller, role er navnet på variablen
  role: {
    type: String,
    //enun for  "making multiple mentions", det skal være flere roller så bruker enum for å nevne dem.
    enum: ["admin", "elev"],
    default: "elev",
    //man MÅ enten være admin eller elev
    required: true,
  },
});

//lager en user variabel, lager så en model men mongoose, "user" er navnet, og den sier den skal bruke strukturen til schemaen over.
const user = mongoose.model("User", userSchema);

//module.exports gør at den er tilgjenglig for andre js filer
//
module.exports = user;
