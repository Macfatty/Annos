# Working Principles & Development Guidelines
**Project:** Annos Food Ordering Platform
**Date:** 2025-11-22
**Purpose:** Ensure long-term code quality and robust, maintainable solutions

---

## Core Philosophy

> **"No Quick-Fixes. Only Robust, Long-Term Solutions."**

This document establishes the working principles for the Annos project. These principles prioritize **code quality**, **maintainability**, and **long-term sustainability** over short-term convenience.

---

## Table of Contents

1. [Guiding Principles](#guiding-principles)
2. [Decision-Making Framework](#decision-making-framework)
3. [Code Quality Standards](#code-quality-standards)
4. [Problem-Solving Approach](#problem-solving-approach)
5. [Architecture Patterns](#architecture-patterns)
6. [Testing Requirements](#testing-requirements)
7. [Documentation Requirements](#documentation-requirements)
8. [Review Checklist](#review-checklist)

---

## Guiding Principles

### 1. **Robust Over Quick**

❌ **Quick-Fix Mentality:**
```javascript
// Just check if it's empty, ship it!
if (!BASE_URL) {
  setError("BASE_URL missing");
  return;
}
```

✅ **Robust Solution:**
```javascript
// Understand WHY empty string is valid
// Remove the incorrect validation
// Use service layer that handles BASE_URL correctly
const data = await fetchMenu(slug);
```

**Rationale:**
- Quick-fixes create technical debt
- Band-aids hide root causes
- Short-term fixes become long-term problems
- Proper solutions prevent future bugs

---

### 2. **Understand Before Acting**

**Bad Process:**
1. See error
2. Google for solution
3. Copy-paste fix
4. Move on

**Good Process:**
1. See error
2. **Investigate root cause**
3. **Understand the system**
4. Design proper solution
5. Implement and document
6. Verify fix addresses root cause

**Example:**
- ❌ Quick: "Add `|| ''` everywhere to avoid empty string errors"
- ✅ Robust: "Understand that empty string is correct for Vite proxy, remove invalid validation"

---

### 3. **Consistency Over Convenience**

If one part of the codebase uses a pattern, **all parts should use that pattern**.

**Example:**
- ✅ All API calls use service layer (AuthService, OrderService, MenuService)
- ❌ Some components use services, others use raw `fetch()`

**Benefits:**
- Predictable codebase
- Easier onboarding
- Fewer bugs
- Easier refactoring

---

### 4. **Explicit Over Implicit**

Code should be **obvious** and **self-documenting**.

❌ **Implicit:**
```javascript
const d = await f(s);
```

✅ **Explicit:**
```javascript
const menuData = await fetchMenu(restaurantSlug);
```

**Guidelines:**
- Descriptive variable names
- Clear function names
- Explicit error handling
- No "magic" values

---

### 5. **Fail Loudly, Not Silently**

❌ **Silent Failure:**
```javascript
try {
  await someOperation();
} catch (err) {
  // Ignore error
}
```

✅ **Loud Failure:**
```javascript
try {
  await someOperation();
} catch (err) {
  console.error("Operation failed:", err);
  setError(err.message);
  throw err; // Or handle appropriately
}
```

**Rationale:**
- Silent failures hide bugs
- Users get confused
- Developers can't debug
- Issues compound over time

---

## Decision-Making Framework

When facing a technical decision, ask these questions in order:

### 1. **Is this the root cause or a symptom?**

If it's a symptom, find the root cause.

**Example:**
- Symptom: "VITE_API_BASE_URL missing" error
- Root cause: Invalid validation check for empty string

### 2. **Will this solution create technical debt?**

If yes, consider alternatives.

**Examples of Technical Debt:**
- Workarounds instead of fixes
- Duplicated code
- Inconsistent patterns
- Commented-out code
- TODO comments without tickets

### 3. **Does this follow existing patterns?**

If no, either:
- Adapt to existing pattern, OR
- Create new pattern and migrate all code

**Never:** Have two different patterns coexisting.

### 4. **Is this testable?**

If no, refactor until it is.

**Testable:**
```javascript
// Service can be mocked
const data = await fetchMenu(slug);
```

**Not Testable:**
```javascript
// Direct fetch hard to mock
const res = await fetch(`${BASE_URL}/api/menu`);
```

### 5. **Will future developers understand this?**

If no, add documentation or refactor.

**Measures of Understanding:**
- Clear naming
- Comments explaining "why", not "what"
- Consistent patterns
- Architecture documentation

---

## Code Quality Standards

### Naming Conventions

**Functions:**
- Use verbs: `fetchMenu`, `handleLogin`, `updateOrder`
- Be specific: `loadUserProfile` not `getData`
- Async functions: Prefix with action verb

**Variables:**
- Use nouns: `menuData`, `userProfile`, `orderList`
- Boolean: Prefix with `is`, `has`, `should`
  - `isLoading`, `hasError`, `shouldShowModal`

**Constants:**
- UPPER_SNAKE_CASE for true constants
- camelCase for config objects

**Components:**
- PascalCase: `UserProfile`, `MenuList`
- Descriptive: `RestaurantOrderView` not `Component1`

### File Structure

```
feature/
├── FeatureComponent.jsx       # Main component
├── FeatureComponent.css       # Styles (if needed)
├── hooks/
│   └── useFeature.js          # Custom hooks
├── components/
│   └── FeatureSubComponent.jsx # Sub-components
└── __tests__/
    └── FeatureComponent.test.js # Tests
```

### Code Organization

**Component Structure:**
```javascript
// 1. Imports
import { useState } from "react";
import { fetchMenu } from "../../services/api";

// 2. Component definition
function MyComponent() {
  // 3. State declarations
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 4. Effects
  useEffect(() => { ... }, []);

  // 5. Event handlers
  const handleClick = () => { ... };

  // 6. Render helpers
  const renderItem = (item) => { ... };

  // 7. Return JSX
  return ( ... );
}

// 8. Export
export default MyComponent;
```

---

## Problem-Solving Approach

### Step 1: Reproduce

1. Identify exact steps to reproduce
2. Note environment (browser, OS, etc.)
3. Document expected vs actual behavior

### Step 2: Investigate

1. Check browser console
2. Check network tab
3. Check backend logs
4. Add strategic `console.log()` statements
5. Use debugger if needed

### Step 3: Understand

1. What is the root cause?
2. Why did this happen?
3. Are there other instances of this problem?
4. What are the side effects?

### Step 4: Design Solution

1. What patterns exist in the codebase?
2. How can we solve this consistently?
3. Will this prevent future occurrences?
4. Are there any trade-offs?

### Step 5: Implement

1. Write the fix
2. Add tests
3. Update documentation
4. Verify no regressions

### Step 6: Verify

1. Test original reproduction steps
2. Test edge cases
3. Test related functionality
4. Get code review

---

## Architecture Patterns

### Service Layer Pattern

**Always use services for API calls.**

✅ **Good:**
```javascript
import { fetchMenu } from "../../services/api";

const data = await fetchMenu(slug);
```

❌ **Bad:**
```javascript
const res = await fetch(`${BASE_URL}/api/menu?restaurang=${slug}`);
```

**Rationale:**
- Centralized error handling
- Consistent timeout management
- Easy to test and mock
- Single source of truth

### Custom Hooks Pattern

**Extract reusable logic into custom hooks.**

✅ **Good:**
```javascript
function useMenu(slug) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        const data = await fetchMenu(slug);
        setMenu(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadMenu();
  }, [slug]);

  return { menu, loading, error };
}
```

**Usage:**
```javascript
function MenuPage() {
  const { menu, loading, error } = useMenu("campino");

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  return <MenuList items={menu} />;
}
```

### Error Boundary Pattern

**Wrap components in error boundaries.**

```javascript
<ErrorBoundary>
  <MenuPage />
</ErrorBoundary>
```

---

## Testing Requirements

### Unit Tests

**Required for:**
- Services (AuthService, OrderService, MenuService)
- Utility functions
- Custom hooks
- Complex business logic

**Example:**
```javascript
describe("fetchMenu", () => {
  test("fetches menu successfully", async () => {
    const menu = await fetchMenu("campino");
    expect(menu).toBeArray();
  });

  test("throws error on failure", async () => {
    await expect(fetchMenu("invalid")).rejects.toThrow();
  });
});
```

### Integration Tests

**Required for:**
- User flows (login → browse → order)
- API integration
- State management

### Manual Testing Checklist

Before marking a feature complete:

- [ ] Test happy path
- [ ] Test error cases
- [ ] Test edge cases (empty data, long text, etc.)
- [ ] Test different user roles (admin, customer, courier)
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Verify no console errors
- [ ] Verify no console warnings

---

## Documentation Requirements

### When to Document

**Always document:**
- New services or service methods
- Complex business logic
- Non-obvious solutions
- Architecture decisions
- API changes

**Example:**
```javascript
/**
 * Fetches menu for a specific restaurant
 *
 * @param {string} restaurantSlug - Restaurant identifier (e.g., "campino")
 * @returns {Promise<Array<MenuItem>>} - Array of menu items
 * @throws {Error} - If restaurant not found or network error
 *
 * @example
 * const menu = await fetchMenu("campino");
 */
static async fetchMenu(restaurantSlug) {
  // ...
}
```

### Documentation Types

1. **Code Comments**
   - Explain "why", not "what"
   - Document complex algorithms
   - Note edge cases

2. **README Files**
   - Project setup
   - Development workflow
   - Deployment process

3. **Architecture Docs**
   - System design
   - Data flow
   - API architecture
   - (This document!)

4. **API Documentation**
   - Endpoint descriptions
   - Request/response formats
   - Error codes

---

## Review Checklist

Before submitting code for review, verify:

### Code Quality

- [ ] Follows naming conventions
- [ ] No commented-out code
- [ ] No TODO comments without tickets
- [ ] No console.log() left in production code
- [ ] Proper error handling
- [ ] Loading states implemented
- [ ] No hardcoded values (use constants/config)

### Architecture

- [ ] Uses service layer for API calls
- [ ] Follows existing patterns
- [ ] No code duplication
- [ ] Proper separation of concerns
- [ ] Reusable components extracted

### Testing

- [ ] Unit tests added for new logic
- [ ] Existing tests still pass
- [ ] Manual testing completed
- [ ] Edge cases tested

### Documentation

- [ ] Code comments added where needed
- [ ] README updated if needed
- [ ] API docs updated if changed
- [ ] Changelog/migration notes if breaking changes

### Performance

- [ ] No unnecessary re-renders
- [ ] No memory leaks
- [ ] Efficient algorithms
- [ ] Images optimized
- [ ] Lazy loading where appropriate

### Security

- [ ] No hardcoded credentials
- [ ] Input validation
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Secure cookie settings

---

## Common Anti-Patterns to Avoid

### Anti-Pattern 1: Magic Numbers

❌ **Bad:**
```javascript
setTimeout(() => { ... }, 30000);
```

✅ **Good:**
```javascript
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
setTimeout(() => { ... }, REFRESH_INTERVAL_MS);
```

### Anti-Pattern 2: Nested Ternaries

❌ **Bad:**
```javascript
const status = order.status === "pending" ? "Pending" :
               order.status === "accepted" ? "Accepted" :
               order.status === "delivered" ? "Delivered" : "Unknown";
```

✅ **Good:**
```javascript
const STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  delivered: "Delivered"
};
const status = STATUS_LABELS[order.status] || "Unknown";
```

### Anti-Pattern 3: Prop Drilling

❌ **Bad:**
```javascript
<Parent>
  <Child1 user={user}>
    <Child2 user={user}>
      <Child3 user={user} />
    </Child2>
  </Child1>
</Parent>
```

✅ **Good:**
```javascript
// Use Context or custom hook
const { user } = useAuth();
```

### Anti-Pattern 4: Massive Components

❌ **Bad:**
```javascript
function MassiveComponent() {
  // 500 lines of code
  // Multiple responsibilities
  // Hard to test
}
```

✅ **Good:**
```javascript
function ParentComponent() {
  return (
    <>
      <Header />
      <MainContent />
      <Footer />
    </>
  );
}
```

### Anti-Pattern 5: Inline Styles

❌ **Bad:**
```javascript
<div style={{ padding: "20px", margin: "10px", backgroundColor: "#fff" }}>
```

✅ **Good:**
```javascript
// In CSS file
.container {
  padding: 20px;
  margin: 10px;
  background-color: #fff;
}

// In component
<div className="container">
```

---

## Continuous Improvement

### Regular Reviews

**Monthly:**
- Review architecture decisions
- Identify technical debt
- Plan refactoring sprints

**Quarterly:**
- Update documentation
- Review and update patterns
- Team retrospective

### Knowledge Sharing

- Document lessons learned
- Share solutions in team meetings
- Update this document with new insights
- Pair programming sessions

### Metrics to Track

- Code coverage
- Build times
- Bundle size
- Page load times
- Error rates
- User satisfaction

---

## Conclusion

These principles ensure that the Annos project remains **maintainable**, **scalable**, and **high-quality** over the long term.

### Key Takeaways

1. **No quick-fixes** - Always solve the root cause
2. **Be consistent** - Follow existing patterns
3. **Be explicit** - Code should be obvious
4. **Test thoroughly** - Don't ship untested code
5. **Document well** - Future you will thank you
6. **Think long-term** - Code lasts longer than you think

### Remember

> "The best time to fix technical debt was yesterday. The second best time is now."

When in doubt, ask:
- **"Will this make sense in 6 months?"**
- **"Will a new developer understand this?"**
- **"Is this the root cause or a symptom?"**
- **"Am I being consistent with the codebase?"**

---

**This document should be referenced for all development work on the Annos project.**
