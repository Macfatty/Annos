# 🧪 Admin Test Flow - Komplett testguide

**Datum:** ___________  
**Testare:** ___________  
**Version:** ___________  

---

## 📋 Förberedelser

### Kontrollera att systemet körs:
- [ ] Backend: `http://localhost:3001` (API svarar)
- [ ] Frontend: `http://localhost:5173` (sida laddas)
- [ ] Databas: PostgreSQL `annos_dev` är tillgänglig

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🔐 Steg 1: Admin-inloggning

### Test:
1. Gå till: `http://localhost:5173/login`
2. Ange:
   - **Email:** `admin@example.com`
   - **Lösenord:** `admin123`
3. Klicka "Logga in"

### Förväntat resultat:
- [ ] Inloggning lyckas
- [ ] Du ser "Logga ut"-knappen
- [ ] Ingen 401 Unauthorized-fel
- [ ] Du omdirigeras till startsidan

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🏠 Steg 2: Admin-panel åtkomst

### Test:
1. Gå till: `http://localhost:5173/admin`
2. Kontrollera att du kommer åt admin-panelen

### Förväntat resultat:
- [ ] Admin-panelen laddas utan fel
- [ ] Du ser admin-funktioner
- [ ] Inga åtkomstfel

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🍕 Steg 3: Välj restaurang

### Test:
1. Gå till: `http://localhost:5173/valj-restaurang`
2. Välj en restaurang (t.ex. Campino eller Sun Sushi)
3. Kontrollera att restaurangmenyn laddas

### Förväntat resultat:
- [ ] Lista över restauranger visas
- [ ] Du kan välja en restaurang
- [ ] Restaurangmenyn laddas korrekt
- [ ] Inga felmeddelanden

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🛒 Steg 4: Lägg till mat i kundvagn

### Test:
1. Välj 2-3 rätter från menyn
2. Lägg till tillbehör för varje rätt
3. Anpassa kvantiteter
4. Gå till kundvagn: `http://localhost:5173/kundvagn`

### Förväntat resultat:
- [ ] Rätter läggs till i kundvagnen
- [ ] Tillbehör registreras korrekt
- [ ] Priser beräknas rätt
- [ ] Kundvagnen visar alla valda varor

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 💳 Steg 5: Slutför beställning

### Test:
1. Gå till checkout: `http://localhost:5173/checkout`
2. Fyll i kunduppgifter:
   - Namn: `Test Admin`
   - E-post: `admin@example.com`
   - Telefon: `0701234567`
   - Adress: `Testgatan 1, 12345 Teststad`
   - Övrigt: `Testbeställning från admin`
3. Klicka "💚 Betala med Swish"

### Förväntat resultat:
- [ ] Alla fält valideras korrekt
- [ ] Betalningen (mock) genomförs
- [ ] Du omdirigeras till tack-sidan
- [ ] Beställningen sparas i databasen
- [ ] Ingen 500-fel vid orderläggning

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 📊 Steg 6: Kontrollera beställning i admin-panel

### Test:
1. Gå till: `http://localhost:5173/admin`
2. Sök efter din nyligen lagda beställning
3. Kontrollera att all information visas korrekt

### Förväntat resultat:
- [ ] Beställningen visas i admin-panelen
- [ ] Alla orderdetaljer är korrekta
- [ ] Kundinformation visas
- [ ] Orderstatus är "received"

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🏪 Steg 7: Testa restaurangvy

### Test:
1. Gå till: `http://localhost:5173/restaurang/campino/incoming`
2. Kontrollera att din beställning visas
3. Ändra orderstatus: `received` → `accepted`

### Förväntat resultat:
- [ ] Beställningen visas i restaurangvyn
- [ ] Du kan ändra orderstatus
- [ ] Status uppdateras korrekt
- [ ] Inga åtkomstfel

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🚚 Steg 8: Testa kurirvy

### Test:
1. Gå till: `http://localhost:5173/kurir`
2. Kontrollera att beställningen visas när den är redo för leverans
3. Ändra status: `accepted` → `in_progress` → `out_for_delivery`

### Förväntat resultat:
- [ ] Beställningen visas i kurirvyn
- [ ] Du kan acceptera leverans
- [ ] Status uppdateras genom flödet
- [ ] Kundinformation visas (namn, adress, telefon)

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## ✅ Steg 9: Slutför leverans

### Test:
1. I kurirvyn, markera beställningen som levererad
2. Ändra status: `out_for_delivery` → `delivered`
3. Kontrollera att beställningen markeras som slutförd

### Förväntat resultat:
- [ ] Beställningen markeras som levererad
- [ ] Status uppdateras till "delivered"
- [ ] Beställningen försvinner från aktiva listor
- [ ] Leveranstid registreras

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🔄 Steg 10: Testa statusflöde

### Test:
1. Lägg en ny testbeställning
2. Gå igenom hela statusflödet:
   - `received` → `accepted` → `in_progress` → `out_for_delivery` → `delivered`
3. Kontrollera att status synkroniseras mellan alla vyer

### Förväntat resultat:
- [ ] Status ändras korrekt i alla vyer
- [ ] Synkronisering fungerar mellan admin/restaurang/kurir
- [ ] Inga inkonsistenser i status
- [ ] Alla övergångar är tillåtna

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🚪 Steg 11: Testa rollbaserad åtkomst

### Test:
1. Logga ut som admin
2. Registrera en ny kund eller logga in som befintlig kund
3. Försök komma åt admin/restaurang/kurir-vyer

### Förväntat resultat:
- [ ] Logout fungerar korrekt
- [ ] Kundregistrering/inloggning fungerar
- [ ] Admin/restaurang/kurir-vyer är inte tillgängliga för kunder
- [ ] Åtkomstkontroll fungerar korrekt

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🛡️ Steg 12: Testa felhantering

### Test:
1. Försök logga in med fel lösenord
2. Lägg en beställning utan att fylla i alla obligatoriska fält
3. Testa med ogiltiga data

### Förväntat resultat:
- [ ] Fel lösenord ger korrekt felmeddelande
- [ ] Validering fungerar för obligatoriska fält
- [ ] Ogiltiga data hanteras korrekt
- [ ] Felmeddelanden är användarvänliga

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 📱 Steg 13: Testa responsiv design

### Test:
1. Testa på olika skärmstorlekar (desktop, tablet, mobil)
2. Kontrollera att alla vyer fungerar på mobil
3. Testa touch-interaktioner

### Förväntat resultat:
- [ ] Alla vyer fungerar på mobil
- [ ] Knappar och länkar är touch-vänliga
- [ ] Text är läsbar på små skärmar
- [ ] Layout anpassas korrekt

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 🎯 Steg 14: Testa betalningsflöde

### Test:
1. Lägg en beställning med Swish-betalning
2. Kontrollera att betalningsstatus registreras
3. Se betalningsinformation i admin-panelen

### Förväntat resultat:
- [ ] Swish-betalning (mock) fungerar
- [ ] Betalningsstatus sparas korrekt
- [ ] Betalningsinformation visas i admin
- [ ] Inga betalningsfel

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 📊 Steg 15: Testa databasintegration

### Test:
1. Kontrollera att alla beställningar sparas i databasen
2. Verifiera att användardata uppdateras korrekt
3. Kontrollera att orderstatus synkroniseras

### Förväntat resultat:
- [ ] Beställningar sparas i PostgreSQL
- [ ] Användardata uppdateras korrekt
- [ ] Orderstatus synkroniseras mellan vyer
- [ ] Inga databasfel

**Kommentar:**
```
_________________________________________________
_________________________________________________
```

---

## 📝 Sammanfattning

### Totalt antal tester: 15
### Lyckade tester: ___ / 15
### Misslyckade tester: ___ / 15

### Kritiska problem:
```
_________________________________________________
_________________________________________________
_________________________________________________
```

### Mindre problem:
```
_________________________________________________
_________________________________________________
_________________________________________________
```

### Förbättringsförslag:
```
_________________________________________________
_________________________________________________
_________________________________________________
```

### Slutsats:
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Test slutfört:** ___________  
**Nästa test:** ___________  
**Ansvarig:** ___________
