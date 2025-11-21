# Claude Code Lint Workflow

## Overview
This document describes how Claude Code should handle code quality checks before making changes.

## Current Project Setup

### Frontend (React + Vite)
- **Linter:** ESLint (version 9.x with flat config)
- **Config file:** `frontend/eslint.config.js`
- **Command:** `npm run lint` (from frontend directory)
- **Rules enforced:**
  - Semicolons required
  - Double quotes required
  - React hooks rules
  - No unused variables (warnings)
  - Restricted imports (no direct API imports)

### Backend (Node.js + Express)
- **Linter:** None currently configured
- **Tests:** Jest (runs on CI)
- **Command:** `npm test` (from backend directory)

### GitHub Actions CI (.github/workflows/ci.yml)
Runs on every push to main and all PRs:
1. **lint-frontend job:** ESLint check on frontend
2. **test-backend job:** Jest tests on backend with PostgreSQL

## Claude Code Workflow

### Before Making Changes
1. **Read existing code** - Always use Read tool first
2. **Understand context** - Check surrounding code style
3. **Check lint config** - Know what rules apply

### When Editing Frontend Code
1. Read the file first
2. Make changes following ESLint rules:
   - Use semicolons: `const x = 5;`
   - Use double quotes: `const msg = "hello";`
   - Follow React hooks rules
3. After editing, run: `cd frontend && npm run lint`
4. Fix any lint errors before proceeding

### When Editing Backend Code
1. Read the file first
2. Follow existing code style:
   - Use semicolons consistently
   - Use single quotes (common in backend)
   - Proper error handling
3. Consider running tests: `cd backend && npm test`

### After Making Multiple Changes
Run checks before suggesting user commits:
```bash
# Check frontend
cd frontend && npm run lint

# Check backend tests
cd backend && npm test
```

## Commands Reference

### Frontend
```bash
cd frontend
npm run lint              # Run ESLint
npm run lint -- --fix     # Auto-fix lint errors
npm run build             # Build (also catches issues)
```

### Backend
```bash
cd backend
npm test                  # Run Jest tests
npm start                 # Start server (catches runtime issues)
```

### Full CI check locally
```bash
# Simulate what GitHub Actions will run
cd frontend && npm ci && npm run lint && cd ..
cd backend && npm ci && npm test && cd ..
```

## Common ESLint Rules to Follow

### Frontend (frontend/eslint.config.js)
```javascript
// ✅ CORRECT
const message = "Hello";
const items = [1, 2, 3];

if (condition) {
  doSomething();
}

// ❌ WRONG
const message = 'Hello'  // Wrong quotes, missing semicolon
const items = [1,2,3]    // Missing semicolon

if (condition)           // Missing curly braces
  doSomething()          // Missing semicolon
```

## When Lint Fails
1. **Read the error message** - ESLint provides clear guidance
2. **Fix the issue** - Make the correction
3. **Re-run lint** - Verify it passes
4. **Document if needed** - If disabling a rule, explain why

## Proposing Changes to User
Before suggesting a commit:
1. ✅ Frontend lint passed
2. ✅ Backend tests passed (if modified)
3. ✅ Server starts without errors
4. ✅ Manual testing done

## Future Improvements
- [ ] Add ESLint to backend
- [ ] Add Prettier for consistent formatting
- [ ] Add pre-commit hooks (husky)
- [ ] Add lint-staged for faster checks
- [ ] Add TypeScript (optional)
