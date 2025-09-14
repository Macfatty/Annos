# KRITISKA UTVECKLINGSREGLER

## 🚨 REGEL 1: Testa alltid hela flödet efter ändringar

**När jag gör ändringar i autentisering, API-anrop eller fetch-funktioner måste jag ALLTID testa att hela beställningsflödet fortfarande fungerar.**

### Vad som måste testas efter varje ändring:
1. ✅ Fungerar admin-beställningar?
2. ✅ Fungerar customer-beställningar? 
3. ✅ Fungerar autentisering?
4. ✅ Fungerar alla API-endpoints?
5. ✅ Fungerar KurirVy och RestaurangVy?

### Varför detta är kritiskt:
- Ändringar som påverkar admin-användare påverkar också slutanvändare (kunder)
- Om admin inte kan lägga beställningar, kan inte kunderna heller
- Bryta beställningsflödet = bryta hela applikationen

## 🚨 REGEL 2: Behåll befintlig autentisering

**Förändra INTE autentiseringsmetoden utan att först förstå hela systemet.**

### Vad som är förbjudet:
- Lägga till `credentials: "include"` när systemet använder Bearer tokens
- Ändra från localStorage till cookies utan att uppdatera backend
- Blanda olika autentiseringsmetoder

### Vad som är tillåtet:
- Lägga till BASE_URL till befintliga fetch-anrop
- Fixa relativa URLs till absoluta URLs
- Behålla befintlig Bearer token-autentisering

## 🚨 REGEL 3: Återställ vid problem

**Om någon ändring bryter beställningsflödet, återställ ändringarna omedelbart.**

### Återställningsprocess:
1. Identifiera vad som bröts
2. Återställ till fungerande tillstånd
3. Testa att allt fungerar igen
4. Gör mindre, säkrare ändringar istället

## 🚨 REGEL 4: Ändra INTE layout utan tillstånd

**Ändra INTE visuell layout, styling eller UI-struktur utan explicit tillstånd från användaren.**

### Vad som är förbjudet:
- Ändra CSS-styling utan att bli ombedd
- Flytta element eller ändra layout-struktur
- Ändra färger, storlekar eller positionering
- Modifiera responsiv design utan tillstånd

### Vad som är tillåtet:
- Fixa funktionalitetsbuggar
- Lägga till ny funktionalitet när det begärs
- Förbättra kodstruktur och logik
- Uppdatera dokumentation

### Undantag:
- Endast när användaren explicit ber om layout-ändringar
- Endast när det är nödvändigt för att fixa kritiska buggar

## 📝 Exempel på säkra ändringar:
```javascript
// SÄKERT: Lägga till BASE_URL
const response = await fetch(`${BASE_URL}/api/endpoint`, {
  headers: { Authorization: `Bearer ${token}` }
});

// FÖRBJUDET: Blanda autentiseringsmetoder
const response = await fetch(`${BASE_URL}/api/endpoint`, {
  headers: { Authorization: `Bearer ${token}` },
  credentials: "include"  // ❌ Detta kan bryta systemet
});
```

## 🎯 Målsättning:
**Varje ändring ska förbättra systemet utan att bryta befintlig funktionalitet.**

## 🔐 REGEL 5: Autentiseringsstandard - UPPDATERAD

**Använd ALLTID cookies för autentisering. Systemet använder `credentials: "include"` för alla API-anrop.**

### Standard för alla komponenter:
```javascript
// ✅ KORREKT - Använd alltid denna standard:
const response = await fetch(`${BASE_URL}/api/endpoint`, {
  credentials: "include"  // ✅ OBLIGATORISKT!
});

// ❌ FÖRBJUDET - Använd aldrig Bearer tokens:
const token = localStorage.getItem("accessToken");
const response = await fetch(`${BASE_URL}/api/endpoint`, {
  headers: {
    Authorization: `Bearer ${token}`,  // ❌ FÖRBJUDET!
    "Content-Type": "application/json"
  }
});
```

### API-endpoint standard:
```javascript
// ADMIN ENDPOINTS:
GET /api/admin/orders          // Alla ordrar (med filter)
GET /api/admin/orders/today    // Endast dagens ordrar
PATCH /api/admin/orders/:id/status  // Uppdatera status

// RESTAURANT ENDPOINTS:
GET /api/restaurant/orders     // Restaurangens ordrar
PATCH /api/restaurant/orders/:id/status  // Uppdatera status

// COURIER ENDPOINTS:
GET /api/courier/orders        // Kurirens ordrar
PATCH /api/courier/orders/:id/accept     // Acceptera order
PATCH /api/courier/orders/:id/delivered  // Markera som levererad
```

### Middleware standard:
```javascript
// ✅ Använd verifyRole med admin-bypass:
verifyRole(['admin', 'restaurant', 'courier'])

// ❌ Undvik verifyAdminForSlug (för restriktiv):
verifyAdminForSlug  // FÖRBJUDET för nya endpoints
```

### Varför denna standard:
- **Enhetlig**: Alla komponenter använder samma autentiseringsmetod
- **Säker**: HTTP-only cookies kan inte nås av JavaScript
- **Enkel**: Inga token-hantering i frontend
- **Konsekvent**: Samma autentisering överallt
- **Skalbar**: Fungerar med microservices-arkitektur

## 🔐 REGEL 6: API-autentisering - KONKRET SAMMANFATTNING

**KRITISK: Blanda INTE autentiseringsmetoder! Systemet använder cookies för autentisering.**

### ✅ VAD SOM ÄR RÄTT:

#### **1. Login/Logout - Använd cookies:**
```javascript
// ✅ KORREKT för login/logout:
const response = await fetch(`${BASE_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // ✅ Använd cookies
  body: JSON.stringify({ email, losenord })
});
```

#### **2. Profil-hämtning - Använd cookies:**
```javascript
// ✅ KORREKT för fetchProfile():
const response = await fetch(`${BASE_URL}/api/profile`, {
  credentials: "include" // ✅ Använd cookies
});
```

#### **3. Beställningar - Använd cookies:**
```javascript
// ✅ KORREKT för createOrder():
const response = await fetch(`${BASE_URL}/api/order`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // ✅ Använd cookies
  body: JSON.stringify(payload)
});
```

#### **4. Admin/Restaurant/Courier endpoints - Använd cookies:**
```javascript
// ✅ KORREKT för alla admin/restaurant/courier endpoints:
const response = await fetch(`${BASE_URL}/api/admin/orders`, {
  credentials: "include" // ✅ Använd cookies
});
```

### ❌ VAD SOM INTE ÄR OKEJ:

#### **1. Blanda Bearer tokens med cookies:**
```javascript
// ❌ FÖRBJUDET - Blanda inte metoder:
const token = localStorage.getItem("accessToken");
const response = await fetch(`${BASE_URL}/api/profile`, {
  headers: { Authorization: `Bearer ${token}` }, // ❌ Bearer token
  credentials: "include" // ❌ + cookies = KONFLIKT!
});
```

#### **2. Använda Bearer tokens för profil-hämtning:**
```javascript
// ❌ FÖRBJUDET - fetchProfile() ska använda cookies:
const token = localStorage.getItem("accessToken");
const response = await fetch(`${BASE_URL}/api/profile`, {
  headers: { Authorization: `Bearer ${token}` } // ❌ Orsakar 401-fel
});
```

### 🎯 FUNKTIONALITET SOM MÅSTE FUNGERA:

#### **1. Login/Logout:**
- ✅ **Login** - skapar session cookie
- ✅ **Logout** - tar bort session cookie
- ✅ **Session** - sparas i cookie, inte localStorage

#### **2. Beställningar:**
- ✅ **Lägga beställning** - använder session cookie
- ✅ **Admin kan beställa** - använder session cookie
- ✅ **Customer kan beställa** - använder session cookie

#### **3. Profil-hantering:**
- ✅ **Hämta profil** - använder session cookie
- ✅ **Uppdatera profil** - använder session cookie
- ✅ **Checkout auto-fill** - använder session cookie

#### **4. Admin-funktioner:**
- ✅ **Admin-panel** - använder session cookie
- ✅ **Restaurang-vy** - använder session cookie
- ✅ **Kurir-vy** - använder session cookie
- ✅ **Order-hantering** - använder session cookie

### 🚨 KRITISKA REGLER:

#### **1. Ändra INTE fetchProfile():**
```javascript
// ❌ FÖRBJUDET - Ändra aldrig denna funktion:
export async function fetchProfile() {
  const res = await fetch(`${BASE_URL}/api/profile`, {
    credentials: "include" // ✅ Låt denna vara som den är!
  });
  // ... resten av funktionen
}
```

#### **2. Ändra INTE createOrder():**
```javascript
// ❌ FÖRBJUDET - Ändra aldrig denna funktion:
export async function createOrder(payload) {
  const res = await fetch(`${BASE_URL}/api/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include" // ✅ Låt denna vara som den är!
  });
  // ... resten av funktionen
}
```

#### **3. Testa ALLTID hela flödet:**
```bash
# Efter varje ändring, testa:
1. ✅ Logga in som admin
2. ✅ Navigera till restaurang (Campino/SunSushi)
3. ✅ Lägg en beställning
4. ✅ Gå till admin-panel
5. ✅ Testa restaurang-vy
6. ✅ Testa kurir-vy
7. ✅ Testa "Uppdatera från profil"-knappen
```

### 🔧 FELSÖKNING:

#### **Om "Du måste logga in"-meddelande visas:**
1. **Kontrollera** att `fetchProfile()` använder `credentials: "include"`
2. **Kontrollera** att backend `/api/profile` endpoint fungerar
3. **Kontrollera** att session cookie finns i webbläsaren
4. **Kontrollera** att `loadProfile()` i App.jsx fungerar

#### **Om 401 Unauthorized-fel:**
1. **Kontrollera** att ingen Bearer token används för profil-hämtning
2. **Kontrollera** att `credentials: "include"` används
3. **Kontrollera** att session cookie inte är korrupt

### 📝 SAMMANFATTNING:

**SYSTEMET ANVÄNDER COOKIES FÖR AUTENTISERING - ÄNDRA INTE DETTA!**

- ✅ **Alla API-anrop** ska använda `credentials: "include"`
- ❌ **Inga Bearer tokens** för profil-hämtning eller beställningar
- ✅ **Session-hantering** via cookies
- ✅ **Admin-funktioner** via cookies
- ✅ **Beställningsflöde** via cookies

**Följ denna regel strikt för att undvika autentiseringsproblem!**

---

## 🔒 **REGEL 7: SÄKERHET OCH KÄNSLIG DATA**

### **KRITISKT: Aldrig hårdkoda lösenord eller API-nycklar!**

#### **✅ RÄTT:**
- Använd miljövariabler (`.env`-filer)
- Lägg `.env` i `.gitignore`
- Använd `process.env.VARIABLE_NAME`
- Kopiera från `env.example`

#### **❌ FEL:**
- Hårdkoda lösenord i koden
- Committa `.env`-filer till Git
- Exponera databas-anslutningar
- Lämna API-nycklar i koden

#### **Säker databashantering:**
```javascript
// ✅ RÄTT - Använd miljövariabler
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

// ❌ FEL - Hårdkodat lösenord
const pool = new Pool({
  user: 'postgres',
  password: 'postgres123', // ALDRIG!
  host: 'localhost',
  database: 'annos_dev'
});
```

#### **Miljövariabler som MÅSTE finnas:**
- `DB_PASSWORD` - PostgreSQL-lösenord
- `JWT_SECRET` - JWT-signering
- `REFRESH_SECRET` - Refresh token-signering
- `PAYMENT_PROVIDER_*` - Betalningsnycklar

**Säkerhet först - alltid!**
