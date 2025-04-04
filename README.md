# Annos
=======

# Annos – Hemkörningsapp

**Annos** är en webbaserad hemkörningsapp där kunder kan beställa mat, betala med Swish och få maten levererad av förare. Appen bygger på moderna webbtjänster och följer ett agilt arbetssätt med Scrum.

## 📦 Teknologi

- Frontend: React (via Vite)
- Backend: Node.js + Express
- Databas: MongoDB
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
# Kontrollera att du har express & cors
npm list express
npm list cors
```

### 3. Starta backend-servern
```bash
node server.js
```
Öppna: http://localhost:3001

---

### 4. Installera frontend-beroenden
```bash
cd ../frontend
npm install
```

### 5. Starta frontend (Vite)
```bash
npm run dev
```
Öppna: http://localhost:5173

---

### 6. Testa att frontend <--> backend fungerar:
- Gå till frontend i webbläsaren
- Klicka på "Testa backend-anslutning"
- Du bör se: `Backend funkar!`

## 📌 Funktioner (MVP)

- Visa meny med rätter & tillbehör
- Lägg till mat i varukorg
- Beställning & betalning via Swish

## 📅 Projektledning

Projektet följer Scrum och är uppdelat i sprintar. Se [GitHub Projects](https://github.com/Macfatty/Annos/projects) för backlog och status.

## 📃 Licens

MIT
