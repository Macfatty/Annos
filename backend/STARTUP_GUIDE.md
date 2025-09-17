# 🚀 Korrekt Startup Guide - Separation of Concerns (SoC)

## Problem med tidigare implementation

### ❌ Vad som gick fel:
```javascript
// Fel ordning - auto-synkronisering före databas-skapande
autoFixSequences().then(() => {
  app.listen(PORT); // Startar innan databas finns
});
```

**Resultat:**
- Databasen "annos" existerar inte
- Auto-synkronisering kraschar
- Server startar med fel
- Admin får 500-fel vid orderläggning
- **Databasnamn-konflikt:** Applikationen använder fel databas

## ✅ Korrekt SoC-implementation

### **Separation of Concerns (SoC):**

#### **1. Infrastructure Setup**
- Databasanslutning
- Verifiering av miljö

#### **2. Data Migration** 
- Skapa tabeller
- Skapa sequences
- Grundläggande data

#### **3. Maintenance Tasks**
- Sequence-synkronisering
- Data cleanup
- Performance optimization

#### **4. Application Startup**
- Express server
- Routes
- Middleware

## 🏗️ Startup Sequence

### **Korrekt ordning:**
```javascript
// 1. Infrastructure Setup
await checkDatabaseConnection();

// 2. Data Migration  
await createTables();

// 3. Maintenance Tasks
await autoFixSequences();

// 4. Application Startup
app.listen(PORT);
```

## 📋 Användning

### **Viktigt: Miljövariabler**
Se till att `backend/.env` innehåller:
```bash
DB_NAME=annos_dev  # OBLIGATORISKT - använd rätt databas
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD=your-password
```

### **Production (korrekt startup):**
```bash
cd backend
npm start  # Använder startup.js med full sequence
```

### **Development (snabb startup):**
```bash
cd backend  
npm run start:dev  # Använder server.js direkt
```

### **Manuell sequence-fix:**
```bash
cd backend
npm run fix-sequences
```

## 🔧 Startup Scripts

### **startup.js (Production)**
- Full SoC-implementation
- Databas-skapande
- Sequence-synkronisering
- Server startup

### **server.js (Development)**
- Direkt server startup
- Förutsätter att databas finns
- Snabbare för utveckling

## 🛡️ Felhantering

### **Database Connection:**
```javascript
try {
  await client.query('SELECT 1');
} catch (error) {
  if (error.code === '3D000') {
    console.log('Databasen existerar inte ännu');
    return;
  }
  throw error;
}
```

### **Sequence Synchronization:**
```javascript
// Kontrollerar att databasen existerar innan sequence-operationer
if (currentSeq < maxId) {
  await client.query(`SELECT setval('${sequence}', ${nextId})`);
}
```

## 🎯 Fördelar med SoC

### **1. Separation of Concerns**
- Infrastructure ≠ Application
- Data Migration ≠ Maintenance
- Olika ansvarsområden

### **2. Error Handling**
- Tydliga felmeddelanden
- Specifika åtgärder per steg
- Graceful degradation

### **3. Maintainability**
- Modulär kod
- Enkelt att testa
- Enkelt att debugga

### **4. Scalability**
- Olika deployment-strategier
- Infrastructure as Code
- Container-ready

## 🚨 Viktiga punkter

### **Använd alltid:**
```bash
npm start  # För production
```

### **Undvik:**
```bash
node server.js  # Hoppar över startup sequence
```

### **För development:**
```bash
npm run start:dev  # Om databas redan finns
```

### **Databasnamn-konflikt:**
- **Kontrollera att `DB_NAME=annos_dev`** i `.env`-filen
- **Admin-användaren finns i `annos_dev`**, inte i `annos`
- **Fel databasnamn** orsakar 401 Unauthorized vid inloggning

### **Felsökning:**
```bash
# Kontrollera vilken databas som används
node -e "require('dotenv').config(); console.log('DB_NAME:', process.env.DB_NAME)"

# Kontrollera användare i databas
node -e "const pool = require('./db'); pool.query('SELECT COUNT(*) FROM users').then(r => console.log('Users:', r.rows[0].count))"
```

**SoC säkerställer att varje steg i startup-processen har sitt eget ansvarsområde och körs i rätt ordning.**
