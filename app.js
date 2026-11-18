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
const { log } = require("node:console");
const app = express(); //idk

require("dotenv").config(); //idk
app.set("view engine", "ejs"); //idk
app.use(express.urlencoded({ extended: true })); //lar express lese info fra en html form
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
app.get("/lukeDashboard", (req, res) => {
  res.render("lukeDashboard");
});
app.get("/lukeSvar", (req, res) => {
  res.render("lukeSvar");
});

//en get route,
app.get("/admin/luke/:lukeNr", async (req, res) => {
  //try er ganske straight forwards, PRØV dette. fordi vi bruker mongoDB og databaser kan ha info vi noen ganger ikke ville ha.
  try {
    //tar lukeNr fra URL. parseInt gjør det til et nummer istedenfor string som er i url.
    const lukeNr = Number(req.params.lukeNr);

    //sjekker at lukeNr er mellon 1-24, og at det er et gyldig nummer. || betyr or/eller. så alle av de 3 må stemme, hvis ikke sender den et feil error "ugyldig luke"
    // status 400 endrer browser søkefeltet til 400 tror jeg
    if (isNaN(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke");
    }

    // "Luke" er modellen, den som ble exportert i bunnen av Luke.js og importert på toppen av app.js
    //den gir tilgang til all info i luke kolleksjonen
    //findOne sier til mongoose akkurat hva vi leter etter i Luke kolleksjonen, som da er lukeNr for den spesefike luken.
    //den første lukeNr: er navnet vi ga til schemaen som har infoen vi leter etter, aka om det eksisterer info for denne luken.
    let luke = await Luke.findOne({ lukeNr: lukeNr });

    //hvis det ikke er noe info for denne luken, lager den det som at det er noe i mongodb for denne luken, selvom det den lagrer er basically ingenting.
    if (luke == null) {
      luke = {
        lukeNr: lukeNr,
        aktiv: true,
        tittel: "",
        innhold: "",
        media: "",
        mediaType: "ingen",
      };
    }

    //rendererlukeEditor.ejs og sender objektet til ejs filen. den får navnet på variablen av lukeNr, og så infoen i den.
    res.render("lukeEditor", { luke: luke });
  } catch (error) {
    //hvis try/koden IKKE fungerer får man en error melding
    console.log(error);
    res.status(500).send("Noe gikk galt");
  }
});

//post for å si at info kommer fra en post som skal bli sendt vidre
//:lukeNr i url'en endrer basert på lukeNr, som endrer basert på hvilken luke du klikker
//async for å bruke await
app.post("/admin/luke/:lukeNr", async (req, res) => {
  try {
    //gjør lukeNr til et nummer
    const lukeNr = Number(req.params.lukeNr);

    //sjekker at luke nummeret er valid
    if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke");
    }

    //spør mongoose om å finne infoen fra luke hvor lukenr er det samme som luken som er åpen for redigering i browser
    await Luke.findOneAndUpdate(
      { lukeNr: lukeNr },
      {
        //sier til mongoose hva den skal oppdatere eller lagre basert på det som blir postet, req.body / request det som er i dette feltet i body.
        $set: {
          aktiv: req.body.aktiv === "true",
          tittel: req.body.tittel,
          innhold: req.body.innhold,
          media: req.body.media,
          mediaType: req.body.mediaType,
        },
      },

      {
        //upsert er sånn "oppdater hvis det eksisterer, og hvis det ikke eksisterer infoen som blir lagret så lager du det fra nytt med det som blir postet."
        upsert: true,
        //passer på at hvis du oppdaterer, at det føllger alle reglene i schemaen.
        runValidators: true,
        //passer på at schemaen sine defaults faktisk settes på når man upserter
        setDefaultOnInsert: true,
      },
    );
    //etter man lagrer går du tilbake til editor for samme dør
    res.redirect(`/admin/luke/${lukeNr}`);
  } catch (error) {
    console.log(error);
    res.status(500).send("Kunne ikke lagre luken.");
  }
});

//kobler det til en local host port, kan redigere hvilken port i .env sånn det er variabelt og lett å endre.
app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});
