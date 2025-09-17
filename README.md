 då du centralicerade och uppdaterade api osv innan väl # Annos – Hemkörningsapp

**Annos** är en fullständig webbaserad hemkörningsapp med rollbaserad åtkomst, statusmaskin för ordrar, betalningsintegration och månadsvisa utbetalningar till restauranger.

## 📦 Teknologi

- **Frontend**: React 19 + Vite med ESLint
- **Backend**: Node.js + Express med JWT-autentisering
- **Databas**: PostgreSQL, monetära belopp i öre för precision
- **Betalning**: Swish (mock i dev, produktionsklara providers)
- **Språk**: Svenska
- **Säkerhet**: CSP, CORS, Rate Limiting, Rollbaserad åtkomst

## 🎯 Funktioner

### Kunder
- Visa menyer och lägg till mat i varukorg
- Valfri-input för tillbehör med custom_note (max 140 tecken)
- Beställning med Swish-betalning (mock i dev)
- Realtidsorderstatus via polling
- Beställningshistorik

### Restauranger
- Hantera inkommande ordrar via `/restaurang/:slug/incoming`
- Statusmaskin: received → accepted → in_progress → out_for_delivery
- Se begränsad kundinfo (telefon maskad för säkerhet)

### Kurirer
- Acceptera och leverera ordrar via `/kurir`
- Se endast namn, adress och telefon (ingen e-post eller orderdetaljer)
- Hantera egna pågående ordrar

### Admin
- Full åtkomst till alla funktioner
- Månadsvisa payout-exporter med avgiftsberäkning (45 kr/order + 5% av bruttot)

## 🧱 Struktur

```
annos/
├── frontend/           → React-klient
├── backend/            → Express API
├── docs/              → Dokumentation
│   ├── database.md    → Databasstruktur
│   ├── functions.md   → Systemfunktioner
│   ├── restaurant.md  → Restaurangvy
│   ├── courier.md     → Kurirvy
│   └── payments.md    → Betalningsarkitektur
└── backend/exports/   → Månadsvisa payout-filer
```

## ⚡ Snabbstart

### 1. Förutsättningar
- Node.js ≥18
- Git

### 2. Klona och installera
```bash
git clone https://github.com/Macfatty/Annos.git
cd Annos

# Backend
cd backend
npm install
cd ..

# Frontend  
cd frontend
npm install
cd ..
```

### 3. Miljövariabler

**Backend** (`backend/.env`):
```bash
JWT_SECRET=your-jwt-secret-256-bits
REFRESH_SECRET=your-refresh-secret-256-bits
FRONTEND_ORIGIN=http://localhost:5173
PORT=3001
NODE_ENV=development

# Databas (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=annos_dev
DB_USER=postgres
DB_PASSWORD=your-postgres-password

# Betalningar (utveckling)
PAYMENT_PROVIDER_SWISH_MOCK=true
PAYMENT_PROVIDER_SWISH_CALLBACK_URL=http://localhost:3001/api/payments/callback
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_BASE_URL=http://localhost:3001
```

### 4. Databas och admin

**PostgreSQL (rekommenderat):**
```bash
# Installera PostgreSQL om inte redan installerat
# Skapa databas
createdb annos_dev

# Kör admin-skript (om admin-användare saknas)
cd backend
node skapaAdmin.js [restaurant_slug]  # Skapar admin@example.com / admin123
```

**Notera:**
- Systemet använder endast PostgreSQL. SQLite-stöd har tagits bort för att undvika förvirring.
- Tabeller och sequences skapas automatiskt vid första körning av servern.
- Startup-processen hanterar databas-skapande och sequence-synkronisering automatiskt.

### 5. Starta systemet
```bash
# Terminal 1 - Backend (använder startup.js med full SoC-implementation)
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

**Startup-processen:**
1. **Infrastructure Setup** - Kontrollerar PostgreSQL-anslutning
2. **Data Migration** - Skapar tabeller och sequences automatiskt
3. **Maintenance Tasks** - Synkroniserar sequences
4. **Application Startup** - Startar Express server

### 6. Åtkomst
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Admin**: http://localhost:5173/admin (admin@example.com / admin123)

## 🔐 Roller och Behörigheter

### Roller
- **customer**: Kan beställa mat, se egna ordrar
- **restaurant**: Kan hantera ordrar för sin restaurang
- **courier**: Kan acceptera och leverera ordrar
- **admin**: Full åtkomst till alla funktioner

### Åtkomstregler
- **Anonyma användare**: Kan endast se menyer
- **Kunder**: Måste logga in för att beställa
- **Restauranger**: Ser endast sina egna ordrar
- **Kurirer**: Ser endast namn, adress, telefon (ingen e-post)
- **Admin**: Full åtkomst till alla funktioner

## 🔒 Säkerhet

### Autentisering
- JWT-baserad autentisering med bearer tokens
- Refresh tokens för säker förnyelse
- Rollbaserad åtkomstkontroll (RBAC)

### Dataskydd
- Alla monetära belopp lagras i öre (INTEGER) för precision
- Telefonnummer maskas i loggar (070***67)
- E-post returneras endast till kund, inte till kurir-API
- Custom_note valideras (max 140 tecken, tillåtna tecken)

### Säkerhetsåtgärder
- **CSP Headers**: Content Security Policy aktiverat
- **CORS**: Endast från FRONTEND_ORIGIN
- **Rate Limiting**: 5 login-försök/minut, 10 beställningar/minut
- **Input-validering**: Alla inputs valideras och saneras
- **SQL Injection**: Förhindras via parametriserade queries

### Betalningssäkerhet
- Mock-betalningar i utveckling
- Swish-integration förberedd för produktion
- Betalningsdata loggas inte i klartext
- HTTPS krävs för produktion

## 📊 Månadsvisa Utbetalningar

### Export av Payouts
```bash
# Generera payouts för senaste 30 dagarna
npm run payouts:run

# Specifikt datumintervall
node backend/tasks/generatePayouts.js --from=2024-01-01 --to=2024-01-31
```

### Avgiftsstruktur
- **Per order**: 45 kr (4500 öre)
- **Procentuell avgift**: 5% av bruttot
- **Exempel**: 100 ordrar × 120 kr = 12,000 kr
  - Avgifter: (100 × 45) + (12,000 × 5%) = 4,500 + 600 = 5,100 kr
  - Netto: 12,000 - 5,100 = 6,900 kr

### Exportformat
- **CSV**: `backend/exports/{restaurant_slug}/{YYYY-MM}.csv`
- **JSON**: `backend/exports/{restaurant_slug}/{YYYY-MM}.json`
- **Filrättigheter**: 0600 (endast ägare kan läsa)

## 🧪 Testning och Kvalitet

### ESLint
```bash
cd frontend
npm run lint  # Måste vara helt rent
```

### Backend-tester
```bash
cd backend
npm test
```

### Bygg
```bash
cd frontend
npm run build  # Måste lyckas
```

## 📚 Dokumentation

### Detaljerad Dokumentation
- **[Databasstruktur](docs/database.md)** - PostgreSQL tabeller, index, relationer och exportflöde
- **[Systemfunktioner](docs/functions.md)** - API-endpoints, statusmaskin och säkerhet
- **[Restaurangvy](docs/restaurant.md)** - Hantering av inkommande ordrar
- **[Kurirvy](docs/courier.md)** - Leveranshantering med begränsad dataåtkomst
- **[Betalningar](docs/payments.md)** - Swish-integration och provider-abstraktion
- **[PostgreSQL Migration](backend/POSTGRESQL_MIGRATION_SUMMARY.md)** - Detaljerad migration från SQLite

### API-dokumentation
Alla endpoints dokumenteras i `docs/functions.md` med:
- Request/response-exempel
- Rollkrav
- Valideringsregler
- Statuskoder

## 🚀 Produktionsnoter

### Säkerhet i Produktion
- Använd starka JWT-secrets (256-bit)
- Aktivera HTTPS för alla endpoints
- Konfigurera Swish-certifikat för betalningar
- Sätt upp monitoring och loggning
- Använd Redis för rate limiting i stället för minnesbaserad

### Skalning
- PostgreSQL implementerat för produktion
- Redis för sessioner och caching (framtida förbättring)
- Docker-containers för deployment
- Load balancer för flera backend-instanser
- Connection pooling implementerat

### GDPR-efterlevnad
- Anonymisering av kunddata vid export
- Rätt till radering av personuppgifter
- Data-minimering i kurir-API
- Säker lagring av betalningsdata

## 📃 Licens

MIT
