# Annos
=======

# Annos – Hemkörningsapp

**Annos** är en webbaserad hemkörningsapp där kunder kan beställa mat, betala med Swish och få maten levererad av förare. Appen bygger på moderna webbtjänster och följer ett agilt arbetssätt med Scrum.

## 📦 Teknologi

- Frontend: React (via Vite)
- Backend: Node.js + Express
- Node.js ≥18 (kontrollera med `node -v`)
- Databas: SQLite (via SQLite3)
- Betalning: Swish (via API, i framtiden)
- Språk: Svenska

## 🧱 Struktur

```
annos/
├── frontend/   → React-klient
├── backend/    → Express API
```

## ✅ Checklista för att köra projektet lokalt

### 1. Kontrollera Node.js-version
```bash
node -v
# Måste vara version 18 eller senare
```
### 2. Klona projektet
```bash
git clone https://github.com/Macfatty/Annos.git
cd Annos
```

### 3. Installera backend-beroenden
```bash
cd backend
npm install
npm list jest  # Kontrollera att Jest installerades som dev-dependency
# Kontrollera att du har express & cors
npm list express
npm list cors
# Om nya autentiseringsmoduler lagts till (t.ex. `google-auth-library` och
# `apple-signin-auth`), kör `npm install` igen efter att du hämtat uppdaterad
# kod.
```

### 4. Skapa `.env`-fil
Lägg till följande i `backend/.env`:
```
JWT_SECRET=your-secret
# Används för att signera refresh tokens
REFRESH_SECRET=your-refresh-secret
# OAuth-nycklar
GOOGLE_CLIENT_ID=din-google-client-id
APPLE_CLIENT_ID=din-apple-client-id
# Adressen som får skicka cookies till backend
FRONTEND_ORIGIN=http://localhost:5173
# Valfritt: ange egen port
PORT=3001
```

### 5. Skapa admin-konto
Gå till mappen `backend` och kör skriptet för att skapa ett första administratörskonto. Standarduppgifterna är `admin@example.com` och `admin123`.
```bash
cd backend
node skapaAdmin.js
```
**Detta måste köras innan du kan logga in på `/admin`.** När både backend och frontend körs kan du sedan navigera till `/admin` för att logga in med dessa uppgifter.

### 6. Starta backend-servern
```bash
node server.js
```
Öppna: http://localhost:3001

---

### 7. Installera frontend-beroenden
```bash
cd ../frontend
npm install
# Detta installerar ESLint och @eslint/js samt andra dev-beroenden
# Kör även `npm install` igen om du hämtar ny kod för att säkerställa att alla
# paket finns tillgängliga.
```

### 8. Skapa `.env` i frontend
Lägg till följande i `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3001
```
Ange adressen till din backend om du har ändrat port eller värd. Variabeln behövs
för att inloggning, profilsidor och orderhistorik ska fungera.
### 9. Starta frontend (Vite)
```bash
npm run dev
```
Öppna: http://localhost:5173

---

### 10. Testa att frontend <--> backend fungerar:
- Öppna http://localhost:3001 i webbläsaren eller kör `curl http://localhost:3001` i terminalen.
- Du bör se: `backend funkar!`
### 11. Kör kodkvalitetskontroller
```bash
cd frontend
npm run lint
cd ../backend
npm test
```

### 12. Uppdatera SunSushi-menyn
Kräver internetåtkomst. Kör scriptet från projektroten:
```bash
node backend/scrapeSunSushi.js
```
Filen `backend/Data/menyer/sunsushi.json` skrivs över med aktuell meny.

## 📌 Funktioner (MVP)

- Visa meny med rätter & tillbehör
- Lägg till mat i varukorg
- Beställning & betalning via Swish

## 📃 Licens

MIT
