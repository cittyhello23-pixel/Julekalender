const express = require("express"); // express for liveserver
const mongoose = require("mongoose"); // mongoose for å koble til mongodb
const jwt = require("jsonwebtoken"); // for authentication av brukere sånn vi vet at de er de de sier de er
const cookieParser = require("cookie-parser"); //for at cookier får bedre struktur

const Luke = require("./models/Luke");
const Sporsmal = require("./models/Sporsmal");
const Svar = require("./models/Svar");
const User = require("./models/User");
const Vinner = require("./models/Vinner");

const npm2 = require("npm2"); //idk
const app = express(); //idk

require("dotenv").config(); //idk
app.set("view engine", "ejs"); //idk
app.use(express.urlencoded({ extended: true })); //idk
app.use(express.static("public")); //gjør at express leter i public automatisk så du slipper å skrive public i banenavnet
app.use(cookieParser()); //idk
mongoose.connect(process.env.MONGODB_URI); //kobler mongoose og mongoDB database gjennom env for dynamisk endring

//basic rendering, app.get for at brukere sånn åpner nettsider faktiskt får opp infoen i ejs.
app.get("/", (req, res) => {
  res.render("index");
});
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/luke", (req, res) => {
  res.render("luke");
});
app.get("/lukeEditor", (req, res) => {
  res.render("lukeEditor");
});
app.get("/lukeSvar", (req, res) => {
  res.render("lukeSvar");
});

//kobler det til en local host port, kan redigere hvilken port i .env sånn det er variabelt og lett å endre.
app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});
