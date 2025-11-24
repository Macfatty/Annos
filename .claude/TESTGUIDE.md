# 🧪 Testguide - Order Flow Testing

**Datum:** 2025-11-23
**Backend:** http://localhost:3001
**Frontend:** http://localhost:5173

---

## ✅ Vad Som Är Fixat

1. ✅ Backend status system uppdaterat (IN_PROGRESS borttagen)
2. ✅ RestaurangVy buttons uppdaterade (accepted → ready_for_pickup direkt)
3. ✅ RestaurangVy filter (visar bara received & accepted)
4. ✅ KurirVy komplett omskriven med filter
5. ✅ Kurir-vy 400 error fixad (getCourierOrders status filter)
6. ✅ Textsynlighet för dark mode fixad

---

## 🎯 PHASE 2.3: Testa Restaurang Flow

### Förberedelser:
1. **Logga in som admin** på http://localhost:5173/login
2. **Navigera till restaurang-vy** (välj Campino eller SunSushi)
3. **Se till att det finns en order** med status "received"

### Test Steg för Steg:

#### Steg 1: Se ny order (received)
- [ ] Ordern visas i restaurang-vyn
- [ ] Ordern har status badge "received" (gul/orange färg)+
- [ ] Knappen "Acceptera order" visas
- [ ] **Texten är läsbar** (namn, adress, telefon synliga i dark mode)
- [ ] **Customer notes visas** om det finns (t.ex. "lägg utanför min dörr")

#### Steg 2: Acceptera order
- [ ] Klicka på "Acceptera order"
- [ ] Ordern uppdateras till status "accepted" (blå färg)
- [ ] Knappen ändras till "Klar för hämtning"
- [ ] **Ingen error i backend-logs**
- [ ] **Frontend console utan errors**

#### Steg 3: Markera klar för hämtning
- [ ] Klicka på "Klar för hämtning"
- [ ] Ordern **FÖRSVINNER** från restaurang-vyn
- [ ] **Ingen error i backend-logs**
- [ ] Backend logg visar: Order status updated to 'ready_for_pickup'

### ✅ Förväntat Resultat:
Ordern ska nu vara **ready_for_pickup** och **INTE** längre synas i restaurang-vyn.

---

## 🚚 PHASE 3.4: Testa Kurir Flow

### Förberedelser:
1. **Säkerställ att PHASE 2.3 är klart** (order är ready_for_pickup)
2. **Navigera till kurir-vy:** http://localhost:5173/kurir-vy
3. **INGEN 400 error ska visas**

### Test Steg för Steg:

#### Steg 1: Se tillgängliga orders (ready_for_pickup)
- [ ] Kurir-vyn laddas **utan error**
- [ ] Fliken "Tillgängliga ordrar" är aktiv
- [ ] Ordern från restaurang-testet **visas här**
- [ ] Status badge visar "Klar för hämtning"
- [ ] Knappen "Acceptera order" visas
- [ ] **Texten är läsbar** (namn, adress, telefon)
- [ ] **Customer notes visas** korrekt

#### Steg 2: Acceptera order (kurir)
- [ ] Klicka på "Acceptera order"
- [ ] Ordern **FÖRSVINNER** från "Tillgängliga ordrar"
- [ ] Växla till fliken **"Mina ordrar"**
- [ ] Ordern visas där med status "assigned"
- [ ] Knappen "Hämtat order" visas
- [ ] **Ingen error i backend-logs**

#### Steg 3: Markera som hämtad
- [ ] Klicka på "Hämtat order"
- [ ] Ordern uppdateras till status "out_for_delivery"
- [ ] Knappen ändras till "Markera som levererad"
- [ ] **Ordern stannar kvar i "Mina ordrar"**
- [ ] **Ingen error i backend-logs**

#### Steg 4: Markera som levererad
- [ ] Klicka på "Markera som levererad"
- [ ] Ordern **FÖRSVINNER** från "Mina ordrar"
- [ ] Backend logg visar: Order status updated to 'delivered'
- [ ] **Ingen error i backend-logs**

### ✅ Förväntat Resultat:
Ordern ska nu vara **delivered** och **INTE** längre synas i kurir-vyn.

---

## 🔄 PHASE 4: Test Hela Flödet End-to-End

### Komplett Flöde:

```
KUND → lägger order → received
         ↓
🏪 RESTAURANG
   [Acceptera order] → accepted
   [Klar för hämtning] → ready_for_pickup
         ↓ (försvinner från restaurang)

🚚 KURIR (Tillgängliga)
   [Acceptera order] → assigned
         ↓ (flyttas till "Mina ordrar")

🚚 KURIR (Mina ordrar)
   [Hämtat order] → out_for_delivery
   [Markera levererad] → delivered
         ↓ (försvinner från kurir lista)

👤 KUND
   Ser levererad i historik
```

### Test Checklist:

#### 1. Skapa ny order
- [ ] Gå till http://localhost:5173
- [ ] Välj restaurang (Campino/SunSushi)
- [ ] Lägg till items i varukorgen
- [ ] Fyll i kundinfo
- [ ] **Lägg till customer note:** "Lägg utanför min dörr"
- [ ] Slutför köpet
- [ ] Verifiera att ordern skapades (received)

#### 2. Restaurang Flow
- [ ] Logga in som admin
- [ ] Gå till restaurang-vy
- [ ] Se ny order med status "received"
- [ ] **Verifiera att customer note visas:** "Lägg utanför min dörr"
- [ ] Acceptera order → accepted
- [ ] Markera klar → ready_for_pickup
- [ ] Ordern försvinner från listan

#### 3. Kurir Flow
- [ ] Gå till kurir-vy (http://localhost:5173/kurir-vy)
- [ ] Se ordern under "Tillgängliga ordrar"
- [ ] **Verifiera att customer note visas:** "Lägg utanför min dörr"
- [ ] Acceptera order → assigned
- [ ] Växla till "Mina ordrar"
- [ ] Hämtat order → out_for_delivery
- [ ] Markera levererad → delivered
- [ ] Ordern försvinner

#### 4. Admin Verifiering
- [ ] Gå till admin-panelen
- [ ] Sök upp ordern (Order #X)
- [ ] Verifiera att status är "delivered"
- [ ] Verifiera att alla timestamps är korrekta
- [ ] **Verifiera att customer note finns kvar i databasen**

---

## 🐛 Om Problem Uppstår

### Problem 1: 400 Error på kurir-vy
**Lösning:** Backend har redan fixats. Starta om backend om det fortfarande händer.

### Problem 2: Orders försvinner inte
**Symptom:** Order stannar kvar i restaurang-vy efter "Klar för hämtning"
**Lösning:** Kontrollera att frontend-koden har uppdaterats. Ladda om sidan med Ctrl+Shift+R.

### Problem 3: Customer notes syns inte
**Symptom:** Meddelanden som "lägg utanför min dörr" visas inte
**Lösning:** CSS har fixats. Ladda om sidan. Om fortfarande problem, kolla dark mode-inställningar.

### Problem 4: Text är grå/oläsbar i dark mode
**Symptom:** Adress, namn, telefon svåra att läsa
**Lösning:** CSS-variabler har uppdaterats. Ladda om sidan med cache-clear (Ctrl+Shift+R).

---

## 📊 Backend Logs att Kolla

När du testar, kolla backend-terminalen för dessa meddelanden:

### Bra Meddelanden (✅):
```
[AUTH] Token verified: admin@example.com
[AUTH MIDDLEWARE] Token verified for user: admin@example.com (userId: 1 )
✅ PostgreSQL ansluten
```

### Fel att Leta Efter (❌):
```
Invalid status: ready
Invalid status transition
Error 400
Error 500
```

---

## 🎯 Success Criteria

### PHASE 2.3 (Restaurang) är klart när:
- [x] Ny order visas korrekt
- [x] Accept button fungerar
- [x] Ready for pickup button fungerar
- [x] Order försvinner från listan
- [x] Customer notes visas tydligt
- [x] Inga backend errors

### PHASE 3.4 (Kurir) är klart när:
- [x] Kurir-vy laddas utan 400 error
- [x] Tillgängliga orders visas
- [x] Accept button fungerar
- [x] Order flyttas till "Mina ordrar"
- [x] Pickup button fungerar
- [x] Deliver button fungerar
- [x] Order försvinner efter delivered
- [x] Customer notes visas tydligt
- [x] Inga backend errors

### PHASE 4 (End-to-End) är klart när:
- [x] Hela flödet fungerar från received → delivered
- [x] Orders försvinner automatiskt vid rätt tidpunkt
- [x] Customer notes följer med genom hela flödet
- [x] Text är läsbar i både light och dark mode
- [x] Inga errors i backend
- [x] Inga errors i frontend console

---

## 📝 Rapportera Resultat

När du är klar med testningen, rapportera:

1. **Vilka test-steg som fungerade ✅**
2. **Vilka test-steg som failade ❌**
3. **Eventuella error-meddelanden**
4. **Screenshots om möjligt**

Då kan jag fixa eventuella återstående problem!

---

**Lycka till med testningen!** 🚀
