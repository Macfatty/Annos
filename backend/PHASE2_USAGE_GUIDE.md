# 📖 PHASE 2 - Restaurant Management API Usage Guide

**Version:** 1.0
**Date:** 2025-11-26
**API Base URL:** `http://localhost:3001`

---

## 🎯 Översikt

PHASE 2 introducerar ett komplett Restaurant Management System med RESTful API endpoints för att hantera restauranger och menyer. Alla endpoints följer PHASE 1:s permission-baserade säkerhet.

---

## 🔐 Autentisering

De flesta endpoints kräver autentisering. Du behöver först logga in för att få en JWT-token.

### Logga in som Admin
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }' \
  -c cookies.txt
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Token sparas automatiskt i `cookies.txt` och kan användas i efterföljande requests med `-b cookies.txt`.

---

## 📍 API Endpoints

### 1. Hämta alla restauranger (Publikt)

**Endpoint:** `GET /api/restaurants`
**Autentisering:** Nej
**Permission:** Ingen

Hämtar alla aktiva restauranger.

```bash
curl http://localhost:3001/api/restaurants
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "campino",
      "namn": "Campino",
      "beskrivning": "Italiensk pizza och pasta",
      "address": null,
      "phone": null,
      "email": null,
      "logo_url": null,
      "banner_url": null,
      "is_active": true,
      "opening_hours": null,
      "menu_file_path": "Data/menyer/campino.json",
      "created_at": "2025-11-26T17:42:51.675Z",
      "updated_at": "2025-11-26T17:42:51.675Z"
    },
    {
      "id": 2,
      "slug": "sunsushi",
      "namn": "SunSushi",
      "beskrivning": "Japansk sushi och asiatisk mat",
      "address": null,
      "phone": null,
      "email": null,
      "logo_url": null,
      "banner_url": null,
      "is_active": true,
      "opening_hours": null,
      "menu_file_path": "Data/menyer/sunsushi.json",
      "created_at": "2025-11-26T17:42:51.675Z",
      "updated_at": "2025-11-26T17:42:51.675Z"
    }
  ],
  "count": 2
}
```

**Admin-variant (inkluderar inaktiva):**
```bash
curl "http://localhost:3001/api/restaurants?includeInactive=true" \
  -b cookies.txt
```

---

### 2. Hämta en specifik restaurang (Publikt)

**Endpoint:** `GET /api/restaurants/:slug`
**Autentisering:** Nej
**Permission:** Ingen

```bash
curl http://localhost:3001/api/restaurants/campino
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "campino",
    "namn": "Campino",
    "beskrivning": "Italiensk pizza och pasta",
    "address": null,
    "phone": null,
    "email": null,
    "logo_url": null,
    "banner_url": null,
    "is_active": true,
    "opening_hours": null,
    "menu_file_path": "Data/menyer/campino.json",
    "created_at": "2025-11-26T17:42:51.675Z",
    "updated_at": "2025-11-26T17:42:51.675Z"
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Restaurant not found",
  "message": "Restaurant not found: nonexistent"
}
```

---

### 3. Hämta restaurangmeny (Publikt)

**Endpoint:** `GET /api/restaurants/:slug/menu`
**Autentisering:** Nej
**Permission:** Ingen

```bash
curl http://localhost:3001/api/restaurants/campino/menu
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "namn": "MARGARITA",
      "kategori": "Vegetarisk-Pizza",
      "pris": 125,
      "familjepris": 280,
      "beskrivning": "tomat, ost",
      "ingredienser": "tomat, ost",
      "tillbehor": [406, 500],
      "bild": "Magarita.png"
    },
    {
      "id": 2,
      "namn": "VESUVIO",
      "kategori": "Pizza",
      "pris": 130,
      "familjepris": 310,
      "beskrivning": "skinka",
      "ingredienser": "skinka",
      "tillbehor": [300],
      "bild": "Vesuvio.jpg"
    }
  ],
  "count": 79
}
```

**Note:** Detta är samma data som `/api/meny/:slug` (backward compatible)

---

### 4. Skapa ny restaurang (Admin)

**Endpoint:** `POST /api/restaurants`
**Autentisering:** Ja
**Permission:** `restaurant:manage`

```bash
curl -X POST http://localhost:3001/api/restaurants \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "slug": "pizza-palace",
    "namn": "Pizza Palace",
    "beskrivning": "Bästa pizzan i stan",
    "address": "Storgatan 1, Stockholm",
    "phone": "08-123456",
    "email": "info@pizzapalace.se",
    "opening_hours": {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00",
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "12:00-23:00",
      "sunday": "12:00-21:00"
    }
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "slug": "pizza-palace",
    "namn": "Pizza Palace",
    "beskrivning": "Bästa pizzan i stan",
    "address": "Storgatan 1, Stockholm",
    "phone": "08-123456",
    "email": "info@pizzapalace.se",
    "logo_url": null,
    "banner_url": null,
    "is_active": true,
    "opening_hours": {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00",
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "12:00-23:00",
      "sunday": "12:00-21:00"
    },
    "menu_file_path": "Data/menyer/pizza-palace.json",
    "created_at": "2025-11-26T18:00:00.000Z",
    "updated_at": "2025-11-26T18:00:00.000Z"
  },
  "message": "Restaurant created successfully"
}
```

**Vad händer automatiskt:**
- Tom meny-fil skapas på `Data/menyer/pizza-palace.json`
- Audit log skapas med action `restaurant:create`
- Transaction säkerställer att både databas och fil skapas atomiskt

**Error (409 Conflict):**
```json
{
  "success": false,
  "error": "Conflict",
  "message": "Restaurant with slug 'pizza-palace' already exists"
}
```

---

### 5. Uppdatera restaurang (Admin)

**Endpoint:** `PUT /api/restaurants/:slug`
**Autentisering:** Ja
**Permission:** `restaurant:manage`

```bash
curl -X PUT http://localhost:3001/api/restaurants/campino \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "address": "Via Roma 42, Stockholm",
    "phone": "08-555-1234",
    "email": "kontakt@campino.se",
    "opening_hours": {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00",
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "12:00-23:00",
      "sunday": "Stängt"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "campino",
    "namn": "Campino",
    "beskrivning": "Italiensk pizza och pasta",
    "address": "Via Roma 42, Stockholm",
    "phone": "08-555-1234",
    "email": "kontakt@campino.se",
    "logo_url": null,
    "banner_url": null,
    "is_active": true,
    "opening_hours": {
      "monday": "11:00-22:00",
      "tuesday": "11:00-22:00",
      "wednesday": "11:00-22:00",
      "thursday": "11:00-22:00",
      "friday": "11:00-23:00",
      "saturday": "12:00-23:00",
      "sunday": "Stängt"
    },
    "menu_file_path": "Data/menyer/campino.json",
    "created_at": "2025-11-26T17:42:51.675Z",
    "updated_at": "2025-11-26T18:05:00.000Z"
  },
  "message": "Restaurant updated successfully"
}
```

**Tips:**
- Du behöver bara skicka de fält du vill uppdatera
- `slug` kan **INTE** ändras
- `updated_at` uppdateras automatiskt via trigger

---

### 6. Ta bort restaurang (Admin)

**Endpoint:** `DELETE /api/restaurants/:slug`
**Autentisering:** Ja
**Permission:** `restaurant:manage`

```bash
curl -X DELETE http://localhost:3001/api/restaurants/pizza-palace \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurant deleted successfully"
}
```

**Viktigt:**
- Detta är en **soft delete** - restaurangen tas inte bort från databasen
- `is_active` sätts till `false`
- Data bevaras för audit/historik
- Meny-filen finns kvar på disk
- Audit log skapas med action `restaurant:delete`

---

### 7. Uppdatera meny (Admin/Restaurant)

**Endpoint:** `PUT /api/restaurants/:slug/menu`
**Autentisering:** Ja
**Permission:** `menu:edit`

```bash
curl -X PUT http://localhost:3001/api/restaurants/campino/menu \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '[
    {
      "id": 1,
      "namn": "MARGARITA",
      "kategori": "Vegetarisk-Pizza",
      "pris": 129,
      "familjepris": 289,
      "beskrivning": "tomat, ost, basilika",
      "ingredienser": "tomat, ost, basilika",
      "tillbehor": [406, 500],
      "bild": "Margarita.png"
    },
    {
      "id": 2,
      "namn": "VESUVIO",
      "kategori": "Pizza",
      "pris": 135,
      "familjepris": 315,
      "beskrivning": "skinka",
      "ingredienser": "skinka",
      "tillbehor": [300],
      "bild": "Vesuvio.jpg"
    }
  ]'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "version": 2
  },
  "message": "Menu updated successfully"
}
```

**Vad händer automatiskt:**

1. **Validering:**
   - Kontrollerar att alla required fields finns (id, namn, kategori, pris)
   - Kontrollerar att pris är ett positivt nummer
   - Kontrollerar att inga duplicate IDs finns

2. **Säkerhet:**
   - Backup skapas automatiskt i `Data/menyer/backups/campino_1732645200000.json`
   - Om något går fel rullas hela operationen tillbaka (transaction)

3. **Versionshantering:**
   - Ny version sparas i `menu_versions` tabell
   - Version-nummer incrementeras automatiskt

4. **Audit:**
   - Log skapas med action `menu:update`

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation error",
  "message": "Menu item 3: Missing required field 'pris'"
}
```

---

### 8. Hämta meny-versioner (Admin/Restaurant)

**Endpoint:** `GET /api/restaurants/:slug/menu/versions`
**Autentisering:** Ja
**Permission:** `menu:edit`

```bash
curl http://localhost:3001/api/restaurants/campino/menu/versions \
  -b cookies.txt
```

**Med limit:**
```bash
curl "http://localhost:3001/api/restaurants/campino/menu/versions?limit=5" \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "restaurant_slug": "campino",
      "version": 3,
      "menu_json": [...],
      "created_by": 1,
      "created_at": "2025-11-26T18:10:00.000Z",
      "notes": "Menu updated"
    },
    {
      "id": 2,
      "restaurant_slug": "campino",
      "version": 2,
      "menu_json": [...],
      "created_by": 1,
      "created_at": "2025-11-26T18:05:00.000Z",
      "notes": "Menu updated"
    },
    {
      "id": 1,
      "restaurant_slug": "campino",
      "version": 1,
      "menu_json": [...],
      "created_by": 1,
      "created_at": "2025-11-26T18:00:00.000Z",
      "notes": "Initial menu"
    }
  ],
  "count": 3
}
```

---

### 9. Återställ meny från version (Admin)

**Endpoint:** `POST /api/restaurants/:slug/menu/restore/:version`
**Autentisering:** Ja
**Permission:** `restaurant:manage`

```bash
curl -X POST http://localhost:3001/api/restaurants/campino/menu/restore/2 \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "version": 4,
    "restored_from": 2
  },
  "message": "Menu restored to version 2"
}
```

**Vad händer:**
- Hämtar meny från version 2
- Skapar en **NY** version (version 4) med samma innehåll
- Uppdaterar meny-filen
- Skapar backup (som vanligt)
- Audit log med action `menu:restore`

**Error (404):**
```json
{
  "success": false,
  "error": "Not found",
  "message": "Menu version 99 not found for restaurant campino"
}
```

---

## 🛡️ Permissions & Roller

### Customer
```
✅ GET /api/restaurants (public)
✅ GET /api/restaurants/:slug (public)
✅ GET /api/restaurants/:slug/menu (public)
❌ Alla andra endpoints
```

### Restaurant
```
✅ GET /api/restaurants (public)
✅ GET /api/restaurants/:slug (public)
✅ GET /api/restaurants/:slug/menu (public)
✅ PUT /api/restaurants/:slug/menu (menu:edit)
✅ GET /api/restaurants/:slug/menu/versions (menu:edit)
❌ POST /api/restaurants
❌ PUT /api/restaurants/:slug
❌ DELETE /api/restaurants/:slug
❌ POST /api/restaurants/:slug/menu/restore/:version
```

### Admin
```
✅ ALLA endpoints (admin har alla permissions)
```

---

## 💡 Användningsexempel

### Exempel 1: Uppdatera restauranginfo med bilder

```bash
curl -X PUT http://localhost:3001/api/restaurants/campino \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "logo_url": "https://example.com/logos/campino-logo.png",
    "banner_url": "https://example.com/banners/campino-banner.jpg"
  }'
```

### Exempel 2: Skapa restaurang med öppettider

```bash
curl -X POST http://localhost:3001/api/restaurants \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "slug": "burgerking",
    "namn": "Burger King",
    "beskrivning": "Hemma på hamburgare",
    "opening_hours": {
      "monday": "10:00-22:00",
      "tuesday": "10:00-22:00",
      "wednesday": "10:00-22:00",
      "thursday": "10:00-22:00",
      "friday": "10:00-23:00",
      "saturday": "11:00-23:00",
      "sunday": "11:00-22:00"
    }
  }'
```

### Exempel 3: Lägg till nytt menyobjekt

```bash
# 1. Hämta nuvarande meny
curl http://localhost:3001/api/restaurants/campino/menu > current-menu.json

# 2. Lägg till nytt objekt i filen (använd text editor)

# 3. Uppdatera menyn
curl -X PUT http://localhost:3001/api/restaurants/campino/menu \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d @current-menu.json
```

### Exempel 4: Återställ meny efter misstag

```bash
# 1. Lista versioner
curl http://localhost:3001/api/restaurants/campino/menu/versions -b cookies.txt

# 2. Återställ till version 3
curl -X POST http://localhost:3001/api/restaurants/campino/menu/restore/3 \
  -b cookies.txt
```

---

## 🔍 Felsökning

### Problem: "Forbidden" fel

**Symptom:**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to perform this action",
  "required_permission": "restaurant:manage",
  "your_role": "customer"
}
```

**Lösning:**
- Kontrollera att du är inloggad som rätt användare
- Endast admin och restaurant-användare har tillgång till vissa endpoints

### Problem: "Validation error" när man uppdaterar meny

**Symptom:**
```json
{
  "success": false,
  "error": "Validation error",
  "message": "Menu item 5: Missing required field 'kategori'"
}
```

**Lösning:**
- Kontrollera att alla menyobjekt har required fields: `id`, `namn`, `kategori`, `pris`
- Kontrollera att `pris` är ett positivt nummer
- Kontrollera att inga duplicate IDs finns

### Problem: Meny visas inte efter uppdatering

**Lösning:**
- Kontrollera att uppdateringen lyckades (kolla response)
- Hämta menyn igen: `GET /api/restaurants/:slug/menu`
- Om backup finns: återställ från version

---

## 📊 Audit Logging

Alla write-operationer loggas automatiskt i `audit_logs` tabell.

**Loggade actions:**
- `restaurant:create` - Ny restaurang skapad
- `restaurant:update` - Restaurang uppdaterad
- `restaurant:delete` - Restaurang borttagen (soft delete)
- `menu:update` - Meny uppdaterad
- `menu:restore` - Meny återställd från version

**Visa audit logs:**
```bash
cd backend
node check-audit.js
```

---

## 🎓 Best Practices

### 1. Alltid testa meny-uppdateringar lokalt först

```bash
# Validera JSON-syntax först
cat new-menu.json | python3 -m json.tool

# Testa sedan med API
curl -X PUT http://localhost:3001/api/restaurants/test/menu \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d @new-menu.json
```

### 2. Använd versionshantering

- Inte rädd för att uppdatera menyer - backups skapas automatiskt
- Du kan alltid återställa till tidigare version
- Versionshistorik sparas för alltid

### 3. Soft delete är din vän

- Ta inte bort restauranger permanent
- Använd soft delete (`DELETE /api/restaurants/:slug`)
- Data bevaras för historik och audit

### 4. Opening hours i JSONB-format

```json
{
  "opening_hours": {
    "monday": "11:00-22:00",
    "tuesday": "11:00-22:00",
    "wednesday": "11:00-22:00",
    "thursday": "11:00-22:00",
    "friday": "11:00-23:00",
    "saturday": "12:00-23:00",
    "sunday": "Stängt"
  }
}
```

Detta format är flexibelt och kan enkelt utökas med fler fält senare.

---

## 🔗 Relaterade resurser

- **PHASE 1 Summary:** `backend/PHASE1_COMPLETE_SUMMARY.md`
- **PHASE 2 Summary:** `backend/PHASE2_COMPLETE_SUMMARY.md`
- **Test Suite:** `backend/test-restaurant-service.js`
- **Migration:** `backend/migrations/003_restaurants_extended.js`

---

## 📞 Support

Om du stöter på problem:
1. Kolla felsökningssektionen ovan
2. Kör testerna: `node test-restaurant-service.js`
3. Kolla audit logs: `node check-audit.js`
4. Läs PHASE2_COMPLETE_SUMMARY.md för detaljerad info

---

**Skapad:** 2025-11-26
**Version:** 1.0
**Status:** Production Ready ✅
