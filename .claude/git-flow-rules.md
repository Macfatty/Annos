# Git Flow Rules for Claude Code

**Purpose:** Internal instructions for Claude Code when working with git in the Annos project.
**Reference:** https://danielkummer.github.io/git-flow-cheatsheet/
**User Guide:** `/docs/GIT-FLOW-GUIDE.md`

---

## Branch Structure

The Annos project follows Git Flow methodology:

- **main** - Production branch (stable, deployable)
- **develop** - Integration branch (next release)
- **feature/*** - Feature branches (from develop)
- **release/*** - Release preparation (from develop)
- **hotfix/*** - Emergency fixes (from main)

---

## Rules for Claude Code

### NEVER Do This

❌ **NEVER** commit directly to `main` branch
❌ **NEVER** commit directly to `develop` branch without user approval
❌ **NEVER** force push to shared branches (`main`, `develop`, `release/*`, `hotfix/*`)
❌ **NEVER** delete `main` or `develop` branches
❌ **NEVER** create branches with random or unclear names
❌ **NEVER** merge without running tests first
❌ **NEVER** push broken code

### ALWAYS Do This

✅ **ALWAYS** work on feature branches for new development
✅ **ALWAYS** use conventional commit messages
✅ **ALWAYS** use `--no-ff` when merging (preserves history)
✅ **ALWAYS** run tests before merging
✅ **ALWAYS** check current branch before committing
✅ **ALWAYS** pull latest changes before creating new branches
✅ **ALWAYS** clean up feature branches after merging

---

## Workflow by Task Type

### 1. Implementing New Features

**Always use feature branches:**

```bash
# Start feature
git checkout develop
git pull origin develop
git checkout -b feature/PHASE-X-description

# Work and commit
git add .
git commit -m "feat(scope): description"
git push -u origin feature/PHASE-X-description

# When complete, merge to develop
git checkout develop
git pull origin develop
git merge --no-ff feature/PHASE-X-description
git push origin develop

# Clean up
git branch -d feature/PHASE-X-description
git push origin --delete feature/PHASE-X-description
```

**Feature branch naming:**
- Format: `feature/[PHASE-X]-[description]` or `feature/[description]`
- Use kebab-case (lowercase-with-hyphens)
- Examples:
  - `feature/PHASE-4-frontend-dashboard`
  - `feature/user-authentication`
  - `feature/payment-swish-integration`

### 2. Documentation Updates

**For documentation only (no code changes):**

```bash
# Can use feature branch or work directly on develop (with user approval)
git checkout develop
git pull origin develop

# Make changes
git add docs/
git commit -m "docs: add Git Flow guide"
git push origin develop
```

### 3. Bug Fixes (Non-Critical)

**Use feature branch:**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/fix-payment-validation

git add .
git commit -m "fix(payment): correct validation logic"
git push -u origin feature/fix-payment-validation

# Merge to develop
git checkout develop
git merge --no-ff feature/fix-payment-validation
git push origin develop

git branch -d feature/fix-payment-validation
git push origin --delete feature/fix-payment-validation
```

### 4. Critical Production Fixes

**Use hotfix branch (ONLY for production emergencies):**

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/1.0.1

# Fix critical bug
git add .
git commit -m "fix: resolve critical payment timeout"
git push -u origin hotfix/1.0.1

# Merge to main
git checkout main
git merge --no-ff hotfix/1.0.1
git tag -a v1.0.1 -m "Hotfix 1.0.1: payment timeout"
git push origin main
git push origin v1.0.1

# Merge to develop
git checkout develop
git merge --no-ff hotfix/1.0.1
git push origin develop

# Clean up
git branch -d hotfix/1.0.1
git push origin --delete hotfix/1.0.1
```

**Only create hotfix if:**
- Bug is in production (`main` branch)
- Bug is critical (security, data corruption, broken core functionality)
- Cannot wait for next release

### 5. Preparing for Release

**Use release branch:**

```bash
# Create release from develop
git checkout develop
git pull origin develop
git checkout -b release/1.0.0
git push -u origin release/1.0.0

# Update version
npm version 1.0.0 --no-git-tag-version
git commit -am "chore: bump version to 1.0.0"

# Bug fixes on release branch
git commit -am "fix: correct typo in UI"

# Merge to main
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin main
git push origin v1.0.0

# Merge back to develop
git checkout develop
git merge --no-ff release/1.0.0
git push origin develop

# Clean up
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

---

## Commit Message Format

Follow Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Maintenance (dependencies, config, etc.)

### Scopes (examples)

- `auth` - Authentication
- `payment` - Payment processing
- `courier` - Courier management
- `order` - Order management
- `analytics` - Analytics
- `mobile` - Mobile app
- `frontend` - Frontend
- `backend` - Backend

### Examples

```bash
# Good commit messages
git commit -m "feat(auth): add JWT token refresh"
git commit -m "fix(payment): resolve Swish timeout issue"
git commit -m "docs: add Git Flow guide"
git commit -m "chore: bump version to 1.0.0"
git commit -m "test: add payment integration tests"

# Bad commit messages (DON'T USE)
git commit -m "fixed stuff"
git commit -m "updates"
git commit -m "WIP"
git commit -m "changes"
```

### Generated with Claude Code

Always append to commit messages:

```
feat(feature): description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Decision Tree for Branch Selection

```
                    Is it a new feature or major change?
                           /              \
                         YES               NO
                          |                 |
                   feature/name        Is it critical production bug?
                          |               /                \
                    Merge to develop    YES                NO
                                         |                  |
                                    hotfix/version    Is it documentation only?
                                         |               /           \
                              Merge to main + develop  YES            NO
                                                       |              |
                                                  develop        feature/fix-name
                                                   (with              |
                                                  approval)      Merge to develop
```

---

## Pre-Commit Checklist

Before **every** commit, Claude must verify:

1. ✅ On correct branch (NOT main, NOT develop unless approved)
2. ✅ All files staged are intentional
3. ✅ No debug code (console.log, debugger, etc.)
4. ✅ No secrets or sensitive data
5. ✅ Commit message follows format
6. ✅ Tests pass (if applicable)

Before **merging** to develop:

1. ✅ All commits are related to feature
2. ✅ Tests pass
3. ✅ No merge conflicts
4. ✅ Feature is complete
5. ✅ User approved (if significant change)

Before **pushing** to remote:

1. ✅ Pulled latest changes
2. ✅ Tests pass
3. ✅ No broken code
4. ✅ Commit messages are clean

---

## Branch Naming Rules

### Feature Branches

**Format:** `feature/[PHASE-X]-[description]` or `feature/[description]`

**Rules:**
- Lowercase only
- Use hyphens, not underscores or spaces
- Be descriptive
- Include PHASE number if part of roadmap

**Good:**
- `feature/PHASE-4-frontend-dashboard`
- `feature/user-profile-edit`
- `feature/payment-stripe-integration`
- `feature/email-notifications`

**Bad:**
- `feature/stuff` (too vague)
- `feature/New_Feature` (wrong case, underscore)
- `feature/frontend dashboard` (spaces)
- `my-branch` (missing prefix)

### Release Branches

**Format:** `release/[version]`

**Examples:**
- `release/1.0.0`
- `release/1.1.0`
- `release/2.0.0-beta`

### Hotfix Branches

**Format:** `hotfix/[version]` or `hotfix/[description]`

**Examples:**
- `hotfix/1.0.1`
- `hotfix/critical-security-patch`
- `hotfix/payment-timeout-fix`

---

## Common Scenarios for Claude

### Scenario 1: User asks to implement new feature

```bash
# Ask user for feature name/description
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/PHASE-X-name

# Implement feature with commits
# When done:
git checkout develop
git pull origin develop
git merge --no-ff feature/PHASE-X-name
git push origin develop
git branch -d feature/PHASE-X-name
git push origin --delete feature/PHASE-X-name
```

### Scenario 2: User asks to fix a bug

**If bug is in production (main):**
```bash
# Ask user: "Is this a critical production bug that needs immediate fix?"
# If YES: Use hotfix branch
# If NO: Use feature branch
```

### Scenario 3: User asks to update documentation

```bash
# Can work on develop directly for docs-only changes
git checkout develop
git pull origin develop
git add docs/
git commit -m "docs: update documentation"
git push origin develop
```

### Scenario 4: Multiple features in progress

```bash
# Keep separate feature branches for each
# Don't mix features in one branch
# Example:
git checkout -b feature/user-auth
# ... work on auth ...

git checkout develop
git checkout -b feature/payment-integration
# ... work on payment ...

# Merge separately when each is done
```

### Scenario 5: Long-running feature

```bash
# Regularly merge develop into feature to stay updated
git checkout feature/long-feature
git merge develop
git push origin feature/long-feature

# Continue working
# Repeat weekly or when significant changes land in develop
```

---

## Error Handling

### If accidentally committed to main:

```bash
# DON'T PANIC
# DON'T push if you haven't already

# Reset the commit
git reset HEAD~1

# Switch to correct branch
git checkout develop
# Or create feature branch
git checkout -b feature/my-fix

# Re-commit on correct branch
git add .
git commit -m "..."
```

### If accidentally pushed to main:

```bash
# Tell user immediately
# Explain what happened
# Ask for instructions

# Possible solutions:
# 1. Revert the commit
git revert <commit-hash>
git push origin main

# 2. If caught very quickly, force push (ONLY with user approval)
git reset --hard HEAD~1
git push origin main --force
```

### If merge conflict occurs:

```bash
# Don't try to resolve automatically
# Show conflict to user
# Ask user to resolve or provide guidance

# Example message:
"Merge conflict detected in the following files:
- src/file1.js
- src/file2.js

Would you like me to:
1. Show you the conflicts
2. Abort the merge
3. Wait for your manual resolution"
```

---

## Testing Requirements

Before merging to develop:

```bash
# Run all tests
npm test

# If tests fail, DON'T merge
# Fix tests or code, then retry
```

Before creating release:

```bash
# Run full test suite
npm test

# Run linter
npm run lint

# Check build
npm run build
```

---

## Summary for Claude

**Primary Rule:** ALL development work happens on feature branches, never directly on main or develop.

**Branch Selection:**
- New feature → `feature/name` from `develop`
- Critical production bug → `hotfix/version` from `main`
- Release preparation → `release/version` from `develop`
- Documentation only → `develop` (with approval)

**Merging:**
- Always use `--no-ff` (preserves history)
- Always run tests first
- Always clean up branches after merging

**Commits:**
- Follow conventional commits format
- Be descriptive
- One logical change per commit

**Safety:**
- Never force push to shared branches
- Never commit directly to main
- Never merge untested code
- Always verify current branch before committing

---

**Last Updated:** 2025-12-01
**For:** Claude Code AI Assistant
**Reference:** `/docs/GIT-FLOW-GUIDE.md` (user-facing documentation)
