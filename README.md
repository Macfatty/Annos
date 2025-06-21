# Annos
=======

# Annos – Hemkörningsapp

**Annos** är en webbaserad hemkörningsapp där kunder kan beställa mat, betala med Swish och få maten levererad av förare. Appen bygger på moderna webbtjänster och följer ett agilt arbetssätt med Scrum.

## 📦 Teknologi

- Frontend: React (via Vite)
- Backend: Node.js + Express
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

### 1. Klona projektet
```bash
git clone https://github.com/Macfatty/Annos.git
cd Annos
```

### 2. Installera backend-beroenden
```bash
cd backend
npm install
# Detta laddar ner bland annat Jest som dev-dependency
# Kontrollera att du har express & cors
npm list express
npm list cors
# Om nya autentiseringsmoduler lagts till (t.ex. `google-auth-library` och
# `apple-signin-auth`), kör `npm install` igen efter att du hämtat uppdaterad
# kod.
```

### 3. Skapa `.env`-fil
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

### 4. Skapa admin-konto
Gå till mappen `backend` och kör skriptet för att skapa ett första administratörskonto. Standarduppgifterna är `admin@example.com` och `admin123`.
```bash
cd backend
node skapaAdmin.js
```
När både backend och frontend körs kan du navigera till `/admin` för att logga in med dessa uppgifter.

### 5. Starta backend-servern
```bash
node server.js
```
Öppna: http://localhost:3001

---

### 6. Installera frontend-beroenden
```bash
cd ../frontend
npm install
# Detta installerar ESLint och @eslint/js samt andra dev-beroenden
# Kör även `npm install` igen om du hämtar ny kod för att säkerställa att alla
# paket finns tillgängliga.
```

### 7. Skapa `.env` i frontend
Lägg till följande i `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3001
```
Ange adressen till din backend om du har ändrat port eller värd. Variabeln behövs
för att inloggning, profilsidor och orderhistorik ska fungera.
### 8. Starta frontend (Vite)
```bash
npm run dev
```
Öppna: http://localhost:5173

---

### 9. Testa att frontend <--> backend fungerar:
- Gå till frontend i webbläsaren
- Klicka på "Testa backend-anslutning"
- Du bör se: `Backend funkar!`
### 10. Kör kodkvalitetskontroller
```bash
cd frontend
npm run lint
cd ../backend
npm test
```

## 📌 Funktioner (MVP)

- Visa meny med rätter & tillbehör
- Lägg till mat i varukorg
- Beställning & betalning via Swish

## 📃 Licens

MIT
