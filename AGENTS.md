# AGENT INSTRUCTIONS

This document describes how agents should contribute to the Annos fullstack webapp.

## Scope
- Frontend: React with Vite.
- Backend: Node.js with Express.
- ESLint is enabled. All contributions must pass `npm run lint` in `frontend/`.
- Backend tests must pass using `npm test` in `backend/`.

## Frontend guidelines

### Project Structure
- **Organized folder structure**: Components, pages, services, hooks, and utilities are properly separated
- **Custom hooks**: Use `useAuth`, `useCart`, `useTheme`, `useApi` for reusable logic
- **Service layer**: API calls organized in dedicated service files (`authService`, `orderService`, `menuService`, `paymentService`)
- **Component organization**: 
  - `pages/` - Route components (auth, customer, admin, courier, restaurant)
  - `components/` - Reusable UI components (common, forms, layout)
  - `services/` - API and external service integrations
  - `hooks/` - Custom React hooks for shared logic
  - `utils/` - Helper functions and utilities

### Code Quality
- Follow ESLint hook rules strictly: no React hooks inside loops, conditions or nested callbacks.
- `useRef` may only be used as `useRef({})` or via `React.createRef()` if multiple dynamic refs are required.
- Do not use `useMemo` to create refs.
- Do not create `useRef` or `useState` inside loops such as `map`, `forEach`, `for`, etc.
- Use custom hooks for shared state and logic instead of duplicating code
- Prefer service classes over individual functions for API calls

### UI/UX Requirements
- Code must work on both mobile and desktop (iOS, Android, Chrome, Safari).
- Sticky category nav: Use `position: sticky` with `top: 0` and appropriate `z-index`.
- All buttons and inputs must be keyboard-accessible (a11y).
- Use semantic HTML tags + `aria-label` for accessibility.
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

## Service Architecture

### Frontend Services
- **AuthService**: Handles authentication, profile management, login/logout
- **OrderService**: Manages orders, order status, admin/restaurant/courier order operations
- **MenuService**: Handles menu data, accessories, restaurant information
- **PaymentService**: Manages payments, invoices, payment methods
- **API Client**: Centralized HTTP client with error handling, timeouts, and retry logic

### Service Usage Guidelines
- Always use service classes instead of direct API calls
- Import services from `services/index.js` for consistency
- Use custom hooks (`useAuth`, `useCart`, `useTheme`) for component state management
- Handle errors consistently using the centralized error handling in services
- Use the `useApi` hook for API calls with loading states and error handling

### Backend rules
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

## Instruktioner för Cursor/AI-agenter

Denna fil beskriver regler för kodändringar och samarbete i detta projekt. Cursor och andra AI-agenter ska följa dessa riktlinjer.

---

## 1. Kodstil och kvalitet

- Följ alltid ESLint och Prettier. Kod med lint-fel får inte mergas.
- Strängar ska använda dubbla citattecken (`"`), inte enkla (`'`).
- Behåll befintlig indentering och whitespace.
- Ta bort oanvända variabler och importer.
- Undvik att ändra funktionsnamn, variabler, kommentarer eller logik som redan fungerar.
- Cursor/AI-agent får ENDAST ändra kodrader där ESLint ger fel. Rör inte kod som redan är korrekt.

### Exempel

```js
// Före
const foo = 'bar';
// Efter
const foo = "bar";
```

---

## 2. Backend-regler

- Använd RESTful routing (GET, POST, PUT, DELETE på rätt endpoints).
- All input ska valideras och saneras.
- Inga hemligheter/API-nycklar i kod – använd `.env`-filer.
- JWT eller annan auth-token ska hanteras säkert (helst HTTP-only cookie).

---

## 3. Accessibility & UX

- Alla inputs ska ha `label` och `aria-label`.
- Knappar och formulär ska vara tangentbordsnavigerbara.
- Layouten ska fungera på både mobil och desktop.

---

## 4. Struktur & dokumentation

- Frontend och backend ska vara separerade.
- Dela upp komponenter, API-klienter och hjälpfunktioner i egna filer.
- README ska innehålla instruktioner för installation, drift och deployment.
- Dokumentera större ändringar i README eller i PR-beskrivning.

---

## 5. Testning & CI/CD

- Automatisk lint och test via GitHub Actions (eller motsvarande) innan merge.
- Skriv tester för viktiga backend-routes och frontend-flöden.

---

## 6. Versionshantering

- Branch-namn ska vara beskrivande, t.ex. `fix/login-bug`, `feature/admin-panel`.
- Pull requests ska beskriva vad som ändras och varför.
- Kod ska alltid granskas innan merge.

---

## 7. Cursor/AI-agent: Viktiga instruktioner

- Cursor ska ENDAST göra ändringar som krävs för att koden följer ESLint, Prettier och projektets policy.
- Cursor får INTE ändra kod, struktur eller logik som redan är korrekt och fungerar.
- Hänvisa alltid till denna fil vid AI-baserade kodändringar.
- Om du är osäker: be om förtydligande innan du ändrar.

---

## 8. Kontakt & support

- Vid frågor om regler eller kodstil, kontakta repo-ägaren via GitHub Issues eller diskussioner.
