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

//lager en ny function, denne kan blokke brukere som IKKE er logget inn
const requireLogin = async (req, res, next) => {
  try {
    //tar login token fra cookies
    const token = req.cookies.token;

    //sjekker om det eksisterer en token, sender en response til nettleser at du ikke er logget in.
    if (!token) {
      return res.status(401).json({ loginRequired: true });
    }

    //sjekker om token er valid med nøkkel fra env
    const decoded = jwt.verify(token, process.env.SECRET_JWT);

    //tar ut uid fra token
    const user = await User.findById(decoded.userId);

    // sjekker om uid faktisk er i db, de kan ha en uid selvom de ikke er der hvis de har blitt slettet.
    if (!user) {
      return res.status(401).json({ loginRequired: true });
    }

    //lagrer brukerens info og lar det bli dratt ut når man requester det
    req.user = user;

    //dette sier til express at de kan fortsette
    next();
  } catch (error) {
    return res.status(401).json({ loginRequired: true });
  }
};

//denne funksjonen er for å sjekke om noen er logget in uten å blokkere dem.
const optionalLogin = async (req, res, next) => {
  try {
    //henter token fra cookies
    const token = req.cookies.token;

    //sier at det ikke er en bruker hvis det ikke er en token
    if (!token) {
      req.user = null;
      return next();
    }

    //sjekker om token er gyldig
    const decoded = jwt.verify(token, process.env.SECRET_JWT);

    //henter uid fra mongodb
    const user = await User.findById(decoded.userId);

    //lager et user objekt hvis den finner ellers null
    req.user = user || null;

    next();
  } catch (error) {
    //hvsi token er ugyldig så sier den at brukeren ikke er logget inn
    req.user = null;
    next();
  }
};

//sjekker om de er admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).send("Du har ikke tilgang til denne siden.");
  }
  next();
};

//basic rendering, app.get for at brukere sånn åpner nettsider faktisk får opp infoen i ejs.
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    //tar infoen skrevet i body og gjør det til objekt
    const firstName = req.body.firstName.trim();
    const lastName = req.body.lastName.trim();
    const email = req.body.email.trim().toLowerCase();

    //setter sammen fornavn og etternavn til ET navn
    const navn = `${firstName} ${lastName}`;

    //gir error hvis man ikke fyller et felt
    if (!firstName || !lastName || !email.endsWith("@afk.no")) {
      return res.status(400).send("Du må bruke en afk E-post.");
    }

    //find and update, sjekker om det er en brukermed samme email i db, hvis ikke så lager den en
    const user = await User.findOneAndUpdate(
      //leter etter email
      { email: email },
      {
        //sånn man kan endre navn på pålogging
        $set: {
          navn: navn,
        },

        //gir deg en rolle hvis det er en ny bruker, trenger ikke endres.
        $setOnInsert: {
          role: "elev",
        },
      },
      {
        //gir tilbake den nye oppdaterte brukeren i db, eller lager en ny en, og så sjekker at all infoen gikk passer med schemaets regler.
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    //lager en token, med brukerens db uid, secret key, og en expiery dato
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_JWT, {
      expiresIn: "30d",
    });

    //lagre token i en cookie. gir den navn, selve tokenen, og ekstra ting som er litt over mitt skill level
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.status(500).send("Kunne ikke logge inn.");
  }
});

app.get("/lukeDashboard", requireLogin, (req, res) => {
  res.render("lukeDashboard");
});
app.get("/lukeSvar", requireLogin, (req, res) => {
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

  //denne bare sier at dagens dato er i dag. for meg akk nå er det den 18, så alle luker etter 18 er lukket.
  const dagensDato = dag;

  // denne er hvis jeg vil ha alle åpne, later som det er 24rd des
  // const dagensDato = 24;

  res.render("index", {
    dagensDato: dagensDato, //denne sender vagens dato til index ejs filen som at den vet hvilken dag det er for brukeren. den første er navnet som ejs får, mens den andre er selve variablen.
  });
});

//en get route for at luken man går in på fra dashboard skal fungere, og at den er valid. og noen små andre ting.
app.get("/admin/luke/:lukeNr", requireLogin, requireAdmin, async (req, res) => {
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
        svarType: "open",
        alternativer: [],
        riktigSvar: "",
        media: "",
        mediaType: "ingen",
      };
    }

    // Henter quiz-spørsmålene fra quizzes-kolleksjonen.
    const quiz = await quizCollection().findOne({
      _id: "christmas-quiz",
    });

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
app.get("/luke/:lukeNr", optionalLogin, async (req, res) => {
  try {
    const lukeNr = Number(req.params.lukeNr);

    if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke");
    }

    // Henter informasjonen fra luke-kolleksjonen.
    const funnetLuke = await Luke.findOne({ lukeNr: lukeNr });

    const quiz = await quizCollection().findOne({
      _id: "christmas-quiz",
    });

    const quizSporsmal = quiz?.questions?.find(
      (question) => question.id === lukeNr,
    );

    // Hvis luken ikke finnes i databasen, lager vi et midlertidig objekt.
    // Dette gjør at seed-scriptet kan levere spørsmål uten at vi må ha en Luke fra før.
    const luke = {
      lukeNr: lukeNr,
      aktiv: funnetLuke?.aktiv ?? true,
      tittel: funnetLuke?.tittel || "",
      sporsmal: funnetLuke?.sporsmal || quizSporsmal?.question || "",
      svarType: funnetLuke?.svarType || "open",
      alternativer: funnetLuke?.alternativer?.length
        ? funnetLuke.alternativer
        : quizSporsmal?.options || [],
      riktigSvar: funnetLuke?.riktigSvar || quizSporsmal?.correct_answer || "",
      media: funnetLuke?.media || quizSporsmal?.video_url || "",
      mediaType: funnetLuke?.mediaType || "ingen",
    };

    // Hvis luken er deaktivert, skal den ikke vises.
    if (!luke.aktiv) {
      return res.send("Denne luken er ikke tilgjengelig");
    }

    // Sender både luke-informasjonen og quiz-spørsmålet til EJS.
    res.render("luke", {
      quizSporsmal: quizSporsmal,
      //sjekker om brukeren nettop sendte et svar
      submitted: req.query.submitted === "true",
      eksisterendeSvar: req.query.eksisterendeSvar === "true",
      luke: luke,
      //gjør logget in eller ei til en boolean, så ikke logget in = true hvis du ikke er logget in
      loggedIn: !!req.user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Noe gikk galt");
  }
});

app.post("/luke/:lukeNr/svar", requireLogin, async (req, res) => {
  try {
    const lukeNr = Number(req.params.lukeNr);

    if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke");
    }

    const svar = req.body.svar;

    if (!svar || !svar.trim()) {
      return res.status(400).send("Du må skrive inn et svar");
    }

    const luke = await Luke.findOne({ lukeNr: lukeNr });

    if (luke && !luke.aktiv) {
      return res.status(404).send("Denne luken finnes ikke");
    }

    //sjekker db om det er et svar med denne brukerens id for denne luken sitt spørsmål
    const eksisterendeSvar = await Svar.findOne({
      lukeNr: lukeNr,
      userId: req.user._id,
    });

    //hvis det er det, skal den ikke sende in et svar.
    if (eksisterendeSvar) {
      return res.redirect(`/luke/${lukeNr}?eksisterendeSvar=true`);
    }

    await Svar.create({
      lukeNr: lukeNr,
      userId: req.user._id,
      svar: svar.trim(),
    });

    res.redirect(`/luke/${lukeNr}?submitted=true`);
  } catch (error) {
    console.log(error);
    res.status(500).send("Kunne ikke lagre svaret.");
  }
});

//post for å si at info kommer fra en post som skal bli sendt vidre
//:lukeNr i url'en endrer basert på lukeNr, som endrer basert på hvilken luke du klikker
//async for å bruke await
app.post(
  "/admin/luke/:lukeNr",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      //gjør lukeNr til et nummer
      const lukeNr = Number(req.params.lukeNr);

      //sjekker at luke nummeret er valid
      if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
        return res.status(400).send("Ugyldig luke");
      }
      const eksisterendeLuke = await Luke.findOne({ lukeNr: lukeNr });

      const quiz = await quizCollection().findOne({
        _id: "christmas-quiz",
      });

      const quizSporsmal = quiz?.questions?.find(
        (question) => question.id === lukeNr,
      );
      //spør mongoose om å finne infoen fra luke hvor lukenr er det samme som luken som er åpen for redigering i browser
      await Luke.findOneAndUpdate(
        { lukeNr: lukeNr },
        {
          //sier til mongoose hva den skal oppdatere eller lagre basert på det som blir postet, req.body / request det som er i dette feltet i body.
          $set: {
            aktiv: req.body.aktiv === "true",
            tittel: req.body.tittel || eksisterendeLuke?.tittel || "",
            sporsmal:
              req.body.sporsmal ||
              eksisterendeLuke?.sporsmal ||
              quizSporsmal?.question ||
              "",
            svarType: req.body.svarType || eksisterendeLuke?.svarType || "open",
            alternativer: req.body.alternativer
              ? req.body.alternativer
                  .split(/\r?\n/)
                  .map((option) => option.trim())
                  .filter((option) => option.length > 0)
              : eksisterendeLuke?.alternativer?.length
                ? eksisterendeLuke.alternativer
                : quizSporsmal?.options || [],

            riktigSvar:
              req.body.riktigSvar ||
              eksisterendeLuke?.riktigSvar ||
              quizSporsmal?.correct_answer ||
              "",
            media:
              req.body.media ||
              eksisterendeLuke?.media ||
              quizSporsmal?.video_url ||
              "",
            mediaType:
              req.body.mediaType || eksisterendeLuke?.mediaType || "ingen",
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
  },
);

// app.get("*", (req, res) => {
//   res.send("I am a teapot");
// });

//kobler det til en local host port, kan redigere hvilken port i .env sånn det er variabelt og lett å endre.
app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});
