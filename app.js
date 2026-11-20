const express = require("express"); // express for liveserver
const mongoose = require("mongoose"); // mongoose for å koble til mongodb
const jwt = require("jsonwebtoken"); // for authentication av brukere
const cookieParser = require("cookie-parser"); // for å lese cookies

const Luke = require("./models/Luke");
const Svar = require("./models/Svar");
const User = require("./models/User");

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

//
// disse to er for logout knapp, login knapp, eller navn i nav bar
// sjekker hvem som er logget inn på alle sider for å displaye logout eller bruker hvis man ikke er det
app.use(optionalLogin);

// gjør brukerinfo tilgjengelig i alle ejs filene for at partials nav skal fungere
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
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

    // sender deg til index, duh
    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.status(500).send("Kunne ikke logge inn.");
  }
});

//
//
//
//
//
// admin dashboard

// viser admin dashboard
app.get("/lukeDashboard", requireLogin, requireAdmin, (req, res) => {
  res.render("lukeDashboard");
});

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

    // filtrerer etter luke hvis admin har valgt en bestemt luke
    if (req.query.lukeNr) {
      const valgtLuke = Number(req.query.lukeNr);

      if (Number.isInteger(valgtLuke) && valgtLuke >= 1 && valgtLuke <= 24) {
        filter.lukeNr = valgtLuke;
      }
    }

    // henter svarene fra mongodb, nyeste først
    const svar = await Svar.find(filter).sort({ createdAt: -1 });

    // henter alle lukene så vi kan finne riktig svar for hver luke
    const luker = await Luke.find();

    // henter quiz spørsmålene fra quizzes kolleksjonen i db
    const quiz = await quizCollection().findOne({
      _id: "christmas-quiz",
    });

    // legger riktig svar til hvert svar som skal vises i oversikten.
    const svarMedRiktigSvar = svar.map((s) => {
      // finner luken som eleven svarte på
      const luke = luker.find((l) => l.lukeNr === s.lukeNr);

      // finner quiz spørsmålet med samme lukeNr
      const quizSporsmal = quiz?.questions?.find((q) => q.id === s.lukeNr);

      // henter riktig svar fra enten luke kolleksjonen eller quiz
      const riktigSvar =
        luke?.riktigSvar?.trim() ||
        quizSporsmal?.correct_answer?.trim() ||
        "ikke gitt";

      // lager et nytt objekt med informasjonen fra svaret og riktig svar
      return {
        // s er ett enkelt svar fra db, men som et mongoose doc
        // toObject gjør mongoose doc til vanlig js objekt
        // ... er spread operator som kopierer alle delene fra objektet
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
// lar admin markere et svar som riktig eller feil
app.post(
  "/lukeSvar/:svarId/vurder",
  requireLogin,
  requireAdmin,
  async (req, res) => {
    try {
      const vurdering = req.body.riktig;

      // sjekker at vurderingen faktisk er enten true eller false
      if (vurdering !== "true" && vurdering !== "false") {
        return res.status(400).send("Ugyldig vurdering.");
      }

      // finner svaret med denne id'en og oppdaterer vurderingen
      const oppdatertSvar = await Svar.findByIdAndUpdate(
        req.params.svarId,
        {
          riktig: vurdering === "true",
        },
        { new: true },
      );

      if (!oppdatertSvar) {
        return res.status(404).send("Fant ikke svaret.");
      }

      // henter filtrene som admin brukte før vurderingen
      const lukeNr = req.body.lukeNr || "";
      const status = req.body.status || "";

      // gjør filtrene om til en query string som kan brukes i urlen
      const query = new URLSearchParams({
        lukeNr: lukeNr,
        status: status,
      }).toString();

      // sender admin tilbake til samme svaroversikt
      res.redirect(`/lukeSvar?${query}`);
    } catch (error) {
      console.log(error);
      res.status(500).send("Kunne ikke vurdere svaret.");
    }
  },
);

//
// logger ut brukeren ved å fjerne login cookien
app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.redirect("/");
});

//
//
//
//
//
// hovedside

// viser julekalenderen og finner dagens dato
app.get("/", async (req, res) => {
  // henter dagens dato
  const dato = new Date();

  // finner hvilken dag det er i norge
  // bruker Europe/Oslo så det ikke er avhengig av tidssonen til serveren
  const dag = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Oslo",
      day: "numeric",
    }).format(dato),
  );

  // dagens dato bestemmer hvilke luker som er åpne
  const dagensDato = dag;

  // denne kan brukes når du vil teste kalenderen som om det er 24. desember
  // const dagensDato = 24;

  // sender datoen til index.ejs så den vet hvilke luker som skal være åpne
  res.render("index", {
    dagensDato: dagensDato,
  });
});

//
//
//
//
//
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

      // henter quiz spørsmålene fra quizzes kolleksjonen
      const quiz = await quizCollection().findOne({
        _id: "christmas-quiz",
      });

      // finner spørsmålet som hører til denne luken
      const quizSporsmal = quiz?.questions?.find(
        (question) => question.id === lukeNr,
      );

      // gjør alternativene fra tekstfeltet om til en array
      const alternativer = Array.isArray(req.body.alternativer)
        ? req.body.alternativer
        : typeof req.body.alternativer === "string"
          ? req.body.alternativer.split(/\r?\n/)
          : [];

      const rensedeAlternativer = alternativer
        .map((option) => option.trim())
        .filter((option) => option.length > 0);

      // oppdaterer luken i mongodb
      await Luke.findOneAndUpdate(
        { lukeNr: lukeNr },

        {
          // $set sier hvilke felt som skal oppdateres eller lagres
          $set: {
            aktiv: req.body.aktiv === "true",

            // bruker verdiene fra skjemaet direkte, også hvis feltet er tomt
            tittel: (req.body.tittel || "").trim(),

            sporsmal: (req.body.sporsmal || "").trim(),

            svarType: req.body.svarType || "open",

            alternativer: rensedeAlternativer,

            riktigSvar: (req.body.riktigSvar || "").trim(),

            media: (req.body.media || "").trim(),

            mediaType: req.body.mediaType || "ingen",
          },
        },

        {
          // upsert oppdaterer luken hvis den finnes, eller lager den hvis den ikke finnes
          upsert: true,

          // sjekker at informasjonen følger reglene i schemaet
          runValidators: true,

          // sørger for at schemaets default-verdier brukes når en ny luke opprettes
          setDefaultOnInsert: true,
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

//
//
//
//
//
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
      mediaType: funnetLuke?.mediaType || "ingen",
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

    // sjekker om luken er deaktivert
    if (luke && !luke.aktiv) {
      return res.status(404).send("Denne luken finnes ikke");
    }

    // finner riktig svar fra enten luke-kolleksjonen eller quiz
    const riktigSvar =
      luke?.riktigSvar?.trim() || quizSporsmal?.correct_answer?.trim() || "";

    // null betyr at svaret ikke er vurdert automatisk
    let riktig = null;

    // hvis det er flervalg, kan vi sammenligne svaret med riktig svar automatisk
    if (
      (luke?.svarType || "open") === "multiple_choice" ||
      (!luke && quizSporsmal?.options?.length)
    ) {
      riktig =
        svar.trim().toLocaleLowerCase("no-NO") ===
        riktigSvar.toLocaleLowerCase("no-NO");
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

//
// starter serveren

// kobler nettsiden til en lokal port, som kan endres i .env
app.listen(process.env.PORT, () => {
  console.log(`listening on http://localhost:${process.env.PORT}`);
});
