# MinProfil Input Fields Diagnostic Report
**Date:** 2025-11-22
**Issue:** Cannot type in input fields after clicking "Redigera" button

---

## Problem Description

User reports:
1. Login as admin ✅
2. Navigate to profile page ✅
3. Click "Redigera mina uppgifter" button ✅
4. **Cannot type in Namn, Email, Telefon, Adress fields** ❌

---

## Code Analysis

### Current Implementation (MinProfil.jsx)

#### State Management
```javascript
const [redigerar, setRedigerar] = useState(false);
const [profil, setProfil] = useState(null);
```

#### Edit Button Logic (Line 147-160)
```javascript
{!redigerar ? (
  <button onClick={() => setRedigerar(true)}>
    ✏️ Redigera
  </button>
) : (
  // Save and Cancel buttons shown
)}
```
**Status:** ✅ Logic looks correct

#### Input Fields (Lines 197-210, 215-230, 234-249, 253-268)
All inputs have:
```javascript
readOnly={!redigerar}
onChange={(e) => hanteraInputChange("field", e.target.value)}
backgroundColor: redigerar ? "white" : "#f8f9fa"
```

**Logic:**
- When `redigerar = false` → `readOnly = true` (cannot type)
- When `redigerar = true` → `readOnly = false` (can type)

**Status:** ✅ Logic looks correct

#### onChange Handler (Lines 105-110)
```javascript
const hanteraInputChange = (fält, värde) => {
  setProfil(prev => ({
    ...prev,
    [fält]: värde
  }));
};
```
**Status:** ✅ Correct React pattern

---

## Potential Issues Identified

### Issue 1: Email Field Should NOT Be Editable
**Severity:** HIGH - Security & Data Integrity Issue

**Problem:**
- Email is the primary key and authentication identifier
- Backend `updateProfile` endpoint does NOT update email (server.js:749)
- Frontend allows email editing but backend silently ignores it
- This creates confusion: user changes email but it doesn't save

**Current Backend (server.js:748-750):**
```javascript
const updateResult = await pool.query(
  "UPDATE users SET namn = $1, telefon = $2, adress = $3 WHERE id = $4 RETURNING ...",
  [namn, telefon, adress || "", userId]
);
```
Email is NOT updated!

**Solution:** Make email field always read-only with visual indicator

---

### Issue 2: Missing Dark Mode Color Handling
**Severity:** LOW - UX Issue

**Problem:**
Input fields don't account for dark mode when editable. White background always shown when editing, regardless of theme.

**Current:**
```javascript
backgroundColor: redigerar ? "white" : "#f8f9fa"
```

**Should be:**
```javascript
backgroundColor: redigerar
  ? (tema === "dark" ? "#333" : "white")
  : (tema === "dark" ? "#2a2a2a" : "#f8f9fa")
```

---

### Issue 3: readOnly Attribute Behavior
**Severity:** MEDIUM - Possible Root Cause

**Problem:**
The `readOnly` HTML attribute works differently than expected in some browsers:
- `readOnly` fields can still be focused
- `readOnly` fields can still have their text selected
- BUT: `readOnly` fields CANNOT have their value changed by user input

**Testing needed:**
1. Check if `redigerar` state is actually changing to `true`
2. Check browser console for any React warnings
3. Verify no CSS is preventing input interaction

**Diagnostic Code to Add:**
```javascript
<button
  onClick={() => {
    console.log("[MinProfil] Setting redigerar to true");
    console.log("[MinProfil] Current profil:", profil);
    setRedigerar(true);
  }}
>
  ✏️ Redigera
</button>

// In input:
readOnly={!redigerar}
onFocus={() => console.log("[MinProfil] Input focused, redigerar:", redigerar)}
onClick={() => console.log("[MinProfil] Input clicked, readOnly:", !redigerar)}
```

---

### Issue 4: Profil State Structure After Our Fix
**Severity:** LOW - Unlikely but possible

**Problem:**
After our localStorage cleanup fix, we validate:
```javascript
if (data && typeof data === 'object' && data.email) {
  setProfil(data);
}
```

But we don't check if `namn`, `telefon`, `adress` exist. For admin user created without these fields, they might be `null` or `undefined`.

**Effect on inputs:**
```javascript
value={profil.namn || ""}  // If profil.namn is null → ""
```

This should work fine with React controlled inputs.

---

## Most Likely Root Cause

**Hypothesis #1: Email Field Confusion**
User tries to edit email (which appears editable) but nothing happens because:
1. Email field shows as editable (white background)
2. User types but onChange fires
3. State updates locally
4. User clicks "Spara"
5. Backend ignores email update
6. Page reloads profile from backend
7. Email reverts to original value

This could make user think "inputs don't work" when really it's just email that shouldn't be editable.

**Hypothesis #2: Browser/React State Bug**
`redigerar` state updates but component doesn't re-render inputs with new `readOnly` value.

Unlikely because:
- Save/Cancel buttons appear (proves re-render happened)
- Background color changes (proves inline style updated)

**Hypothesis #3: CSS Override**
Some global CSS rule is setting `pointer-events: none` or similar on input fields.

Check in browser DevTools:
```css
input[readonly] {
  /* Check if any CSS is preventing interaction */
}
```

---

## Recommended Solution

### Fix 1: Make Email Read-Only Always (REQUIRED)

```javascript
<div style={{ width: "100%", maxWidth: "400px" }}>
  <label htmlFor="email" style={{ display: "block", marginBottom: "0.5rem", textAlign: "left" }}>
    E-postadress
    <span style={{ fontSize: "0.8rem", color: "#666", marginLeft: "0.5rem" }}>
      (kan ej ändras)
    </span>
  </label>
  <input
    id="email"
    type="email"
    value={profil.email || ""}
    readOnly={true}  // Always read-only
    aria-label="Din e-postadress"
    style={{
      width: "100%",
      padding: "0.75rem",
      borderRadius: "4px",
      border: "1px solid #ccc",
      backgroundColor: "#f0f0f0",  // Always disabled appearance
      cursor: "not-allowed"
    }}
  />
</div>
```

### Fix 2: Add Debug Logging (TEMPORARY - for testing)

```javascript
<button
  onClick={() => {
    console.log("[MinProfil] Before: redigerar =", redigerar);
    setRedigerar(true);
    console.log("[MinProfil] After: redigerar should be true");
  }}
  style={{ ... }}
>
  ✏️ Redigera
</button>

// Add to each input:
<input
  id="namn"
  value={profil.namn || ""}
  readOnly={!redigerar}
  onChange={(e) => {
    console.log("[MinProfil] onChange fired:", e.target.value);
    hanteraInputChange("namn", e.target.value);
  }}
  onFocus={() => console.log("[MinProfil] Input focused. readOnly:", !redigerar)}
  ...
/>
```

### Fix 3: Improve Dark Mode Support (OPTIONAL)

```javascript
const darkMode = tema === "dark";

// In input styles:
backgroundColor: (() => {
  if (!redigerar) return darkMode ? "#2a2a2a" : "#f8f9fa";
  return darkMode ? "#333" : "white";
})(),
color: darkMode ? "white" : "black",
```

---

## Testing Steps

### Step 1: Check Browser Console
1. Open DevTools (F12) → Console tab
2. Navigate to profile page
3. Click "Redigera" button
4. Look for logs showing:
   - `[MinProfil] Setting redigerar to true`
   - `[MinProfil] Current profil: {...}`
5. Try typing in Namn field
6. Look for:
   - `[MinProfil] Input focused. readOnly: false`
   - `[MinProfil] onChange fired: <your input>`

### Step 2: Check Element Attributes
1. Open DevTools → Elements tab
2. Find `<input id="namn">` element
3. Check attributes:
   - Should NOT have `readonly` attribute when editing
   - Should have `readonly` when NOT editing
4. Check computed styles:
   - Verify no `pointer-events: none`
   - Verify no `user-select: none`

### Step 3: Check State in React DevTools
1. Install React DevTools browser extension
2. Find MinProfil component
3. Check state values:
   - `redigerar` should be `true` after clicking "Redigera"
   - `profil` should have all fields

---

## Expected Behavior After Fix

1. User clicks "Redigera"
2. Namn, Telefon, Adress fields become editable (white background, no readonly)
3. Email field stays read-only (grey background, "kan ej ändras" label)
4. User can type in Namn, Telefon, Adress
5. User clicks "Spara"
6. Only Namn, Telefon, Adress update in backend
7. Email remains unchanged

---

## Action Plan

1. ✅ Add email field as always read-only
2. ✅ Add debug logging to diagnose state issue
3. ✅ Test in browser with console open
4. ✅ Report findings from console logs
5. ⏳ Apply final fix based on findings

---

**Next Step:** User should check browser console while trying to edit, or we apply the email read-only fix first as it's a confirmed issue.
