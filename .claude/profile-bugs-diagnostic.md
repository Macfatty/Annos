# Profile and Admin Access Bugs - Diagnostic Report
**Date:** 2025-11-22
**Status:** 🔴 CRITICAL BUGS IDENTIFIED
**Impact:** Admin access blocked, profile editing broken, order placement failing

---

## Executive Summary

Discovered **critical data structure mismatch** between backend API responses and frontend expectations. All three reported issues stem from the same root cause: `fetchProfile()` and `updateProfile()` return the full backend response object instead of just the user data.

**Root Cause:** Backend returns `{ success: true, data: { ...user } }` but frontend code expects just `{ ...user }`

**Impact:**
- ❌ Admin users cannot access admin panel (isAdmin always false)
- ❌ Profile editing appears to work but data not accessible correctly
- ❌ Order placement fails even after filling all fields
- ❌ "Uppdatera från profil" button doesn't populate checkout fields

---

## Problem 1: Admin Cannot Access Admin Panel

### Symptom
User logs in as admin but admin button not visible in navigation, cannot navigate to `/admin`.

### Root Cause Analysis

**Backend Response (authService.js:200-216):**
```javascript
static async getUserById(userId) {
  const result = await pool.query(
    'SELECT id, email, namn, telefon, adress, role, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]; // Returns: { id, email, namn, telefon, adress, role, ... }
}
```

**Backend Controller (authController.js:138-150):**
```javascript
static async getProfile(req, res, next) {
  const userId = req.user.id;
  const user = await AuthService.getUserById(userId);

  res.json({
    success: true,
    data: user  // ✅ Returns: { success: true, data: { id, email, role, ... } }
  });
}
```

**Frontend Service (authService.js:35-54):**
```javascript
static async fetchProfile() {
  const res = await apiRequest("/api/profile");
  if (!res.ok) {
    throw new Error(`Profile ${res.status}`);
  }
  return res.json(); // ❌ Returns entire response: { success: true, data: { ... } }
}
```

**Frontend Hook (useAuth.js:54-57):**
```javascript
const data = await fetchProfile(); // data = { success: true, data: { ...user } }
setInloggad(true);
setRole(data.role || "");  // ❌ BUG! data.role is undefined
setProfil(data);           // ❌ BUG! Stores wrong structure
```

**App.jsx Navigation (App.jsx:189-193):**
```javascript
{isAdmin && (  // ❌ isAdmin is false because role is undefined
  <button onClick={() => navigate("/admin")}>
    🛠 Adminpanel
  </button>
)}
```

**Why Admin Button Not Visible:**
1. Backend returns: `{ success: true, data: { id: 1, email: "admin@example.com", role: "admin", ... } }`
2. `fetchProfile()` returns this entire object
3. `useAuth` sets `role = data.role` which is `undefined` (should be `data.data.role`)
4. `isAdmin = role === "admin"` evaluates to `false`
5. Admin button never renders

### Expected vs Actual

**Expected:**
```javascript
const data = await fetchProfile();
// data should be: { id: 1, email: "admin@...", role: "admin", namn: "...", ... }
setRole(data.role); // "admin"
```

**Actual:**
```javascript
const data = await fetchProfile();
// data is: { success: true, data: { id: 1, email: "...", role: "admin", ... } }
setRole(data.role); // undefined ❌
```

---

## Problem 2: Profile Editing Not Working

### Symptom
User tries to edit profile in MinProfil page. Can click edit, modify fields, and save, but profile changes don't persist or show correctly.

### Root Cause Analysis

**MinProfil.jsx Load Profile (MinProfil.jsx:31-46):**
```javascript
useEffect(() => {
  const load = async () => {
    const data = await fetchProfile();
    // data = { success: true, data: { id, email, namn, telefon, adress, role, ... } }

    if (data) {
      setProfil(data); // ❌ BUG! Stores entire response, not just user data
      localStorage.setItem("kundinfo", JSON.stringify(data)); // ❌ Wrong structure
    }
  };
  load();
}, [navigate]);
```

**MinProfil.jsx Save Profile (MinProfil.jsx:81-102):**
```javascript
const sparaProfil = async () => {
  try {
    const updatedProfile = await updateProfile({
      namn: profil.namn,
      telefon: profil.telefon,
      adress: profil.adress || ""
    });
    // updatedProfile = { success: true, message: "...", data: { ...user } }

    setProfil(updatedProfile);  // ❌ BUG! Wrong structure
    localStorage.setItem("kundinfo", JSON.stringify(updatedProfile)); // ❌ Wrong structure

    setRedigerar(false);
    alert("✅ Profil sparad i databasen!");
  } catch (err) {
    console.error("Fel vid sparande av profil:", err);
    alert("❌ Kunde inte spara profil");
  }
};
```

**updateProfile Service (authService.js:59-77):**
```javascript
static async updateProfile(profilData) {
  const res = await apiRequest("/api/profile", {
    method: "PUT",
    body: JSON.stringify(profilData),
  });

  if (!res.ok) {
    throw new Error(`Profile update ${res.status}`);
  }

  return res.json(); // ❌ Returns: { success: true, message: "...", data: { ...user } }
}
```

**Display Profile Fields (MinProfil.jsx:164-238):**
```javascript
<input
  id="namn"
  value={profil.namn || ""}  // ❌ profil.namn is undefined (should be profil.data.namn)
  readOnly={!redigerar}
  onChange={(e) => hanteraInputChange("namn", e.target.value)}
/>
```

**Why Profile Editing Broken:**
1. `fetchProfile()` returns `{ success: true, data: { ...user } }`
2. `setProfil(data)` stores this entire structure
3. Form tries to access `profil.namn` but it's actually at `profil.data.namn`
4. Fields appear empty even though data exists
5. Saving creates even more nested structure
6. After save, `profil` becomes `{ success: true, message: "...", data: { ...user } }`
7. Form still can't read `profil.namn` (it's at `profil.data.namn`)

### What User Sees vs Reality

**User sees:** Empty form fields
**Reality:** Data exists but at wrong path
- Expected: `profil.namn`
- Actual: `profil.data.namn` or `profil.data.data.namn` (after multiple saves)

---

## Problem 3: Order Placement Failing After Filling Fields

### Symptom
User fills all required fields in checkout (namn, email, telefon, adress) and clicks "Betala", but gets error:
```
❌ Fyll i eller uppdatera din information för att kunna lägga en beställning.

Saknade fält: Namn, E-post, Telefon, Adress

Använd "🔄 Uppdatera från profil"-knappen för att fylla i automatiskt.
```

### Root Cause Analysis

**Checkout.jsx Load Profile (Checkout.jsx:20-58):**
```javascript
useEffect(() => {
  const loadKundinfo = async () => {
    try {
      const profile = await fetchProfile();
      // profile = { success: true, data: { namn, email, telefon, adress, role, ... } }

      if (profile) {
        setKundinfo({
          namn: profile.namn || "",      // ❌ BUG! profile.namn is undefined
          email: profile.email || "",    // ❌ BUG! profile.email is undefined
          telefon: profile.telefon || "",// ❌ BUG! profile.telefon is undefined
          adress: profile.adress || "",  // ❌ BUG! profile.adress is undefined
          ovrigt: "",
        });
        return;
      }
    } catch (err) {
      console.log("Kunde inte hämta profil, försöker med localStorage", err);
    }
    // ... localStorage fallback
  };
  loadKundinfo();
}, []);
```

**"Uppdatera från profil" Button (Checkout.jsx:248-291):**
```javascript
onClick={async () => {
  try {
    const profile = await fetchProfile();
    // profile = { success: true, data: { namn, email, ... } }

    if (profile) {
      setKundinfo({
        namn: profile.namn || "",      // ❌ BUG! undefined
        email: profile.email || "",    // ❌ BUG! undefined
        telefon: profile.telefon || "",// ❌ BUG! undefined
        adress: profile.adress || "",  // ❌ BUG! undefined
        ovrigt: kundinfo.ovrigt,
      });
      alert("✅ Profiluppgifter uppdaterade!");
    }
  } catch (err) {
    alert("❌ Kunde inte uppdatera från profil");
  }
}}
```

**Validation Check (Checkout.jsx:76-94):**
```javascript
const saknadeFalt = [];
if (!kundinfo.namn?.trim()) {      // ❌ "" (empty string) → fails
  saknadeFalt.push("Namn");
}
if (!kundinfo.email?.trim()) {     // ❌ "" (empty string) → fails
  saknadeFalt.push("E-post");
}
if (!kundinfo.telefon?.trim()) {   // ❌ "" (empty string) → fails
  saknadeFalt.push("Telefon");
}
if (!kundinfo.adress?.trim()) {    // ❌ "" (empty string) → fails
  saknadeFalt.push("Adress");
}

if (saknadeFalt.length > 0) {
  alert(`❌ Fyll i eller uppdatera din information...`);
  return;
}
```

**Why Order Placement Fails:**
1. `fetchProfile()` returns `{ success: true, data: { namn: "John", email: "...", ... } }`
2. Checkout tries to read `profile.namn` but it's actually at `profile.data.namn`
3. `setKundinfo` sets all fields to empty strings: `{ namn: "", email: "", telefon: "", adress: "" }`
4. User manually types in all fields
5. User clicks "Betala"
6. **WAIT** - if user manually types, why does it still fail?

**Additional Issue - User Input:**
Actually, if user manually types into form fields, it should work because:
```javascript
onChange={(e) => setKundinfo({ ...kundinfo, namn: e.target.value })}
```
This should update state correctly.

**Possible explanations:**
1. User clicks "🔄 Uppdatera från profil" button which overwrites manual input with empty strings
2. Form might be re-mounting and resetting state
3. localStorage contains wrong structure and overwrites on page reload

**localStorage Contamination:**
```javascript
// MinProfil.jsx:94
localStorage.setItem("kundinfo", JSON.stringify(updatedProfile));
// Stores: { success: true, message: "...", data: { ...user } }

// Checkout.jsx:40-54 (fallback)
const sparad = localStorage.getItem("kundinfo");
const info = JSON.parse(sparad);
setKundinfo({
  namn: info.namn || "",  // ❌ undefined (it's at info.data.namn)
  // ...
});
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (PostgreSQL)                                        │
├─────────────────────────────────────────────────────────────┤
│ users table:                                                │
│ { id: 1, email: "admin@...", role: "admin", namn: "...", } │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND API (/api/profile)                                  │
├─────────────────────────────────────────────────────────────┤
│ authController.getProfile():                                │
│ res.json({                                                  │
│   success: true,                                            │
│   data: { id: 1, email: "...", role: "admin", namn: "..." }│
│ })                                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND authService.fetchProfile()                         │
├─────────────────────────────────────────────────────────────┤
│ return res.json();  ❌ WRONG!                               │
│ Returns: { success: true, data: { ...user } }               │
│                                                             │
│ SHOULD BE: return (await res.json()).data;  ✅ CORRECT     │
│ Would return: { id: 1, email: "...", role: "admin", ... }  │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴──────────────┬──────────────┐
          ▼                          ▼              ▼
    ┌─────────────┐          ┌──────────────┐  ┌──────────┐
    │ useAuth     │          │ MinProfil    │  │ Checkout │
    ├─────────────┤          ├──────────────┤  ├──────────┤
    │ data.role   │          │ profil.namn  │  │ profile. │
    │ = undefined │          │ = undefined  │  │ namn = ? │
    │ ❌ BROKEN   │          │ ❌ BROKEN    │  │ ❌ BROKEN│
    └─────────────┘          └──────────────┘  └──────────┘
```

---

## Solution

### Fix 1: Unwrap Backend Response in fetchProfile()

**File:** `frontend/src/services/auth/authService.js`

**Current (Line 35-54):**
```javascript
static async fetchProfile() {
  try {
    const res = await apiRequest("/api/profile");
    if (!res.ok) {
      const err = new Error(`Profile ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json(); // ❌ Returns entire response
  } catch (error) {
    // ...
    throw error;
  }
}
```

**Fixed:**
```javascript
static async fetchProfile() {
  try {
    const res = await apiRequest("/api/profile");
    if (!res.ok) {
      const err = new Error(`Profile ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const response = await res.json();
    return response.data; // ✅ Return only user object
  } catch (error) {
    // ...
    throw error;
  }
}
```

### Fix 2: Unwrap Backend Response in updateProfile()

**File:** `frontend/src/services/auth/authService.js`

**Current (Line 59-77):**
```javascript
static async updateProfile(profilData) {
  try {
    const res = await apiRequest("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profilData),
    });

    if (!res.ok) {
      const err = new Error(`Profile update ${res.status}`);
      err.status = res.status;
      throw err;
    }

    return res.json(); // ❌ Returns entire response
  } catch (error) {
    console.error("Fel vid profiluppdatering:", error);
    throw error;
  }
}
```

**Fixed:**
```javascript
static async updateProfile(profilData) {
  try {
    const res = await apiRequest("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profilData),
    });

    if (!res.ok) {
      const err = new Error(`Profile update ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const response = await res.json();
    return response.data; // ✅ Return only user object
  } catch (error) {
    console.error("Fel vid profiluppdatering:", error);
    throw error;
  }
}
```

### Fix 3: Clean Up Contaminated localStorage

After fixing authService.js, users who already have contaminated localStorage will still have issues.

**Option A: Clear on next load (automatic cleanup)**
Add to useAuth.js loadProfile():
```javascript
// Clean up contaminated localStorage
const stored = localStorage.getItem("kundinfo");
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    // If it has "success" or "data" fields, it's contaminated
    if (parsed.success !== undefined || (parsed.data && typeof parsed.data === 'object')) {
      console.log("Cleaning contaminated localStorage...");
      localStorage.removeItem("kundinfo");
    }
  } catch (e) {
    // Invalid JSON, remove it
    localStorage.removeItem("kundinfo");
  }
}
```

**Option B: User clears browser data (manual)**
Ask users to clear localStorage or log out and log in again.

---

## Testing Plan

After applying fixes, test:

### Test 1: Admin Access
1. Log in as admin user
2. ✅ Verify admin button appears in navigation
3. ✅ Click admin button, should navigate to `/admin`
4. ✅ Admin panel should load without redirecting away
5. ✅ Should see orders and admin controls

### Test 2: Profile Editing
1. Log in as any user
2. Navigate to `/profil`
3. ✅ Verify all fields (namn, email, telefon, adress) display current values
4. Click "✏️ Redigera"
5. ✅ Fields should become editable
6. Modify namn to "Test User"
7. Click "💾 Spara"
8. ✅ Should see "✅ Profil sparad i databasen!"
9. Refresh page
10. ✅ Should see updated namn "Test User"

### Test 3: Order Placement
1. Log in as customer
2. Add items to cart
3. Navigate to `/checkout`
4. ✅ Verify fields auto-populate from profile (namn, email, telefon, adress)
5. If fields empty, click "🔄 Uppdatera från profil"
6. ✅ Fields should populate with profile data
7. Click "💚 Betala med Swish"
8. ✅ Should navigate to `/tack` (order successful)
9. Should NOT see "Saknade fält" error

### Test 4: New User Registration
1. Register new user
2. ✅ Should be able to set profile info
3. Navigate to checkout
4. ✅ Profile info should be available

---

## Files Affected

### Files to Modify:
1. `frontend/src/services/auth/authService.js` (PRIMARY FIX)
   - Fix `fetchProfile()` to return `response.data`
   - Fix `updateProfile()` to return `response.data`

### Files That Will Auto-Fix:
Once authService.js is fixed, these will work correctly without changes:
- `frontend/src/hooks/useAuth.js`
- `frontend/src/pages/customer/MinProfil.jsx`
- `frontend/src/pages/customer/Checkout.jsx`
- `frontend/src/pages/admin/AdminPanel.jsx`
- `frontend/src/App.jsx`

### Optional Cleanup:
- Add localStorage cleanup to `useAuth.js` for contaminated data

---

## Risk Assessment

### Fix Complexity: ⚠️ LOW RISK
- Only 2 functions to modify
- Changes are simple (add `.data` to return statement)
- No breaking changes to API
- Follows principle: "unwrap response at service layer"

### Testing Required: ✅ MEDIUM
- Test all 3 user flows
- Verify no regressions
- Check localStorage cleanup works

### Deployment: ✅ SAFE
- Frontend-only changes
- No backend modifications needed
- No database changes
- Users may need to log out/in once to clear localStorage

---

## Conclusion

**Root Cause:** Data structure mismatch - backend wraps user data in `{ success, data }`, but frontend service layer doesn't unwrap it.

**Solution:** Unwrap response at service layer in `fetchProfile()` and `updateProfile()`.

**Impact:** Fixes all 3 reported issues with minimal code changes.

**Principle Applied:** "Transform data at boundaries" - service layer should return clean domain objects, not raw API responses.

This aligns with our working principle: **"Robust Over Quick"** - we found the root cause instead of patching symptoms.

---

**Next Step:** Apply fixes to `authService.js` and test thoroughly.
