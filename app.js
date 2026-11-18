const express = require("express"); // express for liveserver
const mongoose = require("mongoose"); // mongoose for å koble til mongodb
const jwt = require("jsonwebtoken"); // for authentication av brukere sånn vi vet at de er de de sier de er
const cookieParser = require("cookie-parser"); //for at cookier får bedre struktur
const crypto = require("node:crypto"); //for tilgang til random uid for anonymous users


const quizCollection = () => mongoose.connection.db.collection("quizzes");
const Luke = require("./models/Luke");
const Sporsmal = require("./models/Sporsmal");
const Svar = require("./models/Svar");
const User = require("./models/User");
const Vinner = require("./models/Vinner");

const npm2 = require("npm2"); //idk
const { log } = require("node:console");
const app = express(); //idk

require("dotenv").config(); //idk
app.set("view engine", "ejs"); //sier til express hvilken template engine den skal bruke.
app.use(express.urlencoded({ extended: true })); //lar express lese info fra en html form
app.use(express.static("public")); //gjør at express leter i public automatisk så du slipper å skrive public i banenavnet
app.use(cookieParser()); //idk
mongoose.connect(process.env.MONGODB_URI); //kobler mongoose og mongoDB database gjennom env for dynamisk endring

//basic rendering, app.get for at brukere sånn åpner nettsider faktiskt får opp infoen i ejs.

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/lukeDashboard", (req, res) => {
  res.render("lukeDashboard");
});
app.get("/lukeSvar", (req, res) => {
  res.render("lukeSvar");
});

//dato sjekk
app.get("/", async (req, res) => {
  //object med ldato, lagres som en variabel som heter dato.
  const dato = new Date();

  //gjør dagen til en dynamisk variabel man kan endre.
  const dag = Number(
    //js verktøy som formaterer datoer og tider. gjør datoens dag til et tall istedenfor en string.
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Oslo",
      day: "numeric",
    }).format(dato),
  );

  //samme som det over, men med måned og ikke dag.
  const month = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Oslo",
      month: "numeric",
    }).format(dato),
  );

  //denne bare sier at dagens dato er i dag. for meg akk nå er det den 18, så alle luker etter 18 er lukket.
  const dagensDato = dag;

  // denne er hvis jeg vil ha alle åpne, later som det er 24rd des
  // const dagensDato = 24;

  //denne sier hvis det ikke er des, skal du ikke åpne noen av de.
  // const dagensDato = month === 12 ? dag : 0;

  res.render("index", {
    dagensDato: dagensDato, //denne sender vagens dato til index ejs filen som at den vet hvilken dag det er for brukeren. den første er navnet som ejs får, mens den andre er selve variablen.
  });
});



//en get route for at luken man går in på fra dashboard skal fungere, og at den er valid. og noen små andre ting.
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
        sporsmal: "",
        media: "",
        mediaType: "ingen",
      };
    }

    // Henter spørsmålene fra seed-scriptet.
    const quiz = await mongoose.connection.db
      .collection("quizzes")
      .findOne({ _id: "christmas-quiz" });

    // Finner spørsmålet som hører til denne luken.
    const quizSporsmal = quiz?.questions?.find(
      (question) => question.id === lukeNr,
    );

    // Sender både luke og quiz-spørsmål til editoren.
    res.render("lukeEditor", {
      luke: luke,
      quizSporsmal: quizSporsmal,
    });
  } catch (error) {
    //hvis try/koden IKKE fungerer får man en error melding
    console.log(error);
    res.status(500).send("Noe gikk galt");
  }
}); //akk det samme som den over, bare denne gangen hvis en luke er deaktivert så vil den ikke rendere.
app.get("/luke/:lukeNr", async (req, res) => {
  try {
    const lukeNr = Number(req.params.lukeNr);

    if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke");
    }

    // Henter informasjonen fra luke-kolleksjonen.
    const funnetLuke = await Luke.findOne({ lukeNr: lukeNr });

    // Hvis luken ikke finnes i databasen, lager vi et midlertidig objekt.
    // Dette gjør at seed-scriptet kan levere spørsmål uten at vi må ha en Luke fra før.
    const luke = funnetLuke || {
      lukeNr: lukeNr,
      aktiv: true,
      tittel: "",
      sporsmal: "",
      media: "",
      mediaType: "ingen",
    };

    // Hvis luken er deaktivert, skal den ikke vises.
    if (!luke.aktiv) {
      return res.send("Denne luken er ikke tilgjengelig");
    }

    // Henter spørsmålene fra quiz-kolleksjonen som seed-scriptet lager.
    const quiz = await mongoose.connection.db
      .collection("quizzes")
      .findOne({ _id: "christmas-quiz" });

    // Finner spørsmålet som hører til denne luken.
    const quizSporsmal = quiz?.questions?.find(
      (question) => question.id === lukeNr,
    );

    // Sender både luke-informasjonen og quiz-spørsmålet til EJS.
    res.render("luke", {
      luke: luke,
      quizSporsmal: quizSporsmal,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Noe gikk galt");
  }
});

app.post("/luke/:lukeNr/svar", async (req,res) => {
  try { 
    const lukeNr = Number(req.params.lukeNr)

    if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke")
    }

    const svar = req.body.svar;

    if (!svar || !svar.trim()) {
      return res.status(400).send("Du må skrive inn et svar")
    }

    
    
  } catch (error) {
    
  }
})


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
          sporsmal: req.body.sporsmal,
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

// app.get("*", (req, res) => {
//   res.send("I am a teapot");
// });

//kobler det til en local host port, kan redigere hvilken port i .env sånn det er variabelt og lett å endre.
app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});
