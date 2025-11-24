# 🌳 Git Workflow & Regler

**Projekt:** Foodie/Annos
**Datum:** 2025-11-24
**Status:** ACTIVE - Följ dessa regler!

---

## 🎯 Syfte

Detta dokument definierar hur VI (utvecklare + Claude) ska arbeta med Git för att:
- ✅ Hålla `main` branch alltid stabil
- ✅ Möjliggöra säker utveckling
- ✅ Enkelt kunna göra rollback
- ✅ Möjliggöra code review
- ✅ Undvika konflikter
- ✅ Följa industry best practices

---

## 📋 Branch Strategy

### **main Branch (Protected)**

**Syfte:** Production-ready kod
**Regler:**
- ✅ ALLTID stabil och fungerande
- ❌ ALDRIG commit direkt till main
- ❌ ALDRIG force push till main
- ✅ Endast merge via Pull Requests
- ✅ Alla tester måste passa innan merge
- ✅ Code review innan merge (om team)

**När deployas:** Automatiskt eller manuellt efter merge

---

### **Feature Branches**

**Syfte:** Utveckling av nya features (PHASE 1-6, etc.)
**Naming:** `feature/<beskrivning>`

**Examples:**
```bash
feature/phase1-permissions
feature/phase2-restaurants
feature/phase3-courier-management
feature/add-email-notifications
feature/dark-mode
```

**Regler:**
- ✅ Skapa från senaste `main`
- ✅ Commit ofta med tydliga meddelanden
- ✅ Push till GitHub regelbundet (backup)
- ✅ Testa innan merge till main
- ✅ Delete efter merge till main

**Livscykel:**
```bash
# 1. Skapa
git checkout main
git pull origin main
git checkout -b feature/phase1-permissions

# 2. Utveckla
# ... commit, commit, commit

# 3. Push
git push origin feature/phase1-permissions

# 4. Merge (via PR)
# GitHub: Create Pull Request → Review → Merge

# 5. Cleanup
git checkout main
git pull origin main
git branch -d feature/phase1-permissions
```

---

### **Bugfix Branches**

**Syfte:** Fixa icke-kritiska bugs
**Naming:** `bugfix/<beskrivning>`

**Examples:**
```bash
bugfix/login-validation-error
bugfix/order-status-not-updating
bugfix/menu-display-issue
```

**Regler:**
- ✅ Skapa från `main`
- ✅ Fix buggen
- ✅ Testa fix
- ✅ Merge till main via PR
- ✅ Delete efter merge

---

### **Hotfix Branches**

**Syfte:** Kritiska production bugs som måste fixas OMEDELBART
**Naming:** `hotfix/<beskrivning>`

**Examples:**
```bash
hotfix/payment-system-down
hotfix/critical-security-vulnerability
hotfix/server-crash
```

**Regler:**
- ✅ Skapa från `main`
- ✅ Fix buggen SNABBT
- ✅ Minimal testing (critical fix)
- ✅ Merge direkt till main (kan skippa PR om kritiskt)
- ✅ Deploy omedelbart
- ✅ Delete efter merge

**Fast-track process:**
```bash
git checkout main
git pull origin main
git checkout -b hotfix/payment-down
# ... fix
git add .
git commit -m "Hotfix: Fix payment system crash"
git push origin hotfix/payment-down
# Om super kritiskt: merge direkt utan PR
git checkout main
git merge hotfix/payment-down
git push origin main
# Deploy!
```

---

### **Chore Branches**

**Syfte:** Underhåll, refactoring, dependency updates
**Naming:** `chore/<beskrivning>`

**Examples:**
```bash
chore/update-dependencies
chore/cleanup-old-code
chore/refactor-auth-middleware
```

**Regler:**
- ✅ Skapa från `main`
- ✅ Ingen funktionalitetsändring
- ✅ Merge via PR
- ✅ Delete efter merge

---

### **Docs Branches**

**Syfte:** Dokumentation updates
**Naming:** `docs/<beskrivning>`

**Examples:**
```bash
docs/api-documentation
docs/setup-guide
docs/update-readme
```

**Regler:**
- ✅ Skapa från `main`
- ✅ Endast dokumentation ändringar
- ✅ Kan merge utan extensive testing
- ✅ Delete efter merge

---

## 📝 Commit Message Regler

### **Format:**

```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

### **Types:**

- `feat:` Ny feature
- `fix:` Bugfix
- `hotfix:` Kritisk production fix
- `refactor:` Code refactoring (ingen funktionalitetsändring)
- `docs:` Dokumentation
- `style:` Formatting, saknade semikolon, etc (ingen kod-ändring)
- `test:` Lägga till tester
- `chore:` Maintenance tasks

### **Subject Rules:**

- ✅ Använd imperativ mood ("Add feature" inte "Added feature")
- ✅ Ingen punkt i slutet
- ✅ Max 50 tecken
- ✅ Börja med versal
- ✅ Var specifik

### **Examples:**

```bash
# ✅ GOOD
git commit -m "feat: Add permission-based authorization system"
git commit -m "fix: Correct order status update logic"
git commit -m "docs: Update API documentation for orders endpoint"
git commit -m "refactor: Simplify authentication middleware"

# ❌ BAD
git commit -m "updated files"
git commit -m "bug fix"
git commit -m "changes"
git commit -m "wip"
```

### **Multi-line Commit (för större changes):**

```bash
git commit -m "feat: Add permission system

- Add permissions table
- Add role_permissions table
- Add PermissionService
- Add requirePermission middleware
- Update all routes to use new system

Implements PHASE 1 from IMPLEMENTATION_ROADMAP.md"
```

---

## 🔄 Standard Workflow

### **Starta ny feature (t.ex. PHASE 1):**

```bash
# 1. Se till main är uppdaterad
git checkout main
git pull origin main

# 2. Skapa feature branch
git checkout -b feature/phase1-permissions

# 3. Verifiera du är på rätt branch
git branch
# * feature/phase1-permissions  ← Du är här
#   main

# 4. Börja utveckla!
```

---

### **Under utveckling:**

```bash
# Commit ofta (minst dagligen, helst efter varje task)
git add .
git commit -m "feat: Add permissions table migration"

# Push till GitHub regelbundet (backup + visibility)
git push origin feature/phase1-permissions

# Om du behöver hämta ändringar från main:
git checkout main
git pull origin main
git checkout feature/phase1-permissions
git merge main  # Eller: git rebase main (om du är ensam på branchen)
```

---

### **Färdig med feature:**

```bash
# 1. Se till allt är committat
git status  # Ska vara "nothing to commit, working tree clean"

# 2. Push final version
git push origin feature/phase1-permissions

# 3. Skapa Pull Request på GitHub
# - Gå till GitHub repo
# - Click "Pull Requests"
# - Click "New Pull Request"
# - Base: main, Compare: feature/phase1-permissions
# - Titel: "PHASE 1: Permission System Implementation"
# - Beskrivning: Länka till dokumentation, beskriv ändringar
# - Click "Create Pull Request"

# 4. Code Review (om team)
# - Vänta på godkännande
# - Adressera feedback om behövs

# 5. Merge
# - Click "Merge Pull Request" på GitHub
# - Välj merge type (vanligtvis "Create a merge commit")
# - Click "Confirm merge"

# 6. Lokalt: Uppdatera main och städa
git checkout main
git pull origin main
git branch -d feature/phase1-permissions  # Delete local branch
git push origin --delete feature/phase1-permissions  # Delete remote branch (optional)
```

---

## 🚨 Emergency Hotfix Workflow

```bash
# KRITISK BUG I PRODUCTION!

# 1. Från main (production code)
git checkout main
git pull origin main

# 2. Skapa hotfix branch
git checkout -b hotfix/payment-system-down

# 3. Fix buggen SNABBT
# ... edit files

# 4. Commit
git add .
git commit -m "hotfix: Fix payment system crash

Critical fix for production issue causing payment failures.
Issue: Database connection timeout
Solution: Increase timeout and add retry logic"

# 5. Push
git push origin hotfix/payment-system-down

# 6. Om SUPER KRITISKT: Merge direkt
git checkout main
git merge hotfix/payment-system-down
git push origin main
# → Deploy till production OMEDELBART

# 7. Om mindre kritiskt: Skapa PR
# (Samma process som feature branch)

# 8. Cleanup
git branch -d hotfix/payment-system-down
```

---

## 🔐 Branch Protection (GitHub Settings)

### **Konfigurera på GitHub:**

**Repository Settings → Branches → Add rule**

**För `main` branch:**

```
Branch name pattern: main

✅ Require pull request before merging
  ✅ Require approvals: 1 (om team)

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging

✅ Include administrators (även admins måste följa reglerna)

❌ Allow force pushes (ALDRIG force push till main!)

❌ Allow deletions (Skydda main från deletion)
```

---

## 📊 Git Commands Cheat Sheet

### **Vanliga Kommandon:**

```bash
# Status
git status                          # Visa working directory status
git log --oneline                   # Visa commit history
git branch                          # Visa alla branches
git branch -a                       # Visa alla branches (inkl remote)

# Branches
git checkout main                   # Byt till main
git checkout -b feature/new         # Skapa och byt till ny branch
git branch -d feature/old           # Delete local branch (safe)
git branch -D feature/old           # Delete local branch (force)

# Commits
git add .                           # Stage alla ändringar
git add file.js                     # Stage specifik fil
git commit -m "message"             # Commit med message
git commit --amend                  # Ändra senaste commit

# Remote
git push origin branch-name         # Push branch till GitHub
git pull origin main                # Hämta ändringar från main
git fetch origin                    # Hämta info utan merge

# Merge
git merge branch-name               # Merge branch till current branch
git merge --no-ff branch-name       # Merge med merge commit

# Undo/Reset
git checkout -- file.js             # Discard changes i fil
git reset HEAD file.js              # Unstage fil
git reset --hard HEAD               # Discard alla ändringar (FARLIGT!)
git revert commit-hash              # Undo commit (safe way)

# Stash (temporary save)
git stash                           # Spara ändringar temporarily
git stash pop                       # Återställ stashade ändringar
git stash list                      # Lista alla stashes
```

---

## ⚠️ VAS ATT UNDVIKA

### **❌ ALDRIG GÖR DETTA:**

```bash
# 1. Force push till main
git push -f origin main             # ❌ ALDRIG!

# 2. Commit direkt till main (efter setup)
git checkout main
git commit -m "quick fix"           # ❌ Använd branch!

# 3. Merge utan test
git merge feature/untested          # ❌ Testa först!

# 4. Stora commits med mixed changes
git commit -m "stuff"               # ❌ Var specifik!

# 5. Commit secrets/credentials
git add .env                        # ❌ ALDRIG commit secrets!
git add credentials.json            # ❌ ALDRIG!

# 6. Arbeta länge utan commit
# (3 dagar utan commit)             # ❌ Commit dagligen!

# 7. Delete main branch
git branch -D main                  # ❌ KATASTROFALT!
```

---

## ✅ BEST PRACTICES

### **DO:**

```bash
# 1. Commit ofta
# Efter varje task eller 1-2 timmars arbete

# 2. Push dagligen
git push origin feature/current-work

# 3. Sync med main regelbundet
git checkout main && git pull
git checkout feature/current-work
git merge main

# 4. Tydliga commit messages
git commit -m "feat: Add user authentication endpoint"

# 5. Test innan merge
npm test
npm run lint

# 6. Små, focused commits
# En feature/fix per commit

# 7. Branch cleanup
# Delete branches efter merge
```

---

## 🎯 Workflow för VÅRT Projekt (Foodie/Annos)

### **PHASE Implementation Process:**

```bash
# === STEG 1: Förberedelse ===
git checkout main
git pull origin main

# === STEG 2: Skapa Branch ===
git checkout -b feature/phase1-permissions

# === STEG 3: Utveckling ===
# Task 1.1: Permission tables
# ... arbeta
git add backend/migrations/001_permissions_system.js
git commit -m "feat: Add permissions and role_permissions tables"
git push origin feature/phase1-permissions

# Task 1.2: PermissionService
# ... arbeta
git add backend/src/services/permissionService.js
git commit -m "feat: Add PermissionService for granular permissions"
git push origin feature/phase1-permissions

# Task 1.3: requirePermission middleware
# ... arbeta
git add backend/src/middleware/requirePermission.js
git commit -m "feat: Add requirePermission middleware"
git push origin feature/phase1-permissions

# ... fortsätt för alla tasks i PHASE 1

# === STEG 4: Testing ===
npm test
npm run lint
# Manuell testing av alla features

# === STEG 5: Final Commit ===
git add .
git commit -m "feat: Complete PHASE 1 - Permission System

Implements full permission-based authorization system:
- Permission tables (permissions, role_permissions)
- PermissionService for permission checks
- requirePermission middleware
- Audit logging
- JWT blacklist for logout
- Frontend RoleContext and ProtectedRoute

See .claude/PHASE1_COMPATIBILITY_ANALYSIS.md for details.

All tests passing ✅
Backward compatible ✅"

git push origin feature/phase1-permissions

# === STEG 6: Pull Request ===
# GitHub: Create PR
# Titel: "PHASE 1: Permission System Implementation"
# Beskrivning: Länka till .claude/PHASE1_COMPATIBILITY_ANALYSIS.md
# Assign reviewers (om team)

# === STEG 7: Merge ===
# GitHub: Merge PR efter godkännande

# === STEG 8: Cleanup ===
git checkout main
git pull origin main
git branch -d feature/phase1-permissions

# === STEG 9: Börja PHASE 2 ===
git checkout -b feature/phase2-restaurants
# ... repeat process
```

---

## 📋 Pre-Commit Checklist

**Innan varje commit, kontrollera:**

- [ ] Koden fungerar (testad lokalt)
- [ ] Inga console.log() kvar (om inte avsiktliga)
- [ ] Inga `// TODO` utan biljett/issue
- [ ] Ingen kommenterad-ut kod
- [ ] Inga secrets (.env, API keys, passwords)
- [ ] ESLint errors fixade (`npm run lint`)
- [ ] Tydlig commit message
- [ ] Commit är focused (inte mixed changes)

---

## 📋 Pre-Merge Checklist

**Innan merge till main, kontrollera:**

- [ ] Alla tasks i PHASE komplett
- [ ] All kod testad
- [ ] ESLint clean (`npm run lint`)
- [ ] Tests passar (`npm test`)
- [ ] Dokumentation uppdaterad
- [ ] README uppdaterad (om behövs)
- [ ] .env.example uppdaterad (om nya env vars)
- [ ] No merge conflicts med main
- [ ] Code reviewed (om team)

---

## 🚨 Om Något Går Fel

### **Scenario 1: Merge conflict**

```bash
git checkout feature/my-branch
git merge main

# CONFLICT in file.js
# Fix conflicts manually i file.js
git add file.js
git commit -m "fix: Resolve merge conflict with main"
git push origin feature/my-branch
```

---

### **Scenario 2: Committat till fel branch**

```bash
# Upptäcker: "Jag är på main, skulle varit på feature branch!"

# Lösning 1: Flytta commit till ny branch (om inte pushat än)
git branch feature/my-feature        # Skapa branch med current changes
git reset --hard HEAD~1              # Undo commit på main
git checkout feature/my-feature      # Byt till nya branch

# Lösning 2: Om redan pushat till main
# Revertera på main
git revert HEAD
git push origin main

# Cherry-pick till rätt branch
git checkout feature/my-feature
git cherry-pick <commit-hash>
git push origin feature/my-feature
```

---

### **Scenario 3: Behöver undo senaste commit**

```bash
# Om inte pushat än:
git reset --soft HEAD~1              # Undo commit, behåll ändringar
# Eller
git reset --hard HEAD~1              # Undo commit, discard ändringar

# Om redan pushat:
git revert HEAD                      # Skapa ny commit som undor
git push origin branch-name
```

---

### **Scenario 4: Feature branch är trasig, vill börja om**

```bash
# Backup current work (optional)
git stash

# Delete branch och börja om från main
git checkout main
git branch -D feature/broken-branch
git checkout -b feature/broken-branch-v2

# Om du vill ha något från gamla branchen:
git cherry-pick <commit-hash-from-old-branch>
```

---

## 📊 Git History Exempel (Bra)

```bash
git log --oneline --graph

# ✅ GOOD HISTORY
* 9885f70 (HEAD -> main, origin/main) docs: Update SESSION_STATUS with complete documentation
* 16379ce feat: Add PHASE 6 (Redis) and full compatibility analysis
* b2450b2 feat: Improve PHASE 1 with permission system approach
* 0352d70 fix: Add delivered status to getCourierOrders for courier history
* dd18f57 feat: Add history views with time grouping in restaurant and courier views
* 20efe31 fix: Customer notes styling and courier view 400 error
```

**Varför bra:**
- ✅ Tydliga commit messages
- ✅ Logisk ordning
- ✅ Enkelt att förstå vad som ändrats
- ✅ Enkelt att revertera specifik change

---

## 🎯 Sammanfattning: Viktigaste Reglerna

### **Top 10 Git Rules:**

1. **ALDRIG commit direkt till main** - Använd alltid branches
2. **ALDRIG force push till main** - main är skyddad
3. **Commit ofta** - Minst dagligen
4. **Tydliga commit messages** - Följ convention
5. **Test innan merge** - main ska alltid fungera
6. **Branch naming** - Följ convention (feature/, bugfix/, etc.)
7. **Delete branches efter merge** - Håll repo rent
8. **Pull main regelbundet** - Håll din branch uppdaterad
9. **ALDRIG commit secrets** - .env, credentials, etc.
10. **Code review** - PR innan merge (om team)

---

## 📚 Resources

**Git Dokumentation:**
- https://git-scm.com/doc
- https://github.com/git-guides

**Branch Strategy:**
- Git Flow: https://nvie.com/posts/a-successful-git-branching-model/
- GitHub Flow: https://guides.github.com/introduction/flow/

**Commit Conventions:**
- Conventional Commits: https://www.conventionalcommits.org/

---

## ✅ Acceptance

**Jag (utvecklare) förstår och accepterar att följa dessa regler.**

**Claude förstår och kommer följa dessa regler vid alla git-operationer.**

**Datum:** 2025-11-24

---

**Detta dokument är vårat kontrakt för hur vi arbetar med Git! 🤝**
