# AGENT INSTRUCTIONS

This document describes how agents should contribute to the Annos fullstack webapp.

## Scope
- Frontend: React with Vite.
- Backend: Node.js with Express.
- ESLint is enabled. All contributions must pass `npm run lint` in `frontend/`.
- Backend tests must pass using `npm test` in `backend/`.

## Frontend guidelines
- Follow ESLint hook rules strictly: no React hooks inside loops, conditions or nested callbacks.
- `useRef` may only be used as `useRef({})` or via `React.createRef()` if multiple dynamic refs are required.
- Do not use `useMemo` to create refs.
- Do not create `useRef` or `useState` inside loops such as `map`, `forEach`, `for`, etc.
- Code must work on both mobile and desktop (iOS, Android, Chrome, Safari).
- Sticky category nav: Use `position: sticky` with `top: 0` and appropriate `z-index`.
- All buttons and inputs must be keyboard-accessible (a11y).
- Use semantic HTML tags + `aria-label` for accessibility.
- Separate components logically (routes, views, shared UI, API handling).
- Avoid duplicate accessories in submenus (e.g., meat/sauce/drinks must not appear twice).
- Submenu categories should stay sticky for better UX on mobile.
- Shopping cart should not take over full screen on mobile — layout must scale smartly.
- Checkout should prefill user data: name, email, phone, address, other.

## Access control & logic
- Anonymous user access:
  - `/`, `/valj-restaurang`, `/login`, `/register`
  - Info pages (ToS, support) — future
  - Popup shown if trying to order: "🔒 Du måste logga in..."
- Logged-in customer:
  - Access to `/profil`, `/kundvagn`, `/checkout`, `/tack`
  - “Logga ut” button always visible
  - “Logga in” / “Bli medlem” hidden
  - Checkout redirects directly to thank-you page
- Restaurant view:
  - Sees incoming orders, can mark as "klar"
- Courier view:
  - Sees new orders, restaurant name, customer info
  - Can mark orders as "levererad"
  - Will show offline/integrated maps in future

## Backend rules
- Express routes must use correct HTTP methods (GET, POST, PUT, DELETE).
- JWT-based auth (bearer token) for all profile and order endpoints.
- Use `.env` for secrets. No hardcoded credentials.
- Validate and sanitize all input (email, password, free text).
- Log internal errors clearly, but don't expose them to users.
- DB should support future migration to relational DB like MariaDB.
- Only logged-in users may place orders — must verify server-side.

## Security (frontend + backend)
- Auth token is stored in `localStorage` for now, planned to move to HTTP-only cookie.
- Read-only inputs unless editing is allowed.
- XSS/CSRF protection required in beta.
- Rate limiting & brute force protection needed for production login.
- All input fields must have clear `label` + `aria-label`.

## Infrastructure & scaling
- Backend will be dockerized if needed.
- Reverse proxy via Nginx for production.
- Frontend Vite build optimized for performance.
- Hosting via AWS (S3, EC2, RDS) or Vercel/Render.
- CI/CD (e.g. GitHub Actions) to be added.

---

## 🔐 Content-Security-Policy (CSP) – regler och lösningar

För att undvika att inline-skript eller externa resurser blockeras av webbläsarens CSP-regler (t.ex. `script-src-elem`, `connect-src`):

### ✅ Rekommenderade åtgärder

1. **Undvik inline-skript helt**
   - Flytta all JS till `.js`-filer
   - Undvik `onclick`, `onload` direkt i HTML — använd `addEventListener`

2. **Sätt CSP headers i backend**
   Lägg till detta i `backend/server.js` före dina routes:

   ```js
   app.use((req, res, next) => {
     res.setHeader("Content-Security-Policy",
       "default-src 'self'; " +
       "script-src 'self' https://apis.google.com https://js.stripe.com; " +
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
       "font-src 'self' https://fonts.gstatic.com; " +
       "img-src 'self' data: blob:; " +
       "connect-src 'self' https://your-api.com https://*.stripe.com; " +
       "frame-src https://js.stripe.com;"
     );
     next();
   });
