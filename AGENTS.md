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
- Do not create `useRef` or `useState` inside loops such as `for`, `forEach` or `map`.
- Code must work on both mobile and desktop browsers (iOS, Android, Chrome, Safari).
- Use `position: sticky` with `top: 0` and appropriate `zIndex` when needed.
- Ensure all buttons and inputs are keyboard accessible.
- Prefer semantic HTML with `aria-label` for accessibility.
- Components should be reusable when reasonable and separated logically (routing, views, shared elements, API handling).
- Avoid duplicates in submenus; accessories like meat/sauce/drinks must not appear twice.
- Submenu categories should be sticky on mobile for better UX.
- The cart must scale so it does not cover the entire mobile view.
- During checkout, prefill the user’s details (name, email, phone, address, other information).
- Non-logged in users can only access start page, choose restaurant, login and register.
- Logged in customers can access profile pages, restaurant + menu views, cart, checkout and thank you page. Hide login/register links when logged in.
- Restaurant view only shows incoming orders with an option to mark them as done.
- Future courier view will show new orders, restaurant names, customer info and allow marking deliveries as complete.

## Backend guidelines
- Separate API routes clearly and use the correct HTTP methods (GET, POST, PUT, DELETE).
- Authentication is JWT based; protected endpoints (e.g. `/api/profile`, `/api/order`) require a bearer token.
- Use `.env` to store sensitive data – never hardcode secrets.
- Validate and sanitize all client input (emails, passwords, free text).
- Log errors clearly but do not leak internals to the user.
- Structure the code so it can migrate to a relational database in the future.
- Only logged in users can place orders; enforce checks on the server.

## Security notes
- Tokens are currently stored in `localStorage`; plan to move to HTTP-only cookies.
- Use `readOnly` for user input that should not be editable.
- XSS and CSRF protections are planned for the beta version.
- Input fields in profile, register and checkout must have clear labels and `aria-label` attributes.

## Infrastructure
- Backend may later be containerized with Docker and served through Nginx.
- Static hosting should be optimized for performance.
- Continuous integration (e.g. GitHub Actions) is intended for automation.

## Pre-commit checklist
1. Run `npm run lint` inside `frontend/` and ensure there are no warnings or errors.
2. Run `npm test` inside `backend/` and verify all tests pass.
3. Ensure code matches the guidelines above before committing.
