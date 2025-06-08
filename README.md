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
```

### 3. Skapa `.env`-fil
Lägg till följande i `backend/.env`:
```
JWT_SECRET=your-secret
```

### 4. Starta backend-servern
```bash
node server.js
```
Öppna: http://localhost:3001

---

### 5. Installera frontend-beroenden
```bash
cd ../frontend
npm install
# Detta installerar ESLint och @eslint/js samt andra dev-beroenden
```

### 6. Starta frontend (Vite)
```bash
npm run dev
```
Öppna: http://localhost:5173

---

### 7. Testa att frontend <--> backend fungerar:
- Gå till frontend i webbläsaren
- Klicka på "Testa backend-anslutning"
- Du bör se: `Backend funkar!`
### 8. Kör kodkvalitetskontroller
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

## 📅 Projektledning

Projektet följer Scrum och är uppdelat i sprintar. Se [GitHub Projects](https://github.com/Macfatty/Annos/projects) för backlog och status.

## 📃 Licens

MIT
