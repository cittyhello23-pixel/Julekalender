const express = require("express"); // express for liveserver
const mongoose = require("mongoose"); // mongoose for å koble til mongodb
const jwt = require("jsonwebtoken"); // for authentication av brukere
const cookieParser = require("cookie-parser"); // for å lese cookies

const Luke = require("./models/Luke");
const Svar = require("./models/Svar");
const User = require("./models/User");
const Vinner = require("./models/Vinner");

const app = express();

require("dotenv").config();

app.set("view engine", "ejs"); // sier til express hvilken template engine den skal bruke
app.use(express.urlencoded({ extended: true })); // lar express lese info fra en html form
app.use(express.static("public")); // gjør at express leter i public automatisk
app.use(cookieParser()); // gjør at vi kan lese cookies fra brukeren

mongoose.connect(process.env.MONGODB_URI); // kobler mongoose og mongodb gjennom env

// henter quiz-kolleksjonen direkte fra mongodb
const quizCollection = () => mongoose.connection.db.collection("quizzes");

//
//
//
//
//
// middleware

// denne funksjonen blokkerer brukere som ikke er logget inn
const requireLogin = async (req, res, next) => {
  try {
    // tar login token fra cookies
    const token = req.cookies.token;

    // sjekker om det eksisterer en token
    if (!token) {
      return res.status(401).json({ loginRequired: true });
    }

    // sjekker om token er gyldig med nøkkelen fra env
    const decoded = jwt.verify(token, process.env.SECRET_JWT);

    // tar ut brukerens id fra token og leter etter brukeren i mongodb
    const user = await User.findById(decoded.userId);

    // sjekker om brukeren faktisk fortsatt eksisterer i databasen
    // en bruker kan ha en gyldig token selvom kontoen har blitt slettet
    if (!user) {
      return res.status(401).json({ loginRequired: true });
    }

    // lagrer brukerens info så andre routes kan bruke den
    req.user = user;

    // sier til express at brukeren har tilgang videre
    next();
  } catch (error) {
    return res.status(401).json({ loginRequired: true });
  }
};

// denne funksjonen sjekker om noen er logget inn uten å blokkere dem
const optionalLogin = async (req, res, next) => {
  try {
    // henter token fra cookies
    const token = req.cookies.token;

    // hvis det ikke finnes en token, er brukeren ikke logget inn
    if (!token) {
      req.user = null;
      return next();
    }

    // sjekker om token er gyldig
    const decoded = jwt.verify(token, process.env.SECRET_JWT);

    // henter brukeren fra mongodb
    const user = await User.findById(decoded.userId);

    // lagrer brukeren hvis den finnes, ellers null
    req.user = user || null;

    next();
  } catch (error) {
    // hvis token er ugyldig, behandles brukeren som utlogget
    req.user = null;
    next();
  }
};

// sjekker om brukeren er admin
// denne brukes etter requireLogin, så vi vet at brukeren er logget inn
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).send("Du har ikke tilgang til denne siden.");
  }

  next();
};

// sjekker login-status på alle sider og gjør brukeren tilgjengelig i EJS
app.use((req, res, next) => {
  optionalLogin(req, res, () => {
    // res.locals gjør at currentUser er tilgjengelig i alle EJS-filer
    res.locals.currentUser = req.user || null;
    next();
  });
});

//
//
//
//
//
// login

// viser login-siden
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/hjelp", (req, res) => {
  res.render("hjelp");
});

// tar imot informasjonen fra login form
app.post("/login", async (req, res) => {
  try {
    // henter informasjonen fra form, fjerner unødvendige mellomrom og uppercase
    const firstName = (req.body.firstName || "").trim();
    const lastName = (req.body.lastName || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();

    // setter sammen fornavn og etternavn til ett navn
    const navn = `${firstName} ${lastName}`;

    // gir error hvis man ikke fyller ut alt eller bruker feil epost
    if (!firstName || !lastName || !email.endsWith("@afk.no")) {
      return res.status(400).send("Du må bruke en afk E-post.");
    }

    // finner en bruker med samme email, eller lager en ny hvis den ikke finnes
    const user = await User.findOneAndUpdate(
      // leter etter brukeren med denne e-posten
      { email: email },

      {
        // oppdaterer navnet hvis brukeren allerede eksisterer
        $set: {
          navn: navn,
        },

        // gir nye brukere rollen elev
        $setOnInsert: {
          role: "elev",
        },
      },

      {
        // gir tilbake den oppdaterte brukeren
        new: true,

        // lager en ny bruker hvis ingen med denne e-posten finnes
        upsert: true,

        // sjekker at informasjonen følger reglene i schemaet
        runValidators: true,
      },
    );

    // lager en token med brukerens mongodb id og en utløpsdato
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_JWT, {
      expiresIn: "30d",
    });

    // lagrer token i en cookie, og masse bs som er for sikkerhet som er langt over mitt skill level
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    //sender deg til index, duh
    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.status(500).send("Kunne ikke logge inn.");
  }
});

// logger ut brukeren ved å slette login-cookien
app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

//
//
//
//
//
// admin dashboard

// viser admin dashboard

app.get("/lukeDashboard", requireLogin, requireAdmin, async (req, res) => {
  try {
    // ny variabel som har tid og dato
    const dato = new Date();

    // siden js funksjonen for dato ikke automatisk går til ordentlig norsk tid gjør man det til det med dette. intl for internasjional formatering
    // dag er objektet som har infoen til dager. den vet og sier at idag er idag.
    const dag = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Oslo",
        day: "numeric",

        // det er denne linjen som kjører formateringen, gjør strings til tall f eks
      }).format(dato),
    );

    // dagens dato bestemmer hvilken luke vi skal trekke vinner for
    // bruker ternary for en kort if else. hvis dag er større eller er lik 1, OG mindre eller er lik 24, bruk dag. hvis ikke, bruk null
    const dagensLukeNr = dag >= 1 && dag <= 24 ? dag : null;

    // det er denne som lager valgtLukeNr
    // hvis admin har valgt en annen luke i meny bruker man den istedenfor dagens luke
    let valgtLukeNr = req.query.lukeNr
      ? Number(req.query.lukeNr)
      : dagensLukeNr;

    // sjekker at nummeret er valid, hvis det er det, velger vi den som luken vi skal trekke for
    // hvis valgtLukeNr IKKE er et heltall, ELLER hvis det er for stort eller for lite, skal det ikke fungere
    if (!Number.isInteger(valgtLukeNr) || valgtLukeNr < 1 || valgtLukeNr > 24) {
      valgtLukeNr = dagensLukeNr;
    }

    // dagensVinner er, vel, den dagens vinner
    // starter med null fordi den har ikke sjekket db enda. men hvis en vinner eksisterer, blir null erstattet
    let dagensVinner = null;

    // dette lagrer nummeret av svar dokumenter som kan bli trukket som vinner. exclude ikke vurderte og feil svar.
    let antallKvalifiserte = 0;

    // if statement, hvis det er en luke valgt skal den sjekke db for om det er en vinner for luken
    if (valgtLukeNr) {
      dagensVinner = await Vinner.findOne({
        lukeNr: valgtLukeNr,
        // leter etter navnet på personen med å reference uid'en i vinners med den i users, og tar navnet dems
      }).populate("userId", "navn");

      // denne er for svar kolleksjonen. teller hvor mange som har samme nummer i lukeNr som valgtLukeNr OG har riktig svar
      antallKvalifiserte = await Svar.countDocuments({
        lukeNr: valgtLukeNr,
        riktig: true,
      });
    }

    // denne bare gjør infoen tilgjengelig hver gang siden refresher.
    // en for dagens luke, luken som er valgt, vinneren for den luken, nummeret på kandidater, og om vinner var nettopp lagret.
    res.render("lukeDashboard", {
      dagensLukeNr,
      valgtLukeNr,
      dagensVinner,
      antallKvalifiserte,
      vinnerLagret: req.query.vinnerLagret === "true",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Kunne ikke hente dashboardet.");
  }
});

// trekker en tilfeldig vinner blant brukere med riktig svar
app.post(
  "/admin/vinner/trekk",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      // henter lukeNr fra fetch-requesten og gjør det om til et tall
      const lukeNr = Number(req.body.lukeNr);

      // sjekker at lukeNr er gyldig
      if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
        return res.status(400).json({ error: "Ugyldig luke." });
      }

      // finner alle svar på denne luken som er vurdert som riktige
      // populate henter brukeren som står bak hvert svar
      const svar = await Svar.find({
        lukeNr: lukeNr,
        riktig: true,
      }).populate("userId", "navn");

      // fjerner svar der brukeren ikke lenger finnes
      const kandidater = svar.filter((item) => item.userId);

      // sjekker at det faktisk finnes noen kandidater
      if (kandidater.length === 0) {
        return res.status(404).json({
          error: "Ingen kvalifiserte svar er registrert for denne luken.",
        });
      }

      // velger en tilfeldig kandidat fra listen
      const tilfeldigIndex = Math.floor(Math.random() * kandidater.length);
      const valgtKandidat = kandidater[tilfeldigIndex];

      // sender kandidatens informasjon tilbake som JSON
      res.json({
        userId: String(valgtKandidat.userId._id),
        navn: valgtKandidat.userId.navn,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Kunne ikke trekke en vinner." });
    }
  },
);

// lagrer vinneren etter at admin har bekreftet trekningen
app.post(
  "/admin/vinner/bekreft",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      const lukeNr = Number(req.body.lukeNr);
      const userId = req.body.userId;

      // sjekker at lukeNr og userId er gyldige
      if (
        !Number.isInteger(lukeNr) ||
        lukeNr < 1 ||
        lukeNr > 24 ||
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return res.status(400).send("Ugyldig luke eller bruker.");
      }

      // kontrollerer at brukeren faktisk har svart riktig på denne luken
      // viktig fordi skjemaets hidden inputs kan endres i nettleseren
      const kvalifisertSvar = await Svar.findOne({
        lukeNr: lukeNr,
        userId: userId,
        riktig: true,
      });

      if (!kvalifisertSvar) {
        return res.status(400).send("Brukeren er ikke kvalifisert.");
      }

      // sjekker at brukeren fortsatt finnes
      const bruker = await User.findById(userId);

      if (!bruker) {
        return res.status(404).send("Fant ikke brukeren.");
      }

      // oppdaterer vinneren hvis luken allerede har en,
      // eller oppretter en ny vinner hvis den ikke har det
      await Vinner.findOneAndUpdate(
        { lukeNr: lukeNr },
        {
          $set: {
            userId: userId,
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );

      // sender admin tilbake til dashboardet
      res.redirect(`/lukeDashboard?lukeNr=${lukeNr}&vinnerLagret=true`);
    } catch (error) {
      console.log(error);
      res.status(500).send("Kunne ikke lagre vinneren.");
    }
  },
);

// henter alle svar og viser dem i admin sin svaroversikt
app.get("/lukeSvar", requireLogin, requireAdmin, async (req, res) => {
  try {
    // lager et tomt filter som man legger til ting i basert på hva admin velger
    const filter = {};

    // filtrerer etter om svaret er riktig, feil eller ikke vurdert
    if (req.query.status === "riktig") {
      filter.riktig = true;
    }

    if (req.query.status === "feil") {
      filter.riktig = false;
    }

    if (req.query.status === "ikkeVurdert") {
      filter.riktig = null;
    }

    // filtrerer etter luke hvis admin har valgt en bestemt luke. man kan bruke begge to samtidig! yay!
    if (req.query.lukeNr) {
      filter.lukeNr = Number(req.query.lukeNr);
    }

    // henter svarene fra mongodb, nyeste først
    const svar = await Svar.find(filter).sort({ createdAt: -1 });

    // henter alle lukene så vi kan finne riktig svar for hver luke
    const luker = await Luke.find();

    // henter quiz spørsmålene fra quizzes kolleksjonen i db
    const quiz = await quizCollection().findOne({
      _id: "christmas-quiz",
    });
    //
    //
    //
    //
    // legger riktig svar  til hvert svar som skal vises i oversikten.
    // svar.map går gjennom arrayen "svar", lager en ny array med resultatene, s er et variabel navn for alle svarene induviduelt.
    // det er fordi at den skal vise både det eleven svarer, og det som er riktig svar.
    // kan ikke ta alt fra elevsvar db'en, fordi der skal det ikke vises hva som er det riktige svaret, det er bare i lukes and quizzes kolleksjonene
    const svarMedRiktigSvar = svar.map((s) => {
      // finner luken som eleven svarte på
      const luke = luker.find((l) => l.lukeNr === s.lukeNr);

      // finner quiz spørsmålet med samme lukeNr
      //?. er bare sånn hvis infoen den leter etter ikke er der så går den vidre, bare gir en "undefined" istedefor og crashe. som et safety net
      const quizSporsmal = quiz?.questions?.find((q) => q.id === s.lukeNr);

      // henter riktig svar fra enten luke kolleksjonen eller quiz
      const riktigSvar =
        luke?.riktigSvar?.trim() ||
        quizSporsmal?.correct_answer?.trim() ||
        "ikke gitt";

      // lager et nytt objekt med informasjonen fra svaret og riktig svar,sender det til luke svar siden for og vise elev svar OG riktig svar
      return {
        // s er ett enkelt svar fra db, men som et mongoose doc
        // toObject gjør mongoose doc til vanlig js objekt
        // ... er spread operator som kopierer alle delene fra det nye objektet inn i ENDA et nytt objekt
        // sånn vi kan beholde infoen fra svar, men også ha et nytt objekt vi kan legge til det riktige svaret ved siden av s (elevet sitt svar)
        ...s.toObject(),
        riktigSvar: riktigSvar,
      };
    });

    // sender svarene og filtrene til ejs filen
    res.render("lukeSvar", {
      svar: svarMedRiktigSvar,
      valgtLuke: req.query.lukeNr || "",
      valgtStatus: req.query.status || "",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Kunne ikke hente svar.");
  }
});
//
//
//
//
//
// lar admin markere et svar som riktig eller feil, og filtrere svar
//
app.post(
  "/lukeSvar/:svarId/vurder",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      const vurdering = req.body.riktig;

      // sjekker at vurderingen faktisk er enten true eller false sånn man ikke kan f eks sette null som vurdering. det er bare for de som IKKE er vurderte
      if (vurdering !== "true" && vurdering !== "false") {
        return res.status(400).send("Ugyldig vurdering.");
      }

      // finner svaret med denne id'en og oppdaterer vurderingen til at den er vurdert
      await Svar.findByIdAndUpdate(req.params.svarId, {
        riktig: vurdering === "true",
      });

      // henter filtrene som admin brukte før vurderingen
      // så man kan beholde samme filter når siden lastes inn igjen
      const lukeNr = req.body.lukeNr || "";
      const status = req.body.status || "";

      // gjør filtrene om til en query string som kan brukes i urlen
      //query her er bare variabel navn, men bruker det fordi den skal lage en query string
      //
      const query = new URLSearchParams({
        lukeNr: lukeNr,
        status: status,
      }).toString();

      // sender admin tilbake til samme svar
      // id-en etter # gjør at nettleseren kan scrolle til riktig svar
      res.redirect(`/lukeSvar?${query}`);
    } catch (error) {
      console.log(error);
      res.status(500).send("Kunne ikke vurdere svaret.");
    }
  },
);

//
//
//
//
//
// hovedside

// viser julekalenderen og finner dagens dato

// viser julekalenderen og finner dagens dato
app.get("/", async (req, res) => {
  // henter dagens dato
  const dato = new Date();

  // finner hvilken dag det er i Norge
  const dag = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Oslo",
      day: "numeric",
    }).format(dato),
  );

  // dagens dato bestemmer hvilke luker som er åpne
  const dagensDato = dag;

  // henter alle lagrede vinnere og navnene deres
  const vinnere = await Vinner.find().populate("userId", "navn");

  // lager et objekt der lukeNr brukes som nøkkel og vinnerens navn som verdi
  const vinnerNavn = {};

  vinnere.forEach((vinner) => {
    if (vinner.userId) {
      vinnerNavn[vinner.lukeNr] = vinner.userId.navn;
    }
  });

  // sender datoen og vinnernavnene til index.ejs
  res.render("index", {
    dagensDato: dagensDato,
    vinnerNavn: vinnerNavn,
  });
});

// redigere luker

// henter en bestemt luke fra dashboardet og viser den i editoren
app.get("/admin/luke/:lukeNr", requireLogin, requireAdmin, async (req, res) => {
  try {
    // tar lukeNr fra URL-en og gjør det om til et tall
    const lukeNr = Number(req.params.lukeNr);

    // sjekker at lukeNr er et gyldig heltall mellom 1 og 24
    if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke");
    }

    // leter etter informasjon om denne luken i luke-kolleksjonen
    let luke = await Luke.findOne({ lukeNr: lukeNr });

    // hvis luken ikke finnes i mongodb, lager vi et midlertidig objekt
    // dette gjør at admin kan redigere en luke selv om den ikke er lagret fra før
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

    // henter quiz-spørsmålene fra quizzes-kolleksjonen
    const quiz = await quizCollection().findOne({
      _id: "christmas-quiz",
    });

    // finner spørsmålet som hører til denne luken
    const quizSporsmal = quiz?.questions?.find(
      (question) => question.id === lukeNr,
    );

    // sender både luke og quiz-spørsmål til editoren
    res.render("lukeEditor", {
      luke: luke,
      quizSporsmal: quizSporsmal,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Noe gikk galt");
  }
});

// lagrer endringene admin gjør i en luke
app.post(
  "/admin/luke/:lukeNr",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      // gjør lukeNr fra URL-en om til et tall
      const lukeNr = Number(req.params.lukeNr);

      // sjekker at luke nummeret er gyldig
      if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
        return res.status(400).send("Ugyldig luke");
      }

      // henter informasjonen som allerede finnes om denne luken
      const eksisterendeLuke = await Luke.findOne({ lukeNr: lukeNr });

      // henter quiz-spørsmålene fra quizzes-kolleksjonen
      const quiz = await quizCollection().findOne({
        _id: "christmas-quiz",
      });

      // finner spørsmålet som hører til denne luken
      const quizSporsmal = quiz?.questions?.find(
        (question) => question.id === lukeNr,
      );

      // oppdaterer luken i mongodb
      await Luke.findOneAndUpdate(
        { lukeNr: lukeNr },

        {
          // $set sier hvilke felt som skal oppdateres eller lagres
          $set: {
            aktiv: req.body.aktiv === "true",

            tittel: req.body.tittel || eksisterendeLuke?.tittel || "",

            sporsmal:
              req.body.sporsmal ||
              eksisterendeLuke?.sporsmal ||
              quizSporsmal?.question ||
              "",

            svarType: req.body.svarType || eksisterendeLuke?.svarType || "open",

            // deler alternativene på linjeskift så hvert alternativ blir en egen verdi i arrayet
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
          // upsert oppdaterer luken hvis den finnes, eller lager den hvis den ikke finnes
          upsert: true,

          // sjekker at informasjonen følger reglene i schemaet
          runValidators: true,

          // sørger for at schemaets default-verdier brukes når en ny luke opprettes
          setDefaultsOnInsert: true,
        },
      );

      // sender admin tilbake til editoren for samme luke etter lagring
      res.redirect(`/admin/luke/${lukeNr}`);
    } catch (error) {
      console.log(error);
      res.status(500).send("Kunne ikke lagre luken.");
    }
  },
);

app.get("/brukere", requireLogin, requireAdmin, async (req, res) => {
  try {
    // henter alle brukerne og svarene deres
    const brukere = await User.find().sort({ navn: 1 });
    const svar = await Svar.find();

    // lager en oversikt over hver bruker
    const brukerOversikt = brukere.map((bruker) => {
      // finner alle svarene som tilhører denne brukeren
      const brukerSvar = svar.filter(
        (s) => s.userId && s.userId.toString() === bruker._id.toString(),
      );

      // teller hvor mange av svarene som er riktige
      const riktigeSvar = brukerSvar.filter((s) => s.riktig === true).length;

      return {
        navn: bruker.navn,
        email: bruker.email,
        uid: bruker._id,
        antallSvar: brukerSvar.length,
        riktigeSvar: riktigeSvar,
      };
    });

    res.render("brukere", { brukere: brukerOversikt });
  } catch (error) {
    console.error("Feil ved henting av brukere:", error);
    res.status(500).send("Kunne ikke hente brukerne");
  }
});

// åpne luker og sende inn svar

// viser en luke når noen klikker på den i julekalenderen
app.get("/luke/:lukeNr", async (req, res) => {
  try {
    const lukeNr = Number(req.params.lukeNr);

    // sjekker at lukeNr er et gyldig heltall mellom 1 og 24
    if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke");
    }

    // henter informasjonen fra luke-kolleksjonen
    const funnetLuke = await Luke.findOne({ lukeNr: lukeNr });

    // finner vinneren for denne luken og henter navnet fra User
    const vinner = await Vinner.findOne({
      lukeNr: lukeNr,
    }).populate("userId", "navn");

    // henter quiz-spørsmålene fra quizzes-kolleksjonen
    const quiz = await quizCollection().findOne({
      _id: "christmas-quiz",
    });

    // finner spørsmålet som hører til denne luken
    const quizSporsmal = quiz?.questions?.find(
      (question) => question.id === lukeNr,
    );

    // hvis luken ikke finnes i databasen, lager vi et midlertidig objekt
    // dette gjør at seed-scriptet kan levere spørsmål uten at vi må ha en Luke fra før
    const luke = {
      lukeNr: lukeNr,
      aktiv: funnetLuke?.aktiv ?? true,
      tittel: funnetLuke?.tittel || "",
      sporsmal: funnetLuke?.sporsmal || quizSporsmal?.question || "",
      svarType: funnetLuke?.svarType || "open",

      // bruker alternativene fra luke hvis de finnes, ellers hentes de fra quiz
      alternativer: funnetLuke?.alternativer?.length
        ? funnetLuke.alternativer
        : quizSporsmal?.options || [],

      riktigSvar: funnetLuke?.riktigSvar || quizSporsmal?.correct_answer || "",

      media: funnetLuke?.media || quizSporsmal?.video_url || "",
      mediaType:
        funnetLuke?.mediaType === "video" || funnetLuke?.mediaType === "bilde"
          ? funnetLuke.mediaType
          : quizSporsmal?.video_url
            ? "video"
            : "ingen",
    };

    // hvis luken er deaktivert, skal den ikke vises
    if (!luke.aktiv) {
      return res.send("Denne luken er ikke tilgjengelig");
    }

    // sender informasjonen til luke.ejs
    res.render("luke", {
      luke: luke,
      quizSporsmal: quizSporsmal,

      // sjekker om brukeren nettopp sendte et svar
      submitted: req.query.submitted === "true",

      // sjekker om brukeren allerede har svart på denne luken
      eksisterendeSvar: req.query.eksisterendeSvar === "true",

      // gjør innloggingsstatus om til true eller false
      loggedIn: !!req.user,

      vinner: vinner,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Noe gikk galt");
  }
});

// tar imot og lagrer svar fra elever
app.post("/luke/:lukeNr/svar", requireLogin, async (req, res) => {
  try {
    const lukeNr = Number(req.params.lukeNr);

    // sjekker at lukeNr er et gyldig heltall mellom 1 og 24
    if (!Number.isInteger(lukeNr) || lukeNr < 1 || lukeNr > 24) {
      return res.status(400).send("Ugyldig luke");
    }

    // henter svaret fra skjemaet
    const svar = req.body.svar;

    // sjekker at eleven faktisk har skrevet eller valgt et svar
    if (typeof svar !== "string" || !svar.trim()) {
      return res.status(400).send("Du må skrive inn et svar");
    }

    // henter luken fra mongodb
    const luke = await Luke.findOne({ lukeNr: lukeNr });

    // henter quiz-spørsmålene fra quizzes-kolleksjonen
    const quiz = await quizCollection().findOne({
      _id: "christmas-quiz",
    });

    // finner spørsmålet som hører til denne luken
    const quizSporsmal = quiz?.questions?.find(
      (question) => question.id === lukeNr,
    );

    // finner riktig svar fra enten luke-kolleksjonen eller quiz
    const riktigSvar =
      luke?.riktigSvar?.trim() || quizSporsmal?.correct_answer?.trim() || "";

    // null betyr at svaret ikke er vurdert automatisk
    let riktig = null;

    // hvis det er flervalg, kan vi sammenligne svaret med riktig svar automatisk
    if (luke?.svarType === "multiple_choice") {
      riktig =
        svar.trim().toLocaleLowerCase("no-NO") ===
        riktigSvar.toLocaleLowerCase("no-NO");
    }

    // sjekker om luken er deaktivert
    if (luke && !luke.aktiv) {
      return res.status(404).send("Denne luken finnes ikke");
    }

    // sjekker mongodb for å se om denne brukeren allerede har svart på denne luken
    const eksisterendeSvar = await Svar.findOne({
      lukeNr: lukeNr,
      userId: req.user._id,
    });

    // hvis brukeren allerede har svart, skal den ikke kunne sende inn et nytt svar
    if (eksisterendeSvar) {
      return res.redirect(`/luke/${lukeNr}?eksisterendeSvar=true`);
    }

    // lagrer svaret i mongodb
    await Svar.create({
      lukeNr: lukeNr,
      userId: req.user._id,
      svar: svar.trim(),
      riktig: riktig,
    });

    // sender brukeren tilbake til samme luke med en melding om at svaret er sendt
    res.redirect(`/luke/${lukeNr}?submitted=true`);
  } catch (error) {
    console.log(error);
    res.status(500).send("Kunne ikke lagre svaret.");
  }
});

// starter serveren

// kobler nettsiden til en lokal port, som kan endres i .env
app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});
