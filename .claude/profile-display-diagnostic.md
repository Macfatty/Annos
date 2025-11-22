# Profile Display Issue Diagnostic
**Date:** 2025-11-22
**Issue:** Profile shows nothing after login

---

## Problem Analysis

### Issue Reports from Testing:
1. ✅ Admin can login
2. ✅ Admin button visible
3. ✅ Can access /admin
4. ❌ **Profile shows nothing** (all fields empty)
5. ❌ Cannot edit profile (fields are empty)
6. ❌ Checkout only fills email (not namn, telefon, adress)
7. ❌ "Uppdatera från profil" doesn't work

### Root Cause Hypothesis:

**Multiple potential issues:**

1. **Contaminated localStorage** (Most Likely)
   - Old localStorage has structure: `{ success: true, data: {...} }`
   - MinProfil reads this and displays `profil.namn` which is undefined
   - Need to clear localStorage or migrate old structure

2. **Missing error handling in MinProfil**
   - `fetchProfile()` has no try-catch in MinProfil.jsx
   - If error occurs, state stays null
   - No user feedback

3. **Backend returns different structure than expected**
   - Check if AuthController actually returns `{ success: true, data: {...} }`
   - Verify authService.js unwrap is working

---

## Evidence from Code

### MinProfil.jsx (Lines 31-47):
```javascript
useEffect(() => {
  const load = async () => {
    const data = await fetchProfile();  // ❌ No try-catch
    if (data) {
      setProfil(data);
      localStorage.setItem("kundinfo", JSON.stringify(data));
    } else {
      const fallback = localStorage.getItem("kundinfo");
      if (fallback) {
        setProfil(JSON.parse(fallback));  // ⚠️ May load old contaminated data
      } else {
        navigate("/login");
      }
    }
  };
  load();
}, [navigate]);
```

**Issues:**
- No error handling (if fetchProfile throws, nothing happens)
- Fallback to localStorage may load contaminated data from before fix
- No console.log to debug what data looks like

### authService.js (Fixed):
```javascript
static async fetchProfile() {
  const res = await apiRequest("/api/profile");
  if (!res.ok) throw new Error(`Profile ${res.status}`);
  const response = await res.json();

  // Unwrap backend response
  if (response.success && response.data) {
    return response.data;  // ✅ Should return clean user object
  }

  // Fallback for legacy format
  return response;
}
```

**This should work correctly.**

### Checkout.jsx (Lines 20-58):
```javascript
useEffect(() => {
  const loadKundinfo = async () => {
    try {
      const profile = await fetchProfile();
      if (profile) {
        setKundinfo({
          namn: profile.namn || "",
          email: profile.email || "",
          telefon: profile.telefon || "",
          adress: profile.adress || "",
          ovrigt: "",
        });
        return;
      }
    } catch (err) {
      console.log("Kunde inte hämta profil, försöker med localStorage", err);
    }

    // Fallback till localStorage
    const sparad = localStorage.getItem("kundinfo");
    if (sparad) {
      try {
        const info = JSON.parse(sparad);
        setKundinfo({
          namn: info.namn || "",
          email: info.email || "",
          telefon: info.telefon || "",
          adress: info.adress || "",
          ovrigt: info.ovrigt || "",
        });
      } catch (err) {
        console.error("Fel vid parsing av kundinfo:", err);
      }
    }
  };

  loadKundinfo();
}, []);
```

**This has try-catch, but if localStorage is contaminated:**
- `info.namn` is undefined (it's at `info.data.namn`)
- Only `info.email` works if it exists at top level

---

## Why Email Works But Not Other Fields

**Hypothesis:** Old localStorage structure might be:
```json
{
  "email": "admin@example.com",  // Top level (works)
  "data": {
    "namn": "Admin",
    "telefon": "123",
    "adress": "Street"
  }
}
```

Or:
```json
{
  "success": true,
  "data": {
    "email": "admin@example.com",
    "namn": "Admin",
    "telefon": "123"
  }
}
```

In second case, `info.email` is undefined but might come from somewhere else.

---

## Solution

### Fix 1: Add Error Handling to MinProfil (Immediate)
```javascript
useEffect(() => {
  const load = async () => {
    try {
      const data = await fetchProfile();
      console.log("[MinProfil] Fetched profile:", data);  // Debug

      if (data && typeof data === 'object') {
        setProfil(data);
        localStorage.setItem("kundinfo", JSON.stringify(data));
      } else {
        console.warn("[MinProfil] Invalid profile data:", data);
        throw new Error("Invalid profile data");
      }
    } catch (err) {
      console.error("[MinProfil] Error loading profile:", err);

      // Try localStorage as fallback
      const fallback = localStorage.getItem("kundinfo");
      if (fallback) {
        try {
          const parsed = JSON.parse(fallback);

          // ✅ Clean up contaminated localStorage
          if (parsed.success || parsed.data) {
            console.log("[MinProfil] Cleaning contaminated localStorage");
            localStorage.removeItem("kundinfo");
            navigate("/login");
            return;
          }

          setProfil(parsed);
        } catch (parseErr) {
          console.error("[MinProfil] Invalid localStorage data:", parseErr);
          localStorage.removeItem("kundinfo");
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    }
  };
  load();
}, [navigate]);
```

### Fix 2: Clean Contaminated localStorage (Immediate)
Add to useAuth.js loadProfile():
```javascript
// Clean contaminated localStorage before fetching
const stored = localStorage.getItem("kundinfo");
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed.success !== undefined || (parsed.data && typeof parsed.data === 'object')) {
      console.log("[useAuth] Cleaning contaminated localStorage");
      localStorage.removeItem("kundinfo");
    }
  } catch (e) {
    localStorage.removeItem("kundinfo");
  }
}
```

### Fix 3: Verify AuthService Unwrap Works
Add debug logging:
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

    console.log("[authService] Raw response:", response);  // Debug

    // Unwrap backend response
    if (response.success && response.data) {
      console.log("[authService] Unwrapped data:", response.data);  // Debug
      return response.data;
    }

    console.log("[authService] Legacy format, returning as-is:", response);
    return response;
  } catch (error) {
    console.error("[authService] fetchProfile error:", error);
    if (error.status === 401 || error.status === 0) {
      throw error;
    }
    throw error;
  }
}
```

---

## Testing Plan

### Step 1: Clear Browser Data
**User should do this first:**
```javascript
// In browser console (F12)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then login again and test.

### Step 2: If Still Broken
Add debug logging to see what data looks like:
1. Open console (F12)
2. Look for logs:
   - `[authService] Raw response:`
   - `[authService] Unwrapped data:`
   - `[MinProfil] Fetched profile:`

This will show us exactly what data structure is being passed around.

### Step 3: Apply Fixes
Based on what we see in logs, apply appropriate fixes.

---

## Expected Behavior After Fix

1. User logs in
2. fetchProfile() returns: `{ id: 1, email: "...", namn: "...", role: "admin", ... }`
3. MinProfil displays: namn, email, telefon, adress in fields
4. Checkout auto-fills: namn, email, telefon, adress
5. "Uppdatera från profil" populates all fields

---

## Next Steps

1. Ask user to clear localStorage and test again
2. If still broken, add debug logging
3. Fix based on what logs show
4. Test thoroughly

---

**Most Likely Solution:** User needs to clear localStorage to remove contaminated data from before our fix.
