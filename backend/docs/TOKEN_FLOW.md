# JWT Token Flow & Refresh Token System

## ⚠️ CRITICAL - DO NOT MODIFY WITHOUT UNDERSTANDING

Detta dokument beskriver JWT token flow-systemet i applikationen. **Detta är en standardiserad, beprövad implementation som INTE ska modifieras utan grundlig förståelse av säkerhetsimplikationer.**

## Översikt

Applikationen använder en modern, säker JWT-baserad autentisering med:
- **Access Tokens** (24h livslängd) - För API-anrop
- **Refresh Tokens** (7d livslängd) - För att förnya access tokens
- **Token Rotation** - Gamla refresh tokens revokeras när nya skapas
- **Backward Compatibility** - Stöd för gamla JWT-strukturer under migration

## Arkitektur

```
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │
       │ 1. Login (email + password)
       ▼
┌──────────────────────────────────┐
│  Backend Auth Controller         │
│  POST /api/auth/login           │
└──────┬───────────────────────────┘
       │
       │ 2. Generate Access Token + Refresh Token
       ▼
┌──────────────────────────────────┐
│  Database (refresh_tokens)       │
│  - Spara refresh token           │
│  - user_id, token, expires_at    │
└──────┬───────────────────────────┘
       │
       │ 3. Set HTTP-only cookies
       │    - token (access token)
       │    - refreshToken
       ▼
┌─────────────┐
│   Frontend  │
│  Användaren │
│   inloggad  │
└──────┬──────┘
       │
       │ 4. API request med expired access token
       ▼
┌──────────────────────────────────┐
│  apiClient (Frontend)            │
│  - Upptäcker 401                 │
│  - Automatiskt: POST /api/auth/  │
│    refresh med refreshToken      │
└──────┬───────────────────────────┘
       │
       │ 5. Token Rotation
       ▼
┌──────────────────────────────────┐
│  Backend Refresh Controller      │
│  - Validera refresh token        │
│  - Revokera gammalt token        │
│  - Skapa nytt access token       │
│  - Skapa nytt refresh token      │
│  - Spara nytt refresh token      │
└──────┬───────────────────────────┘
       │
       │ 6. Retry original request
       ▼
┌─────────────┐
│   Success!  │
│  Användaren │
│ märker inget│
└─────────────┘
```

## Token Livscykler

### Access Token (24h)
```javascript
{
  userId: 1,
  email: "user@example.com",
  role: "customer",
  iat: 1234567890,
  exp: 1234654290  // 24h senare
}
```

**Använding:**
- Skickas med varje API-anrop i HTTP-only cookie
- Valideras av verifyJWT middleware
- Innehåller användarinfo för auktorisering

### Refresh Token (7d)
```javascript
{
  userId: 1,
  email: "user@example.com",
  iat: 1234567890,
  exp: 1235172690  // 7d senare
}
```

**Använding:**
- Används ENDAST för att förnya access token
- Sparas i databas (refresh_tokens tabell)
- Revokeras vid användning (Token Rotation)
- Revokeras vid logout

## Databas Schema

### refresh_tokens tabell

```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  replaced_by_token VARCHAR(500),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

**Fält:**
- `token` - Själva refresh token (JWT)
- `expires_at` - När token går ut
- `revoked` - Om token har återkallats
- `replaced_by_token` - Spårning av token rotation

## Backend Implementation

### 1. AuthService (backend/src/services/authService.js)

**Kritiska metoder:**

```javascript
// Generate tokens
static generateToken(payload)        // Access token (24h)
static generateRefreshToken(payload) // Refresh token (7d)

// Database operations
static async saveRefreshToken(userId, token)
static async validateRefreshToken(token)
static async revokeRefreshToken(oldToken, newToken)
static async revokeAllUserTokens(userId)

// Periodic cleanup
static async cleanupExpiredTokens()
```

**⚠️ VARNING:** Ändra ALDRIG JWT payload-struktur utan backward compatibility!

### 2. Auth Controller (backend/src/controllers/authController.js)

**Login Flow:**
```javascript
static async login(req, res) {
  // 1. Validera credentials
  // 2. Generera access + refresh tokens
  // 3. Spara refresh token i DB
  // 4. Sätt HTTP-only cookies
  // 5. Returnera användarinfo
}
```

**Refresh Flow (TOKEN ROTATION):**
```javascript
static async refreshToken(req, res) {
  // 1. Hämta refresh token från cookie
  // 2. Validera token från DB (ej revokerad, ej expired)
  // 3. Generera NYA access + refresh tokens
  // 4. REVOKERA gammalt refresh token
  // 5. Spara nytt refresh token
  // 6. Returnera nya tokens
}
```

**Logout Flow:**
```javascript
static async logout(req, res) {
  // 1. Revokera ALLA användarens refresh tokens
  // 2. Rensa cookies
}
```

### 3. JWT Middleware (backend/src/middleware/authMiddleware.js)

**BACKWARD COMPATIBILITY:**
```javascript
function verifyJWT(req, res, next) {
  const decoded = jwt.verify(token, JWT_SECRET);

  // STÖDJER både gamla JWTs med 'id' och nya med 'userId'
  // DO NOT REMOVE THIS - Migration strategy
  if (!decoded.userId && decoded.id) {
    decoded.userId = decoded.id;
  }

  req.user = decoded;
  next();
}
```

**⚠️ VIKTIGT:** Ta INTE bort backward compatibility-koden förrän ALLA användare har nya tokens!

## Frontend Implementation

### apiClient (frontend/src/services/apiClient.js)

**Automatisk Token Refresh:**

```javascript
export async function apiRequest(endpoint, options) {
  const response = await fetch(url, options);

  // Vid 401: Försök automatiskt förnya token
  if (response.status === 401) {
    const refreshSuccess = await refreshAccessToken();

    if (refreshSuccess) {
      // Retry original request med nytt token
      return fetch(url, options);
    } else {
      // Logga ut användaren
      logout();
    }
  }

  return response;
}
```

**Request Queueing:**
- Om flera requests får 401 samtidigt
- Köar de tills refresh är klar
- Alla retryas automatiskt med nytt token

## Säkerhetsfunktioner

### 1. Token Rotation
När refresh token används för att få nytt access token:
- Gammalt refresh token REVOKERAS omedelbart
- Nytt refresh token skapas och sparas
- Detta förhindrar replay-attacker

### 2. HTTP-only Cookies
Tokens sparas ALDRIG i localStorage eller sessionStorage:
- Skyddar mot XSS-attacker
- JavaScript kan inte läsa tokens
- Automatiskt skickas med requests

### 3. Database Validation
Refresh tokens valideras alltid mot databas:
- Kontrollerar att token inte är revokerad
- Kontrollerar expiration
- Tillåter omedelbar revokering vid behov

### 4. Backward Compatibility
Under migration från gamla till nya JWT:
- Middleware normaliserar fält automatiskt
- Gamla tokens fungerar tills de expirerar naturligt
- Inga användare påverkas

## Migration Strategy

Vid ändringar av JWT payload-struktur:

### ✅ Rätt approach (Zero Downtime):

1. **Dag 1:** Deploy med backward compatibility
   ```javascript
   const userId = req.user.userId || req.user.id;
   ```

2. **Dag 1-30:** Gamla tokens fungerar fortfarande
   - Nya inloggningar får nya tokens
   - Gamla tokens expirerar naturligt (24h access, 7d refresh)

3. **Efter 7 dagar:** Alla refresh tokens har nya strukturen
   - Access tokens max 24h gamla

4. **Efter säkerhetsmarginal (30 dagar):** Ta bort fallback
   ```javascript
   const userId = req.user.userId; // Ingen fallback
   ```

### ❌ Fel approach (Breaking Change):

```javascript
// GÖR INTE SÅ HÄR!
const userId = req.user.userId; // Alla gamla tokens slutar fungera!
```

## Felsökning

### Problem: "Invalid or expired refresh token"

**Orsak:** Refresh token finns inte i DB eller är revokerat

**Lösning:**
1. Kontrollera refresh_tokens tabell
2. Kolla om token har `revoked = TRUE`
3. Verifiera att token inte har gått ut

### Problem: "Användare blir utloggad efter kort tid"

**Orsak:** Refresh-mekanismen fungerar inte

**Kontroll:**
1. Kolla browser console för refresh-requests
2. Verifiera att `/api/auth/refresh` fungerar
3. Kontrollera att cookies sätts korrekt

### Problem: "Infinite refresh loop"

**Orsak:** apiClient försöker refresha refresh-endpoint

**Lösning:** Redan fixat med:
```javascript
if (endpoint.includes('/auth/refresh')) {
  // Försök INTE refresha refresh-endpoint!
}
```

## Maintenance

### Periodic Cleanup

Kör regelbundet (t.ex. daglig cron job):

```javascript
await AuthService.cleanupExpiredTokens();
```

Detta raderar tokens som gått ut för mer än 30 dagar sedan.

### Monitoring

**Övervaka:**
- Antal aktiva refresh tokens per användare
- Antal revokerade tokens
- Failed refresh attempts
- Token rotation frequency

**Databas-queries för monitoring:**

```sql
-- Antal aktiva tokens per användare
SELECT user_id, COUNT(*)
FROM refresh_tokens
WHERE revoked = FALSE
GROUP BY user_id;

-- Gamla tokens som borde ha rensats
SELECT COUNT(*)
FROM refresh_tokens
WHERE expires_at < NOW() - INTERVAL '30 days';

-- Revokerade tokens senaste 24h
SELECT COUNT(*)
FROM refresh_tokens
WHERE revoked = TRUE
  AND revoked_at > NOW() - INTERVAL '24 hours';
```

## API Endpoints

### POST /api/auth/login
**Input:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Output:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGc..."
  }
}
```

**Cookies satta:**
- `token` (HTTP-only, 24h)
- `refreshToken` (HTTP-only, 7d)

### POST /api/auth/refresh
**Input:** Ingen (läser refreshToken från cookie)

**Output:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGc..."
  }
}
```

**Cookies uppdaterade:**
- `token` (nytt access token)
- `refreshToken` (nytt refresh token via rotation)

### POST /api/auth/logout
**Output:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Effekt:**
- Alla användarens refresh tokens revokeras i DB
- Cookies rensas

## Testing

### Manual Testing

1. **Login:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}' \
     -c cookies.txt
   ```

2. **Test protected endpoint:**
   ```bash
   curl http://localhost:3001/api/profile \
     -b cookies.txt
   ```

3. **Refresh token:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/refresh \
     -b cookies.txt \
     -c cookies.txt
   ```

4. **Logout:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/logout \
     -b cookies.txt
   ```

### Automated Testing

**Test scenarios:**
- [ ] Login skapar access + refresh tokens
- [ ] Refresh tokens sparas i databas
- [ ] Access token fungerar för protected endpoints
- [ ] Expired access token → automatisk refresh
- [ ] Refresh token rotation
- [ ] Logout revokerar alla tokens
- [ ] Backward compatibility med gamla JWTs

## Best Practices

### ✅ DO:
- Använd HTTP-only cookies för tokens
- Implementera token rotation
- Validera refresh tokens mot databas
- Ha backward compatibility vid ändringar
- Rensa gamla tokens regelbundet
- Logga refresh attempts för monitoring

### ❌ DON'T:
- Spara tokens i localStorage
- Ändra JWT payload utan backward compatibility
- Glöm att revokera tokens vid logout
- Implementera egen crypto (använd libraries)
- Låt gamla tokens ligga kvar i DB för evigt
- Ta bort backward compatibility för tidigt

## Viktiga Filer

**Backend:**
- `backend/createTables.js` - Databas schema
- `backend/src/services/authService.js` - Token generation/validation
- `backend/src/controllers/authController.js` - API endpoints
- `backend/src/middleware/authMiddleware.js` - JWT verification
- `backend/src/routes/auth_new.js` - Routes

**Frontend:**
- `frontend/src/services/apiClient.js` - Automatic token refresh
- `frontend/src/services/auth/authService.js` - Auth API calls
- `frontend/src/hooks/useAuth.js` - Auth state management

## Support & Questions

Vid frågor om token flow-systemet:

1. Läs denna dokumentation först
2. Kontrollera relevanta filer ovan
3. Testa manuellt med curl-kommandon
4. Kolla browser console och backend logs

**VIKTIGT:** Ändra INTE systemet utan att förstå säkerhetsimplikationerna!

---

**Senast uppdaterad:** 2025-11-23
**Version:** 1.0
**Författare:** Claude Code Implementation
