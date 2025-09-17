# Projektfiler och deras syfte

## Root-nivå

| Fil | Syfte / funktion |
|-----|------------------|
| **AGENTS.md** | Instruktioner för AI-agenter som arbetar med projektet |
| **DEVELOPMENT_RULES.md** | Utvecklingsregler och kodstil för projektet |
| **ERRORRULES.md** | Regler för felhantering och felsökning |
| **FILES_OVERVIEW.md** | Denna fil - översikt över alla projektfiler |
| **LICENSE** | MIT-licens för projektet |
| **MigrationTillAWS.md** | Dokumentation för migrering till AWS-infrastruktur |
| **README.md** | Huvuddokumentation för projektet med installationsinstruktioner och översikt |
| **env.example** | Mall för miljövariabler som behöver konfigureras |

## Backend (`backend/`)

| Fil | Syfte / funktion |
|-----|------------------|
| **authMiddleware.js** | JWT-verifiering, rollkontroll och rate limiting middleware |
| **createTables.js** | SQL-schema för att skapa databastabeller |
| **db.js** | PostgreSQL-connection pool och databaskonfiguration |
| **migrateDatabase.js** | Databasmigreringsskript |
| **migrateRestaurangSlug.js** | Migrering av restaurang-slugs |
| **migrateUserRoles.js** | Migrering av användarroller |
| **orderDB.js** | Databasoperationer för orderhantering (CRUD-operationer) |
| **orders.backup.1757701027.sqlite** | Backup av SQLite-databas (legacy) |
| **orders.backup.1757707808.sqlite** | Backup av SQLite-databas (legacy) |
| **orders.backup.1757709468.sqlite** | Backup av SQLite-databas (legacy) |
| **orders.sqlite** | SQLite-databasfil (legacy, används inte längre) |
| **package-lock.json** | Låsta versionsnummer för Node.js-beroenden |
| **package.json** | Node.js-beroenden och skript |
| **POSTGRESQL_MIGRATION_SUMMARY.md** | Sammanfattning av PostgreSQL-migrering |
| **server.js** | Huvudserverfil med Express.js-applikation, API-routes och middleware |
| **server_end.js** | Alternativ serverfil (legacy/backup) |
| **server_fixed.js** | Ytterligare servervariant (legacy/backup) |
| **server.test.js** | Testfiler för serverfunktionalitet |
| **skapaAdmin.js** | Skript för att skapa administratörskonton |

### Backend - Data och menyhantering

| Fil | Syfte / funktion |
|-----|------------------|
| **Data/kopplaTillbehor.js** | Koppling mellan rätter och tillbehör |
| **Data/menuData.js** | Centraliserad menyhantering för alla restauranger |
| **Data/tillbehorData.js** | Tillbehörsdata för alla restauranger |
| **Data/menyer/campino.json** | Campino-restaurangens meny |
| **Data/menyer/orginal_meny.json** | Original meny (legacy) |
| **Data/menyer/sunsushi.json** | SunSushi-restaurangens meny |
| **Data/Tillbehör/campinotillbehör/drycker.json** | Campino drycker-tillbehör |
| **Data/Tillbehör/campinotillbehör/grönt.json** | Campino grönt-tillbehör |
| **Data/Tillbehör/campinotillbehör/Kött.json** | Campino kött-tillbehör |
| **Data/Tillbehör/campinotillbehör/övrigt.json** | Campino övrigt-tillbehör |
| **Data/Tillbehör/campinotillbehör/såser.json** | Campino såser-tillbehör |
| **Data/Tillbehör/sunsuhitillbehör/sundrycker.json** | SunSushi drycker-tillbehör |
| **Data/Tillbehör/sunsuhitillbehör/sungrönt.json** | SunSushi grönt-tillbehör |
| **Data/Tillbehör/sunsuhitillbehör/sunkött.json** | SunSushi kött-tillbehör |
| **Data/Tillbehör/sunsuhitillbehör/sunövrigt.json** | SunSushi övrigt-tillbehör |
| **Data/Tillbehör/sunsuhitillbehör/sunsåser.json** | SunSushi såser-tillbehör |
| **Data/Tillbehör/sunsuhitillbehör/sunvegetarisk.json** | SunSushi vegetarisk-tillbehör |

### Backend - Routes och betalningar

| Fil | Syfte / funktion |
|-----|------------------|
| **routes/auth.js** | Autentiseringsroutes (login, register, logout) |
| **payments/index.js** | Betalningsprovider och validering av betalningar |

### Backend - Verktyg och uppgifter

| Fil | Syfte / funktion |
|-----|------------------|
| **tasks/generatePayouts.js** | Generering av utbetalningar för restauranger |

### Backend - Legacy

| Fil | Syfte / funktion |
|-----|------------------|
| **legacy/initDB.js** | Legacy databasinitialisering |
| **legacy/README.md** | Dokumentation för legacy-komponenter |

## Frontend (`frontend/`)

### Frontend - Huvudapplikation

| Fil | Syfte / funktion |
|-----|------------------|
| **src/App.jsx** | Huvudapplikationskomponent med routing och state management |
| **src/main.jsx** | React-applikationens ingångspunkt |
| **src/index.css** | Globala CSS-stilar och tema-definitioner |
| **src/App.css** | Applikationsspecifika stilar |

### Frontend - API och datahantering

| Fil | Syfte / funktion |
|-----|------------------|
| **src/api.js** | Centraliserad API-klient med autentisering och felhantering |
| **src/utils/getAccessoriesByRestaurant.js** | Hjälpfunktion för att hämta tillbehör per restaurang |

### Frontend - Autentisering

| Fil | Syfte / funktion |
|-----|------------------|
| **src/Login.jsx** | Inloggningsformulär med Google/Apple-integration |
| **src/Register.jsx** | Registreringsformulär för nya användare |
| **src/MinProfil.jsx** | Användarprofil med inställningar och beställningshistorik |

### Frontend - Navigering och layout

| Fil | Syfte / funktion |
|-----|------------------|
| **src/Start.jsx** | Startsida med information och navigering |
| **src/ValjRestaurang.jsx** | Restaurangväljare med lista över tillgängliga restauranger |

### Frontend - Meny och beställning

| Fil | Syfte / funktion |
|-----|------------------|
| **src/Checkout.jsx** | Kassaflöde med kunduppgifter och betalning |
| **src/Kundvagn.jsx** | Shopping cart med beställningsöversikt |
| **src/Restaurang.jsx** | Huvudmenyvy för en specifik restaurang |
| **src/Tack.jsx** | Bekräftelsesida efter genomförd beställning |
| **src/Undermeny.jsx** | Detaljerad vy för enskilda rätter med tillbehör |

### Frontend - Administrativa vyer

| Fil | Syfte / funktion |
|-----|------------------|
| **src/AdminPanel.jsx** | Administratörspanel för systemhantering |
| **src/KurirVy.jsx** | Kurirvy för att hantera leveranser |
| **src/RestaurangVy.jsx** | Restaurangvy för att hantera inkommande beställningar |

### Frontend - Användarfunktioner

| Fil | Syfte / funktion |
|-----|------------------|
| **src/ErrorBoundary.jsx** | Felhantering för React-komponenter |
| **src/MinaBeställningar.jsx** | Användarens beställningshistorik |

### Frontend - Data och tillbehör

| Fil | Syfte / funktion |
|-----|------------------|
| **src/data/tillbehor/campino-drycker.json** | Campino drycker-tillbehör för frontend |
| **src/data/tillbehor/campino-grönt.json** | Campino grönt-tillbehör för frontend |
| **src/data/tillbehor/campino-kött.json** | Campino kött-tillbehör för frontend |
| **src/data/tillbehor/campino-övrigt.json** | Campino övrigt-tillbehör för frontend |
| **src/data/tillbehor/campino-såser.json** | Campino såser-tillbehör för frontend |
| **src/data/tillbehor/campino.js** | Campino tillbehörslogik för frontend |
| **src/data/tillbehor/sundrycker.json** | SunSushi drycker-tillbehör för frontend |
| **src/data/tillbehor/sungrönt.json** | SunSushi grönt-tillbehör för frontend |
| **src/data/tillbehor/sunkött.json** | SunSushi kött-tillbehör för frontend |
| **src/data/tillbehor/sunövrigt.json** | SunSushi övrigt-tillbehör för frontend |
| **src/data/tillbehor/sunsåser.json** | SunSushi såser-tillbehör för frontend |
| **src/data/tillbehor/sunsushi.js** | SunSushi tillbehörslogik för frontend |
| **src/data/tillbehor/sunvegetarisk.json** | SunSushi vegetarisk-tillbehör för frontend |

### Frontend - Assets och resurser

| Fil | Syfte / funktion |
|-----|------------------|
| **src/assets/react.svg** | React-logo och andra assets |

### Frontend - Konfiguration

| Fil | Syfte / funktion |
|-----|------------------|
| **eslint.config.js** | ESLint-konfiguration för kodkvalitet |
| **index.html** | HTML-mall för React-applikationen |
| **package-lock.json** | Låsta versionsnummer för frontend-beroenden |
| **package.json** | Frontend-beroenden och build-skript |
| **README.md** | Frontend-specifik dokumentation |
| **vite.config.js** | Vite build-konfiguration |

### Frontend - Statiska resurser

| Fil | Syfte / funktion |
|-----|------------------|
| **public/bilder/Calzone.jpg** | Bild för Calzone-rätt |
| **public/bilder/campino.png** | Campino-restaurangens logotyp |
| **public/bilder/default.jpg** | Standardbild för rätter utan bild |
| **public/bilder/Hawaii.jpg** | Bild för Hawaii-pizza |
| **public/bilder/Magarita.png** | Bild för Margherita-pizza |
| **public/bilder/pizza.jpg** | Generisk pizza-bild |
| **public/bilder/rulle.jpg** | Bild för sushi-rulle |
| **public/bilder/sunsushi.png** | SunSushi-restaurangens logotyp |
| **public/bilder/Vesuvio.jpg** | Bild för Vesuvio-pizza |
| **public/vite.svg** | Vite-logo |

## Dokumentation (`docs/`)

| Fil | Syfte / funktion |
|-----|------------------|
| **courier.md** | Dokumentation för kurirfunktionalitet |
| **database.md** | Databasschema och relationsdokumentation |
| **functions.md** | API-funktioner och endpoints |
| **payments.md** | Betalningssystem och integration |
| **restaurant.md** | Restauranghantering och funktionalitet |

---

## Sammanfattning

### Filtyper och deras roller

| Filtyp | Roll | Exempel |
|--------|------|---------|
| **.js** | Node.js/Express server-filer | `server.js`, `authMiddleware.js` |
| **.jsx** | React-komponenter | `App.jsx`, `Login.jsx` |
| **.json** | Konfigurations- och datafiler | `package.json`, `campino.json` |
| **.css** | Stilar och tema | `index.css`, `App.css` |
| **.html** | HTML-mallar | `index.html` |
| **.svg** | Vektorgrafik och ikoner | `react.svg`, `vite.svg` |
| **.jpg/.png** | Bilder och fotografier | `pizza.jpg`, `campino.png` |
| **.sqlite** | Legacy databasfiler | `orders.sqlite` |
| **.md** | Dokumentation och instruktioner | `README.md`, `AGENTS.md` |

### Projektstruktur

Denna struktur följer en tydlig separation mellan:
- **Frontend** (React/Vite) - Användargränssnitt och klientlogik
- **Backend** (Node.js/Express) - API, databas och serverlogik  
- **PostgreSQL** - Huvuddatabas för produktion
- **SQLite** - Legacy databas (används inte längre)

### Totalt antal filer

- **Root-nivå:** 8 filer
- **Backend:** 38 filer (inklusive data och konfiguration)
- **Frontend:** 35 filer (inklusive assets och konfiguration)
- **Dokumentation:** 5 filer
- **Totalt:** 86 källkodsfiler (exklusive node_modules och build-mappar)
