# Bleiker julekalender

## Om prosjektet

Bleiker julekalender er en digital julekalender laget for skolen, hvor elever kan åpne luker gjennom desember og delta i forskjellige aktiviteter ved å svare på spørsmål. Målet med prosjektet var å utvikle en webapp som både er enkel å bruke for elever og enkel å administrere for lærere, samtidig som den gir litt julestemning og fungerer på både mobil og datamaskin.

Kalenderen består av 24 luker, hvor hver luke kan inneholde et spørsmål, tekst, bilde eller video. Elevene kan logge inn med skole e posten sin, åpne tilgjengelige luker og sende inn svar. Tidligere luker viser også navnet på vinneren, slik at man kan se hvem som vant de tidligere trekningene.

Prosjektet er utviklet individuelt med node, express, ejs og MongoDB. Jeg har også brukt git og github gjennom utviklingen for å holde orden på endringer, branches og forskjellige deler av prosjektet som vi har lært. Men jeg var litt glemsk noen ganger på og commite og lage branches, men above all, det fungerte og jeg skjønner det.

---

## Funksjonalitet

### For elever og andre brukere

Når man besøker nettsiden kommer man til forsiden, hvor alle de 24 lukene vises i en kalender (en fin, 4x6 grid som passer perfekt siden det er 24, men den endrer basert på skjerm størrelse). Lukene har forskjellige farger ut fra om de er i fortiden, dagens dato eller framtiden, slik at det er enkelt å se hvilke luker som er tilgjengelige.

Kalenderen bruker datoen fra tidssonen europe/oslo, og ikke bare datoen som er satt på brukerens egen datamaskin. Dette er viktig fordi man ikke skal kunne endre datoen på sin egen pc eller mobil for å åpne framtidige luker.

For å delta må brukeren logge inn med fornavn, etternavn og skole e post. Innloggingen brukes blant annet til å knytte svar til riktig bruker og gjøre det mulig å kontakte vinnere.

Når en bruker åpner en tilgjengelig luke, vises innholdet som er lagt inn av admin. Dette kan være et spørsmål med tekstsvar, eller flervalgsspørsmål eller innhold med bilde og video.

Brukeren kan sende inn svar gjennom skjemaet på luken. Svarene lagres i MongoDB, og brukeren får tilbakemelding dersom noe ikke fungerer eller dersom svaret allerede er sendt inn.

Det er også laget en hjelpeside og egne feilsider, slik at brukeren får mer forståelige tilbakemeldinger hvis noe går galt.

### For admin

Admin har tilgang til et eget admin dashboard hvor de kan administrere kalenderen og se informasjon om brukere, luker, og svar.

Det er laget en oversikt over de forskjellige lukene, hvor admin kan gå inn på en bestemt luke og redigere innholdet. Her kan man blant annet legge inn spørsmål, velge svartype, legge til alternativer og legge inn media. Dette endrer det som er i db for den luken, men blir overidet av seed hvis man løper det igjen. Dette ble gjort fordi jeg lagde luke redigering ETTER vi fikk en seed.js, og jeg ville ikke bortkastet de timene med arbeid. Det ente opp med at jeg bortkastet enda mer timer på å få dem til å sammkjøre.

Dashboardet har også en oversikt over innsendte svar. admin kan se svarene og bestemme om de skal registreres som riktige eller gale. Det finnes også filtrering som gjør det enklere å finne bestemte svar. Den velger automatisk om flervalgs spørsmal er riktig eller galt, men admin kan endre på det hvis de ønsker.

Det er i tillegg laget en oversikt over deltakerne og en funksjon for å trekke en tilfeldig vinner blant kvalifiserte deltakere. Trekningen må bekreftes før vinneren registreres, slik at man ikke ved et uhell registrerer feil person. Jeg gjorde sånn at man måtte registrere brukeren som vinner, fordi hvis den bare trakk en person og med en gang putta dem på hjem siden som vinner, hadde det vært mulig og bare lage en bruker med f eks n ordet som fornavn. Det hadde puttet det automatisk på hjem siden, så ville gi det et ekstra manuelt steg for filtrering av dårlige brukere.

---

## Teknologier

### Node.js

Node.js brukes til å kjøre js på serveren. Det gjør at applikasjonen kan behandle forespørsler, kommunisere med databasen og håndtere funksjonaliteten som ikke skal utføres direkte i nettleseren.

### Express

Express brukes til å bygge serveren og fikse rutene i applikasjonen. Det bestemmer f eks hvilken side som skal vises når brukeren besøker en bestemt URL, og gjør innsending av skjemaer til db.

### EJS

Ejs brukes som template engine for nettsidene. Det gjør det mulig å kombinere html med javascript, slik at innhold fra MongoDB kan vises dynamisk. Jeg bruker også ejs partials for deler av nettsiden som går igjen, som head, navigasjon og footer (som jeg ikke brukte, oops). Alt det gjør at man kan ha spesifike sider, som «localhost:/luke/lukeNr» vise info fra den spesifike luken i db.

### MongoDB

MongoDB brukes som database for å lagre informasjon om luker, brukere, svar og vinnere.

### Mongoose

Mongoose brukes til å koble node til MongoDB og gjøre det enklere å arbeide med dataene gjennom modeller og schemas, og at det blir vist på en fin måte i mongoDB compass.

### Html og css

html brukes til å bygge opp innholdet på nettsidene, mens css brukes til utseende, plassering, farger, animasjoner og tilpasning til forskjellige skjermstørrelser. Veldig basic, det første vi lærte på vg1 utvikling, så det er godt inn i hodet mitt.

### Javascript

Javascript brukes både på serveren og i nettleseren. På serveren håndterer det blant annet ruter, databaseoperasjoner og innlogging, mens javascript i nettleseren brukes til funksjoner som login popup. Brukte det nesten bare i app.js i get og post ruter, men litt i modellene og den ene for popupen.

### Jwt og cookie parser

Jwt (json web token) brukes til å håndtere innlogging og autentisering. Tokenet lagres i en cookie, og cookie parser brukes til å lese denne cookien på serveren.

### Git og github

Git brukes til versjonskontroll, slik at jeg kan holde oversikt over endringer og arbeide med forskjellige funksjoner separat. GitHub brukes til å lagre repositoryet og dele prosjektet.

Mye git add ., git commit -m””, git push origin branch, etc etc.

---

## Installasjon

For å hente prosjektet lokalt må man først klone repositoryet fra GitHub.

**Repository:**

[https://github.com/cittyhello23-pixel/Julekalender](https://github.com/cittyhello23-pixel/Julekalender)

Etter at repositoryet er klonet, må man åpne prosjektmappen i terminalen og installere dependencies.

```bash
npm install
```

Dette installerer pakkene som prosjektet trenger for å fungere.

Man må også ha node installert og tilgang til en MongoDB database.

---

## Konfigurasjon

Prosjektet bruker .env for informasjon som ikke skal ligge direkte i kildekoden, som spurt lagde jeg også en .env.example som ER i kilde koden, sånn dere kan se at jeg bruker det og alt, og klone setup for at det skal fungere å nedlaste.

**Env axample:**

```env
PORT=4000

MONGODB_URI=

SECRET_JWT=
```

Port bestemmer hvilken port Express serveren skal bruke.

MONGODB_URI inneholder link til mongoDB databasen.

SECRET_JWT brukes som hemmelig nøkkel når JWT token opprettes og verifiseres. Denne lagde jeg med å bruke lastpass password generator, sette opp karakterene til 10-20 cirka, så skru av symboler. F eks: **j8cP7QM1i9AoMHSI90T**

Man må fylle inn egne verdier før applikasjonen kan startes, .env skal ikke lastes opp til GitHub, siden den inneholder sensitiv informasjon, for meg er det bare JWT nøkkel.

---

## Database

MongoDB brukes til å lagre informasjonen som applikasjonen trenger. Jeg bruker mongoose for å opprette modeller og schemas, slik at informasjonen har en bestemt struktur.

Prosjektet har fire hovedmodeller.

### Luke

Luke modellen inneholder informasjon om hver av de 24 lukene.

Den har blant annet lukeNr, som bestemmer hvilken luke det er, og aktiv, som gjør det mulig for admin å deaktivere en luke dersom det er nødvendig.

Den inneholder også tittel og sporsmal, som brukes til å vise innholdet på luken.

For media brukes media og mediaType, hvor media kan være bilde, video eller ingen media.

Spørsmålene kan ha forskjellige svartype, og derfor finnes også svarType, alternativer og riktigSvar.

### Svar

Svar modellen lagrer svarene som brukerne sender inn.

Den inneholder lukeNr, som viser hvilken luke svaret tilhører, userId, som kobler svaret til brukeren, og svar, som inneholder selve svaret. createdAt lagrer tidspunktet svaret ble opprettet.

Svarene kan behandles videre av administrator, som kan registrere om de er riktige eller gale.

### User

User modellen lagrer informasjon om alle brukerne som har logget inn. Den inneholder navn, e post og rolle.

E postadressen må tilhøre afk, slik at det bare er brukere med riktig skole e post som kan opprette konto.

Role bestemmer hvilke funksjoner brukeren har tilgang til. Det finnes en admin og elev role.

### Vinner

Vinner modellen brukes til å lagre informasjon om vinnerne av kalenderen.

Dette gjør at vinnerinformasjonen kan hentes fram igjen og vises på forsiden ved tidligere luker.

### Quiz collection

I tillegg til Mongoose modellene brukes det en egen collection som heter quizzes. Denne brukes til å hente spørsmål fra quiz data som er satt inn i seed. Hjelper også hvis info ikke er i luke collection

---

## Informasjon rute

Når en bruker åpner nettsiden, sender nettleseren en forespørsel til express serveren. Express undersøker hvilken rute som er besøkt og utfører nødvendig javascript kode.

Dersom informasjon må hentes fra databasen, bruker serveren mongoose til å hente riktig dokument fra mongoDB. Informasjonen sendes videre til ejs, som bruker den til å lage html siden som brukeren får tilbake.

Når brukeren sender inn et svar, skjer det omtrent det samme i motsatt retning. Formen sender informasjon til en express rute, serveren kontrollerer informasjonen og lagrer svaret i mongoDB. Etterpå får brukeren en tilbakemelding.

Dette gjør at nettsiden ikke trenger å ha alle spørsmålene og svarene skrevet direkte inn i html filene, siden informasjonen kan hentes dynamisk fra databasen.

---

## Oppstart i utviklingsmiljø

Før applikasjonen startes må dependencies være installert og .env være konfigurert med riktig mongoDB tilkobling og JWT nøkkel.

Applikasjonen startes fra terminalen med: (det er flere måter men jeg liker denne)

```bash
node app.js
```

Når serveren kjører, kan nettsiden åpnes i nettleseren på:

[http://localhost:4000](http://localhost:4000)

Dersom man har endret serverkoden, må serveren startes på nytt for at endringene skal loade.

---

## Utrulling på Linux server

### VM oppsett

---

## Brukerveiledning

### Vanlig bruker (i hjelp siden på appen)

#### Brukerveiledning

Her finner du litt hjelp til hvordan julekalenderen fungerer. Hvis du lurer på noe, kan du kanskje finne svaret her!

#### Kom i gang

**01**

For å delta må du først registrere deg med navn og skole e-post. Du trenger ikke å lage et passord.

Skriv inn fornavn, etternavn og en e postadresse som slutter på @afk.no. Når du sender inn skjemaet, blir du automatisk logget inn.

Har du brukt samme e post tidligere? Da blir navnet på den eksisterende brukeren oppdatert.

#### Åpne luker

**02**

På forsiden finner du 24 luker, en for hver dag i desember. Du kan åpne dagens luke og luker fra tidligere dager. Der kan du sende in et svar hvis du er logget inn, men siden vinner har allerede blitt trukket for alle tidligere dager, får du ikke noe sjanse på å vinne.

Luker som ikke har kommet ennå, vises som «snart». De kan ikke åpnes fra kalenderen før det blir den aktuelle dagen.

Når du åpner en luke, finner du dagens spørsmål og eventuelt et bilde eller en video.

#### Svare på spørsmål

**03**

Du må være logget inn for å sende inn et svar. Noen spørsmål lar deg skrive svaret selv, mens andre har flere alternativer du kan velge mellom.

Når du er ferdig, trykker du på «Send inn svaret». Vent til du får en bekreftelse på at svaret er registrert.

Du kan bare svare en gang på hver luke. Sjekk derfor svaret før du sender det inn. Du får ikke mulighet til å sende inn et nytt svar etterpå.

#### Hvordan trekkes vinnerne?

**04**

For å være med i trekningen må du ha svart riktig på spørsmålet. Svarene blir vurdert, og bare svar som er registrert som riktige kan bli trukket ut.

For spørsmål med svaralternativer blir svaret sjekket automatisk. Svar du skriver selv, må vurderes av en administrator.

Det trekkes en tilfeldig vinner blant de kvalifiserte svarene for hver luke. Vinneren vises på den aktuelle luken.

Ifølge informasjonen på forsiden blir vinneren kontaktet i lunsjen dagen etter.

Hvis det du har skrevet som ditt navn, etternavn, eller epost er innapassende, eksplicit, eller kødd, blir din bruker slettet og dine svar ignorert.

#### Vanlige problemer

**05**

**Jeg får ikke registrert meg**

Sjekk at du har fylt inn både fornavn og etternavn, og at e postadressen slutter på @afk.no.

**Jeg får ikke sendt inn et svar**

Sjekk at du er logget inn og har fylt inn eller valgt et svar. Hvis du allerede har svart på luken, kan du ikke sende inn på nytt.

**Jeg får ikke åpnet en luke**

Hvis luken står som «snart», er datoen ikke kommet ennå. Vent til den aktuelle dagen.

**Jeg kommer ikke inn på en side**

Prøv å laste inn siden på nytt. Hvis problemet fortsetter, kan du kontakte læreren eller den som er ansvarlig for julekalenderen.

### Admin

admin logger inn med en konto som har adminrole.

Fra dashboardet kan admin gå videre til de forskjellige admin functions.

For å redigere en luke åpner man oversikten over lukene og velger den riktige luken. Her kan man fylle inn spørsmål, tittel, svartype, svaralternativer og kanskje media.

Når innholdet er ferdig redigert, lagres det i MongoDB.

admin kan også åpne oversikten over svarene, undersøke hva elevene har sendt inn og registrere om svarene er riktige eller gale.

Filtrering gjør det enklere å finne svar fra en bestemt luke eller deltaker.

Når en luke skal trekkes, brukes funksjonen for å velge en tilfeldig vinner blant kvalifiserte deltakere. Trekningen må bekreftes før resultatet lagres.

---

## Feilsøking

### Nettsiden åpnes ikke

Kontroller først at node.js serveren faktisk kjører. Hvis terminalen viser en feil, må denne undersøkes før nettsiden kan åpnes.

Kontroller også at du bruker riktig port i nettleseren.

### MongoDB kobler ikke til

Pass på at MONGODB_URI er riktig skrevet i .env, og at databasen er tilgjengelig.

Dersom tilkoblingen feiler, vil applikasjonen heller ikke kunne hente eller lagre informasjon.

### Innlogging fungerer ikke

Pass på at brukeren bruker riktig skole e post og at kontoen finnes i databasen.

sjekk også at SECRET_JWT er konfigurert, siden serveren trenger denne for å verifisere innloggingen.

### En luke viser ikke riktig innhold

Sjekk at riktig luke er valgt og at informasjonen faktisk er lagret i databasen.

Hvis luken er deaktivert, kan dette også påvirke om innholdet blir synlig eller riktig.

### Svar blir ikke sendt inn

Pass på at brukeren er logget inn, at skjemaet inneholder nødvendig informasjon og at serveren ikke viser en databasefeil.

Hvis brukeren allerede har sendt inn et svar på den aktuelle luken, skal systemet hindre en ny innsending.

---

## Sikkerhet og personvern

Prosjektet lagrer person opplysninger som navn og skole e postadresse. Disse opplysningene brukes til å identifisere brukere, knytte svar til riktig bruker og kontakte vinnere.

For å begrense hvem som kan bruke systemet, kontrolleres det at e postadressen tilhører afk. Men, den sjekker ikke om det er en registrert afk bruker, som er et stort hull, men vanskelig å ungå uten å skape mye tull for elevene.

JWT brukes til autentisering, og tokenet lagres i en cookie. Beskyttede ruter kontrollerer tokenet før brukeren får tilgang.

Det brukes også roller for å skille mellom admin og elever, slik at vanlige brukere ikke skal kunne bruke admin funksjonene.

.env er lagt inn i .gitignore, slik at hemmelige verdier ikke blir lastet opp til github.

Person opplysninger er bare brukt til det som er nødvendig for kalenderen.

---

## Git og versjonskontroll

Jeg har brukt Git gjennom prosjektet for å holde orden på utviklingen og kunne arbeide med forskjellige funksjoner uten å blande alt sammen i hovedgrenen.

Jeg har opprettet egne branches for forskjellige deler av prosjektet, blant annet frontend, login, luke, spørsmål, svar og vinnerfunksjonalitet.

Jeg har også brukt commits underveis for å lagre endringer i prosjektet. De er litt forrvirrende og ikke så forklarende, det er noe jeg kan forbrede megselv på. Dette prisjektet var langt, krevsomt, og drepte med litt innvendig, så noen deler er klønete.

Github ble brukt til å lagre prosjektet, og projects brukes til å organisere oppgavene og holde oversikt over fremdriften. Det hjalp faktisk veldig i starten når jeg altid var usikker på neste steg, men ble ikke like nyttig når jeg hadde veldig bra kontroll og oversikt inni hodet mitt.

Repositoryet er offentlig, slik at andre kan hente prosjektet med git clone.

---

## Videre utvikling

Det er flere ting som kunne vært videreutviklet dersom prosjektet skulle fått mer tid.

Det kunne ha vært laget bedre støtte for testing, slik at man enklere kan kontrollere at innlogging, datostyring, innsending av svar og trekning fungerer som forventet.

### Andre mulige forbedringer

legge til muligheter for å kontrollere at e postadressen faktisk tilhører en registrert elev eller ansatt ved skolen, og ikke bare slutter på @afk.no.

Lage en enklere og sikrere måte å opprette og admin kontoer på, slik at man ikke trenger å gjøre alt manuelt.

Få seed.js og luke redigeringen til å fungere bedre sammen, slik at admin sine endringer ikke blir overskrevet ved en ny seed. Dette var jo en ganske stor kilde til frustrasjon.

Lage en historikk over tidligere trekninger, slik at admin kan se hvem som ble trukket, når det skjedde og hvilke svar som gjorde at deltakeren var kvalifisert.

muligheten for å sende e post til vinnerne automatisk, i stedet for at dette må gjøres manuelt.

Teste kalenderen på flere forskjellige mobilstørrelser en 750px width og andre nettlesere

Gjøre nettsiden mer tilgjengelig, blant annet med bedre tastaturnavigasjon, tydeligere fokusmarkeringer, alternativ tekst på bilder og bedre kontrast.

Lage enda mer spesifikke feilmeldinger både for brukere og admin, slik at det blir enklere å forstå hva som gikk galt.

Legge til flere kommentarer der det er nødvendig, og gjøre det enklere for andre å forstå hvordan de forskjellige delene av prosjektet fungerer.

Bli flinkere til å lage mindre og mer forklarende commits, og huske å bruke branches mer konsekvent gjennom hele utviklingen.

Jeg ville veldig legge til en større vinner div for forrige dags vinner som de vet.

En function som sier når neste luke åpnes.

En function som sier hvor mange luker denne brukeren har åpnet.

Lukke gamle luker for elever.

Ett leaderboard, hvor brukerene med mest riktige svar blir vist.

En footer, kom bare aldri rundt til det.

Legge til en overview i admin dashboard med info om total svar, total riktige, og sånt.

---

## Kontakt og brukerstøtte

Ved problemer med kalenderen kan elever kontakte ansvarlig lærer, Monica helle, eller Hannah mohaugen på teams.
