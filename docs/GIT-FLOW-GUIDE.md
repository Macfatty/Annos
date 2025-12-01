# Git Flow Guide - Annos Project

**Version:** 1.0
**Last Updated:** 2025-12-01
**Reference:** https://danielkummer.github.io/git-flow-cheatsheet/

---

## Table of Contents

1. [Introduction](#introduction)
2. [Branch Structure](#branch-structure)
3. [Workflow Overview](#workflow-overview)
4. [Feature Development](#feature-development)
5. [Release Management](#release-management)
6. [Hotfix Management](#hotfix-management)
7. [Best Practices](#best-practices)
8. [Commands Cheat Sheet](#commands-cheat-sheet)
9. [Common Scenarios](#common-scenarios)
10. [Branch Cleanup](#branch-cleanup)

---

## Introduction

Git Flow är en branching-modell för Git som hjälper team att organisera utvecklingsarbete på ett strukturerat sätt. Det är särskilt användbart för projekt med planerade releases och produktionsmiljöer.

### Varför Git Flow?

- **Tydlig struktur** - Alla vet var kod ska leva
- **Parallell utveckling** - Flera features samtidigt utan konflikter
- **Stabil produktion** - main-branchen är alltid deployable
- **Enklare releases** - Strukturerad process för versioner
- **Snabba hotfixes** - Akuta fixes utan att störa utveckling

---

## Branch Structure

```
main (production)
  │
  ├─── develop (integration)
  │      │
  │      ├─── feature/user-authentication
  │      ├─── feature/payment-integration
  │      └─── feature/mobile-app
  │
  ├─── release/1.0.0 (release preparation)
  │
  └─── hotfix/critical-bug-fix (urgent fixes)
```

### Branch Types

| Branch     | Purpose                          | Base Branch | Merge To        | Lifetime      |
|------------|----------------------------------|-------------|------------------|---------------|
| `main`     | Production-ready code            | -           | -                | Permanent     |
| `develop`  | Integration branch               | `main`      | -                | Permanent     |
| `feature/` | New features                     | `develop`   | `develop`        | Temporary     |
| `release/` | Release preparation              | `develop`   | `main` + `develop` | Temporary   |
| `hotfix/`  | Urgent production fixes          | `main`      | `main` + `develop` | Temporary   |

---

## Workflow Overview

### Normal Development Cycle

```
1. Create feature branch from develop
2. Develop feature
3. Test feature
4. Merge feature to develop
5. When ready for release:
   - Create release branch
   - Test and fix bugs
   - Merge to main (production)
   - Tag with version number
   - Merge back to develop
```

### Emergency Hotfix Cycle

```
1. Create hotfix branch from main
2. Fix bug
3. Test fix
4. Merge to main
5. Tag with patch version
6. Merge to develop
```

---

## Feature Development

### 1. Start a New Feature

```bash
# Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/my-new-feature

# Or with specific naming
git checkout -b feature/PHASE-4-frontend-dashboard
```

### 2. Work on Feature

```bash
# Make changes
git add .
git commit -m "feat: add user authentication"

# Push to remote for backup/collaboration
git push -u origin feature/my-new-feature
```

### 3. Keep Feature Updated

```bash
# Periodically merge develop into your feature
git checkout feature/my-new-feature
git merge develop

# Or rebase (cleaner history, but more complex)
git rebase develop
```

### 4. Complete Feature

```bash
# Ensure all changes are committed
git status

# Switch to develop
git checkout develop
git pull origin develop

# Merge feature (--no-ff keeps branch history)
git merge --no-ff feature/my-new-feature

# Push to remote
git push origin develop

# Delete feature branch locally
git branch -d feature/my-new-feature

# Delete feature branch remotely
git push origin --delete feature/my-new-feature
```

### Feature Branch Naming Conventions

**Format:** `feature/[description]` or `feature/[PHASE-X]-[description]`

**Examples:**
- `feature/user-authentication`
- `feature/payment-integration`
- `feature/PHASE-4-frontend-dashboard`
- `feature/PHASE-3B-mobile-app`
- `feature/admin-analytics`

**Rules:**
- Use kebab-case (lowercase with hyphens)
- Be descriptive but concise
- Include PHASE number if part of planned roadmap
- No special characters except hyphens

---

## Release Management

### 1. Start a Release

```bash
# Decide on version number (Semantic Versioning)
# MAJOR.MINOR.PATCH (e.g., 1.0.0, 1.1.0, 2.0.0)

# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# Push to remote
git push -u origin release/1.0.0
```

### 2. Prepare Release

```bash
# Update version numbers in files
# - package.json
# - README.md
# - Any version constants

# Example: Update package.json version
# Manually edit or use npm version
npm version 1.0.0 --no-git-tag-version

# Commit version bump
git add .
git commit -m "chore: bump version to 1.0.0"

# Bug fixes can be made on release branch
git commit -m "fix: correct typo in login form"
```

### 3. Finish Release

```bash
# Merge to main
git checkout main
git pull origin main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main
git push origin v1.0.0

# Merge back to develop
git checkout develop
git pull origin develop
git merge --no-ff release/1.0.0
git push origin develop

# Delete release branch
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

### Semantic Versioning

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

**Examples:**
- `0.1.0` - Initial development
- `1.0.0` - First production release
- `1.1.0` - Added payment feature
- `1.1.1` - Fixed payment bug
- `2.0.0` - Changed API structure (breaking change)

---

## Hotfix Management

### When to Use Hotfix

Use hotfix branches for **critical bugs** in production that can't wait for next release:

- Security vulnerabilities
- Data corruption bugs
- Critical functionality broken
- Payment processing errors

### 1. Start a Hotfix

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/1.0.1

# Push to remote
git push -u origin hotfix/1.0.1
```

### 2. Fix the Bug

```bash
# Make fix
git add .
git commit -m "fix: resolve critical payment bug"

# Test thoroughly!
```

### 3. Finish Hotfix

```bash
# Merge to main
git checkout main
git pull origin main
git merge --no-ff hotfix/1.0.1
git tag -a v1.0.1 -m "Hotfix: critical payment bug"
git push origin main
git push origin v1.0.1

# Merge to develop
git checkout develop
git pull origin develop
git merge --no-ff hotfix/1.0.1
git push origin develop

# Delete hotfix branch
git branch -d hotfix/1.0.1
git push origin --delete hotfix/1.0.1
```

### Hotfix Naming

**Format:** `hotfix/[version]` or `hotfix/[description]`

**Examples:**
- `hotfix/1.0.1`
- `hotfix/critical-security-patch`
- `hotfix/payment-processing-error`

---

## Best Practices

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no code change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add JWT token refresh functionality

Implement token refresh mechanism to extend user sessions
without requiring re-login.

Closes #123
```

```
fix(payment): resolve Swish integration timeout

Increased timeout from 5s to 30s for Swish API calls
to handle slow network conditions.

Fixes #456
```

### Branch Management

**DO:**
- ✅ Pull before creating new branches
- ✅ Keep branches focused (one feature per branch)
- ✅ Delete branches after merging
- ✅ Use `--no-ff` when merging (preserves history)
- ✅ Write descriptive commit messages
- ✅ Test before merging

**DON'T:**
- ❌ Commit directly to main or develop
- ❌ Keep long-lived feature branches
- ❌ Merge untested code
- ❌ Push broken code
- ❌ Force push to shared branches
- ❌ Mix multiple features in one branch

### Code Review

Before merging feature to develop:

1. **Self-review** your changes
2. **Run tests** locally
3. **Check for conflicts** with develop
4. **Create Pull Request** (if using GitHub)
5. **Address feedback** from reviewers
6. **Squash commits** if needed for clean history

---

## Commands Cheat Sheet

### Daily Development

```bash
# Start work
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# During development
git add .
git commit -m "feat: description"
git push origin feature/my-feature

# Update from develop
git checkout feature/my-feature
git merge develop

# Finish feature
git checkout develop
git pull origin develop
git merge --no-ff feature/my-feature
git push origin develop
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

### Release Cycle

```bash
# Start release
git checkout develop
git pull origin develop
git checkout -b release/1.0.0
git push -u origin release/1.0.0

# Update version
npm version 1.0.0 --no-git-tag-version
git commit -am "chore: bump version to 1.0.0"

# Finish release
git checkout main
git merge --no-ff release/1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin main --tags

git checkout develop
git merge --no-ff release/1.0.0
git push origin develop

git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

### Emergency Hotfix

```bash
# Start hotfix
git checkout main
git pull origin main
git checkout -b hotfix/1.0.1
git push -u origin hotfix/1.0.1

# Fix and test
git commit -am "fix: critical bug"

# Finish hotfix
git checkout main
git merge --no-ff hotfix/1.0.1
git tag -a v1.0.1 -m "Hotfix 1.0.1"
git push origin main --tags

git checkout develop
git merge --no-ff hotfix/1.0.1
git push origin develop

git branch -d hotfix/1.0.1
git push origin --delete hotfix/1.0.1
```

---

## Common Scenarios

### Scenario 1: Starting a New Feature

**Situation:** Du ska implementera user authentication.

```bash
# 1. Ensure develop is up to date
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/user-authentication

# 3. Work on feature
# ... make changes ...
git add .
git commit -m "feat(auth): add login endpoint"

# 4. Push for backup
git push -u origin feature/user-authentication

# 5. Continue working, committing as you go
git add .
git commit -m "feat(auth): add JWT token generation"
git push

# 6. When done, merge to develop
git checkout develop
git pull origin develop
git merge --no-ff feature/user-authentication
git push origin develop

# 7. Clean up
git branch -d feature/user-authentication
git push origin --delete feature/user-authentication
```

### Scenario 2: Preparing for Production Release

**Situation:** Develop-branchen har flera nya features, redo för release.

```bash
# 1. Create release branch
git checkout develop
git pull origin develop
git checkout -b release/1.0.0
git push -u origin release/1.0.0

# 2. Update version numbers
npm version 1.0.0 --no-git-tag-version
git commit -am "chore: bump version to 1.0.0"

# 3. Test thoroughly on release branch
# If bugs found, fix them:
git commit -am "fix: resolve issue in payment flow"

# 4. Merge to main (production)
git checkout main
git pull origin main
git merge --no-ff release/1.0.0

# 5. Tag the release
git tag -a v1.0.0 -m "Release 1.0.0 - First production release"
git push origin main
git push origin v1.0.0

# 6. Merge bug fixes back to develop
git checkout develop
git pull origin develop
git merge --no-ff release/1.0.0
git push origin develop

# 7. Delete release branch
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

### Scenario 3: Critical Bug in Production

**Situation:** Betalningar fungerar inte i produktion! Måste fixas NU.

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/1.0.1
git push -u origin hotfix/1.0.1

# 2. Fix the critical bug
# ... make fix ...
git add .
git commit -m "fix(payment): resolve Swish timeout issue"

# 3. Test extensively!
# Run tests, manual testing, etc.

# 4. Merge to main
git checkout main
git pull origin main
git merge --no-ff hotfix/1.0.1
git tag -a v1.0.1 -m "Hotfix 1.0.1 - Fix Swish timeout"
git push origin main
git push origin v1.0.1

# 5. Merge to develop to keep it in sync
git checkout develop
git pull origin develop
git merge --no-ff hotfix/1.0.1
git push origin develop

# 6. Clean up
git branch -d hotfix/1.0.1
git push origin --delete hotfix/1.0.1
```

### Scenario 4: Multiple Developers on Same Feature

**Situation:** Två personer jobbar på samma feature.

```bash
# Developer 1: Creates feature branch
git checkout develop
git pull origin develop
git checkout -b feature/payment-integration
git push -u origin feature/payment-integration

# Developer 2: Starts working on same feature
git checkout develop
git pull origin develop
git checkout feature/payment-integration
git pull origin feature/payment-integration

# Both developers work independently
# Developer 1:
git add .
git commit -m "feat(payment): add Swish integration"
git push origin feature/payment-integration

# Developer 2: Before pushing, pull latest changes
git pull origin feature/payment-integration
# Resolve any conflicts if needed
git add .
git commit -m "feat(payment): add Stripe integration"
git push origin feature/payment-integration

# When feature is done, one person merges to develop
git checkout develop
git pull origin develop
git merge --no-ff feature/payment-integration
git push origin develop
```

### Scenario 5: Feature Takes Longer Than Expected

**Situation:** Din feature tar flera veckor, develop får nya ändringar.

```bash
# Regularly merge develop into your feature to stay updated
git checkout feature/long-running-feature
git pull origin feature/long-running-feature

# Merge latest from develop
git merge develop

# Resolve conflicts if any
# ... resolve conflicts ...
git add .
git commit -m "merge: integrate latest changes from develop"

# Continue working
git push origin feature/long-running-feature

# Repeat this weekly (or when significant changes land in develop)
```

---

## Branch Cleanup

### Identifying Old Branches

```bash
# List all remote branches
git branch -r

# List branches with last commit date
git for-each-ref --sort=-committerdate refs/remotes/origin --format='%(committerdate:short) %(refname:short)'

# List local branches not merged to main
git branch --no-merged main
```

### Deleting Old Branches

**Local branches:**
```bash
# Delete single branch
git branch -d feature/old-feature

# Force delete if not merged
git branch -D feature/old-feature

# Delete all local branches except main and develop
git branch | grep -v "main" | grep -v "develop" | xargs git branch -d
```

**Remote branches:**
```bash
# Delete single remote branch
git push origin --delete feature/old-feature

# Delete multiple remote branches (be careful!)
git branch -r | grep 'origin/codex/' | sed 's/origin\///' | xargs -I {} git push origin --delete {}
```

### Clean Up Strategy for Annos Project

Based on current branch list, här är rekommenderad cleanup:

**KEEP:**
- `main` - Production branch
- `develop` - Integration branch (newly created)
- Active feature branches currently being worked on

**DELETE:**
- All `remotes/origin/codex/*` branches (old Codex work, should be merged or abandoned)
- All `remotes/origin/*-codex/*` branches (random ID branches from Codex)
- Old local feature branches that are merged to main

**Manual Review Needed:**
- `feature/phase*` branches - Check if merged or still needed

### Cleanup Script

Create `.claude/cleanup-branches.sh`:

```bash
#!/bin/bash
# Branch cleanup script
# Use with caution!

echo "Cleaning up old remote Codex branches..."

# List branches to be deleted (dry run)
echo "The following branches will be deleted:"
git branch -r | grep 'origin/codex/' | sed 's/origin\///'
git branch -r | grep 'origin/.*-codex/' | sed 's/origin\///'

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Delete codex branches
    git branch -r | grep 'origin/codex/' | sed 's/origin\///' | xargs -I {} git push origin --delete {}
    git branch -r | grep 'origin/.*-codex/' | sed 's/origin\///' | xargs -I {} git push origin --delete {}

    echo "Cleanup complete!"
else
    echo "Cleanup cancelled."
fi
```

---

## FAQ

### Q: Varför inte committa direkt till main?

**A:** Main ska alltid vara produktionsklar kod. Alla ändringar ska testas och granskas i develop först.

### Q: När ska jag skapa en release branch?

**A:** När develop har alla features för nästa version och du är redo att förbereda för production.

### Q: Måste jag använda `--no-ff` när jag mergar?

**A:** Ja, det rekommenderas starkt! Det bevarar branch-historiken och gör det lättare att se när features mergades.

### Q: Vad händer om jag glömmer att merga hotfix till develop?

**A:** Develop kommer sakna bugfixen och felet kan återkomma vid nästa release. Merga alltid till båda!

### Q: Kan jag arbeta på flera features samtidigt?

**A:** Ja! Skapa flera feature branches. Var bara noga med att hålla dem separata.

### Q: Hur hanterar jag merge conflicts?

**A:**
1. Git kommer markera konflikterna i filerna
2. Öppna filen och lös konflikten manuellt
3. `git add <file>`
4. `git commit` för att slutföra mergen

---

## Resources

- **Git Flow Cheat Sheet:** https://danielkummer.github.io/git-flow-cheatsheet/
- **Semantic Versioning:** https://semver.org/
- **Conventional Commits:** https://www.conventionalcommits.org/
- **Git Documentation:** https://git-scm.com/doc

---

## Summary

**Huvudregler:**

1. **main** = Produktionskod (alltid stabil)
2. **develop** = Integrationsbranch (nästa release)
3. **feature/** = Nya funktioner (från develop)
4. **release/** = Förbered release (från develop)
5. **hotfix/** = Akuta fixes (från main)

**Grundläggande workflow:**

```
develop → feature/x → develop → release/1.0 → main (tag v1.0) → develop
```

**Vid akut bug:**

```
main → hotfix/1.0.1 → main (tag v1.0.1) → develop
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
**Maintained By:** Annos Development Team
