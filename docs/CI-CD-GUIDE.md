# CI/CD Pipeline Guide – Annos

**Syfte:** Automatisk kvalitetskontroll och säkerhetsscanning för Annos-projektet.

**Workflow-fil:** `.github/workflows/ci.yml`

---

## 📋 Översikt

GitHub Actions workflow körs automatiskt vid:
- ✅ Push till `main` branch
- ✅ Push till `develop` branch
- ✅ Pull requests mot `main` eller `develop`
- ✅ Manuell körning via GitHub UI (`workflow_dispatch`)

---

## 🏗️ Pipeline Struktur

Pipeline består av **6 parallella/sekventiella jobb:**

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND                    BACKEND                    │
├─────────────────────────────────────────────────────────┤
│  1. lint-frontend        →   4. test-backend            │
│  2. build-frontend       →   5. security-backend        │
│  3. security-frontend                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
              6. quality-summary
              (sammanfattning av alla jobb)
```

---

## 📦 Job 1: Frontend - ESLint

**Syfte:** Säkerställa kodkvalitet och konsekvens i frontend-koden.

**Steg:**
1. Checka ut kod från repository
2. Setup Node.js 20 med npm cache
3. Installera dependencies (`npm ci`)
4. Kör ESLint (`npm run lint`)

**Krav för success:**
- ✅ Inga ESLint-fel
- ✅ Inga ESLint-varningar (om konfigurerat strikt)

**Vid fel:**
- ❌ Pipeline failar
- 💡 Kör lokalt: `cd frontend && npm run lint`

---

## 🏗️ Job 2: Frontend - Build Test

**Syfte:** Verifiera att frontend kan byggas för produktion.

**Steg:**
1. Checka ut kod
2. Setup Node.js 20 med cache
3. Installera dependencies
4. Bygg produktion (`npm run build`)
5. Verifiera att `dist/` katalog skapades

**Krav för success:**
- ✅ Build lyckas utan fel
- ✅ `dist/` katalog existerar
- ✅ Build-output är giltig

**Dependencies:**
- Körs efter `lint-frontend` (needs: lint-frontend)

**Vid fel:**
- ❌ Pipeline failar
- 💡 Kör lokalt: `cd frontend && npm run build`

---

## 🔒 Job 3: Frontend - Security Audit

**Syfte:** Identifiera säkerhetssårbarheter i frontend-dependencies.

**Steg:**
1. Checka ut kod
2. Setup Node.js 20
3. Installera dependencies
4. Kör `npm audit --audit-level=high`
5. Analysera audit-rapport i JSON-format
6. Räkna critical och high vulnerabilities

**Krav för success:**
- ✅ 0 critical vulnerabilities
- ⚠️ High vulnerabilities tillåts (varning)

**Fail-kriterier:**
- ❌ Om `CRITICAL > 0` → Pipeline failar

**Vid varningar:**
```bash
cd frontend
npm audit
npm audit fix  # Försök auto-fix
npm audit fix --force  # Om auto-fix inte fungerar
```

**Vid kritiska sårbarheter:**
1. Läs audit-rapporten noggrant
2. Uppdatera sårbara paket manuellt
3. Testa att applikationen fortfarande fungerar
4. Commit och pusha fix

---

## 🧪 Job 4: Backend - Tests (PostgreSQL)

**Syfte:** Köra alla backend-tester med PostgreSQL-databas.

**Infrastruktur:**
- PostgreSQL 14 container
- Health checks (pg_isready)
- Isolerad test-databas

**Environment:**
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=testdb
DB_PORT=5432
JWT_SECRET=test-secret-key-for-testing-only-minimum-256-bits-required-for-hs256
REFRESH_SECRET=test-refresh-secret-key-for-testing-only-minimum-256-bits
NODE_ENV=test
```

**Steg:**
1. Checka ut kod
2. Setup Node.js 20 med cache
3. Installera dependencies
4. Vänta på PostgreSQL (health check loop)
5. Skapa databastabeller (`node createTables.js`)
6. Kör Jest-tester (`npm test`)
7. Verifiera testresultat

**Krav för success:**
- ✅ PostgreSQL startar korrekt
- ✅ Tabeller skapas utan fel
- ✅ Alla tester passerar

**Vid fel:**
```bash
cd backend
npm test  # Kör tester lokalt

# Debug PostgreSQL-anslutning
psql -h localhost -U postgres -d testdb

# Kör createTables manuellt
node createTables.js
```

---

## 🔒 Job 5: Backend - Security Audit

**Syfte:** Identifiera säkerhetssårbarheter i backend-dependencies.

**Steg:**
1. Checka ut kod
2. Setup Node.js 20
3. Installera dependencies
4. Kör `npm audit --audit-level=high`
5. Analysera JSON-rapport
6. Räkna critical och high vulnerabilities

**Krav för success:**
- ✅ 0 critical vulnerabilities
- ⚠️ High vulnerabilities tillåts (varning)

**Fail-kriterier:**
- ❌ Om `CRITICAL > 0` → Pipeline failar

**Vid kritiska sårbarheter:**
```bash
cd backend
npm audit
npm audit fix
npm audit fix --force  # Om nödvändigt
npm test  # Verifiera att allt fungerar
```

---

## 📊 Job 6: Quality Summary

**Syfte:** Sammanfatta alla jobb och ge tydlig feedback.

**Körs:** Alltid (även om tidigare jobb failar) - `if: always()`

**Dependencies:**
- Väntar på alla 5 tidigare jobb

**Output:**
```
=== CI PIPELINE SUMMARY ===

Frontend Lint: success / failure
Frontend Build: success / failure
Frontend Security: success / failure
Backend Tests: success / failure
Backend Security: success / failure

✅ CI Pipeline SUCCESS - Alla kvalitetskontroller passerade!
```

eller

```
❌ CI Pipeline FAILED - Se detaljer ovan
```

**Fail-kriterier:**
- Om **någon** av de 5 tidigare jobben failade

---

## 🚀 Förbättringar från Original Workflow

### ✅ Nya Features

1. **Develop Branch Support**
   - Workflow körs nu även på `develop` branch
   - Följer Git Flow-modellen

2. **Frontend Build Test**
   - Helt nytt jobb
   - Verifierar att produktion-build fungerar
   - Kontrollerar att `dist/` katalog skapas

3. **Security Scanning**
   - 2 nya security audit-jobb (frontend + backend)
   - Automatisk detektion av critical vulnerabilities
   - Blockerar merge vid kritiska säkerhetsrisker

4. **Quality Summary**
   - Nytt sammanfattnings-jobb
   - Tydlig visuell feedback
   - Enkel översikt av alla kontroller

5. **Förbättrad Caching**
   - Uppdaterad till `actions/checkout@v4` och `actions/setup-node@v4`
   - Bättre npm cache-hantering
   - Snabbare builds

6. **Bättre Error Messages**
   - Tydligare felmeddelanden
   - Emoji-baserad feedback (✅/❌)
   - Detaljerade audit-rapporter

7. **Manuell Körning**
   - `workflow_dispatch` trigger
   - Kan köras manuellt från GitHub UI

### 📈 Jämförelse

| Feature | Original | Förbättrad |
|---------|----------|------------|
| Frontend Lint | ✅ | ✅ |
| Frontend Build | ❌ | ✅ |
| Frontend Security | ❌ | ✅ |
| Backend Tests | ✅ | ✅ (förbättrad) |
| Backend Security | ❌ | ✅ |
| Quality Summary | ❌ | ✅ |
| Develop Branch | ❌ | ✅ |
| Manual Trigger | ❌ | ✅ |
| Actions Version | v3 | v4 |

---

## 🔧 Lokal Testning

Innan du pushar kod, kör dessa kommandon lokalt:

### Frontend
```bash
cd frontend

# Lint
npm run lint

# Build
npm run build

# Security
npm audit --audit-level=high
```

### Backend
```bash
cd backend

# Tests
npm test

# Security
npm audit --audit-level=high

# Database setup (om behövs)
node createTables.js
```

---

## 🐛 Felsökning

### Pipeline Failar på Lint
```bash
cd frontend
npm run lint

# Auto-fix om möjligt
npm run lint -- --fix
```

### Pipeline Failar på Build
```bash
cd frontend
npm run build

# Rensa och försök igen
rm -rf dist node_modules
npm install
npm run build
```

### Pipeline Failar på Tests
```bash
cd backend

# Kör tester med verbose output
npm test -- --verbose

# Kör specifikt test
npm test -- path/to/test.js
```

### Pipeline Failar på Security
```bash
# Se vilka sårbarheter
npm audit

# Försök auto-fix
npm audit fix

# Force-fix (varning: kan bryta saker)
npm audit fix --force

# Uppdatera specifikt paket
npm update package-name

# Installera om allt
rm -rf node_modules package-lock.json
npm install
```

### PostgreSQL Connection Issues
```bash
# Kontrollera att PostgreSQL körs
psql -h localhost -U postgres -l

# Testa anslutning
PGPASSWORD=postgres psql -h localhost -U postgres -d testdb

# Skapa om databas
dropdb testdb
createdb testdb
node createTables.js
```

---

## 📝 Best Practices

### 1. Alltid Testa Lokalt Först
```bash
# Frontend
cd frontend && npm run lint && npm run build && npm audit

# Backend
cd backend && npm test && npm audit
```

### 2. Fixa Security Issues Omedelbart
- Critical vulnerabilities blockerar deploy
- Uppdatera dependencies regelbundet
- Använd `npm audit fix` försiktigt

### 3. Håll Dependencies Uppdaterade
```bash
# Visa outdated packages
npm outdated

# Uppdatera minor/patch versions
npm update

# Uppdatera major versions manuellt
npm install package@latest
```

### 4. Skriv Tester
- Alla nya features bör ha tester
- Uppdatera tester vid refactoring
- Sikta på hög coverage (>80%)

### 5. Följ ESLint Rules
- Fixa warnings, inte bara errors
- Använd `// eslint-disable-next-line` sparsamt
- Uppdatera ESLint-config vid behov

---

## 🔐 Säkerhet

### Secrets Management
Workflow använder **inga secrets** för test-miljön. Produktions-secrets hanteras via GitHub Secrets:

**Nödvändiga secrets för produktion:**
```
DB_PASSWORD
JWT_SECRET
REFRESH_SECRET
```

**Lägg till via:**
Settings → Secrets and variables → Actions → New repository secret

### Audit Thresholds
- **Critical:** Blockerar alltid (exit 1)
- **High:** Varning men blockerar inte
- **Medium/Low:** Ignoreras

**Ändra threshold:**
```yaml
# I .github/workflows/ci.yml
run: npm audit --audit-level=moderate  # Blockerar medium+
```

---

## 📊 Monitoring och Loggar

### Visa Workflow Runs
```
GitHub → Actions tab → CI workflow
```

### Visa Logs
1. Klicka på workflow run
2. Klicka på jobbet som failade
3. Expandera steget för detaljer

### Ladda Ner Logs
```
Actions → Workflow run → Download logs (höger meny)
```

---

## 🚀 Framtida Förbättringar

### Möjliga Tillägg
- [ ] Code coverage rapportering (Codecov/Coveralls)
- [ ] Performance testing (Lighthouse CI)
- [ ] E2E-tester (Playwright/Cypress)
- [ ] Docker image build och push
- [ ] Automatisk deployment till staging
- [ ] Slack/Discord notifikationer
- [ ] Dependabot integration
- [ ] SAST scanning (Snyk/SonarCloud)

### Optimeringar
- [ ] Matrix builds (testa flera Node-versioner)
- [ ] Parallella test-suite runs
- [ ] Conditional job execution (skip om inga ändringar)
- [ ] Cache npm globals för snabbare installs

---

## 📚 Referenser

- **GitHub Actions:** https://docs.github.com/en/actions
- **npm audit:** https://docs.npmjs.com/cli/v8/commands/npm-audit
- **ESLint:** https://eslint.org/docs/latest/
- **Jest:** https://jestjs.io/docs/getting-started
- **PostgreSQL CI:** https://docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers

---

**Uppdaterad:** 2025-12-01
**Version:** 2.0
**Ansvarig:** Macfatty/Claude Code
