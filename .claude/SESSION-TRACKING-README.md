# Claude Session Tracking System

**Purpose:** Track Claude session usage, estimate remaining time, and maintain context between sessions.

---

## 📁 Files in This System

### 1. `session-status.md` (Main Dashboard)
**Primary file to check at session start.**

Contains:
- Visual progress bar for token usage
- Estimated time remaining
- Session timeline with major events
- Token usage statistics
- List of accomplishments
- Files created/modified
- Git commits
- Recommendations for next session
- Context notes for continuation

**How to use:**
```bash
# Quick view in terminal
cat .claude/session-status.md

# Or open in VS Code
code .claude/session-status.md
```

### 2. `session-tracker.json` (Data Storage)
**Machine-readable session data.**

Contains:
- Session start time
- Token budget and usage
- Last update timestamp
- Conversation statistics
- Major tasks completed
- Files affected
- Commits created

**How to use:**
```bash
# View raw data
cat .claude/session-tracker.json

# Pretty print with jq
jq . .claude/session-tracker.json
```

### 3. `update-session.sh` (Update Script)
**Script to update session timestamp.**

**How to use:**
```bash
# Run from project root
./.claude/update-session.sh

# Or from anywhere
cd /path/to/Annos && ./.claude/update-session.sh
```

**Output:**
```
✅ Session tracker updated: 2025-11-22T17:00:00Z

📊 Current Session Status:
─────────────────────────────────────────
Tokens Used:      97,000 / 200,000
Tokens Remaining: 103,000
Usage:            48.5%
─────────────────────────────────────────

💡 Tip: Read .claude/session-status.md for detailed session info
```

---

## 🚀 Quick Start Guide

### At Session Start

**1. Check session status:**
```bash
cat .claude/session-status.md
```

**2. Review:**
- Token usage percentage
- Estimated time remaining
- Recent accomplishments
- Notes for next session
- Pending tasks

**3. Plan your work:**
- High priority tasks if < 30% tokens left
- Medium tasks if 30-60% tokens left
- Can tackle large tasks if > 60% tokens left

### During Session

**Update periodically (optional):**
```bash
./.claude/update-session.sh
```

### At Session End

**Claude will auto-update both files with:**
- Final token count
- Session summary
- Tasks completed
- Files changed
- Notes for next session

---

## 📊 Understanding Token Usage

### Token Budget
- **Total:** 200,000 tokens per session
- **1 token ≈** 4 characters of text
- **Average message:** 500-2,000 tokens

### Usage Estimates

| Activity | Tokens | Example |
|----------|--------|---------|
| Simple question/answer | 500-1,000 | "How do I fix this error?" |
| Code review | 2,000-5,000 | Review a single file |
| Feature implementation | 10,000-25,000 | Create new service with tests |
| Large refactoring | 30,000-50,000 | Migrate architecture pattern |
| Comprehensive documentation | 15,000-30,000 | API standards document |

### Token Consumption Rates

| Work Intensity | Tokens/Min | Time to Exhaust 100k Tokens |
|----------------|------------|-----------------------------|
| Light (bug fixes, small edits) | ~600 | ~166 minutes (~2h 46min) |
| Medium (features, refactoring) | ~1,200 | ~83 minutes (~1h 23min) |
| Heavy (migrations, complex docs) | ~2,000 | ~50 minutes (~50min) |

---

## 🎯 Session Planning Strategies

### High Token Budget (150k+ remaining)

**Best for:**
- Large architectural changes
- Comprehensive documentation
- Complex feature implementation
- Multi-file refactoring
- Deep debugging sessions

**Example work:**
- Migrate entire authentication system
- Create comprehensive API documentation
- Refactor service layer across 10+ files

### Medium Token Budget (75k-150k remaining)

**Best for:**
- Single feature implementation
- Moderate refactoring
- Bug investigation and fix
- Code review and improvements
- Standard documentation

**Example work:**
- Add new service with 3-5 methods
- Fix complex multi-file bug
- Create feature documentation

### Low Token Budget (< 75k remaining)

**Best for:**
- Bug fixes (single file)
- Small features
- Quick improvements
- Testing existing code
- Planning next session

**Example work:**
- Fix 1-2 line bugs
- Add validation to form
- Write test cases
- Document findings for next session

### Critical Budget (< 30k remaining)

**Focus on:**
- Testing changes already made
- Committing work
- Documenting next steps
- Closing out current work
- Avoiding new large tasks

---

## 📈 Session Metrics

### Efficiency Indicators

**Good session efficiency:**
- Clear accomplishments per token spent
- Multiple commits with meaningful changes
- Documentation created
- Tests passing
- No unfinished work

**Example (this session):**
- 94k tokens → 3 commits, 13 files created, 3 major bugs fixed
- Efficiency: ~31k tokens per commit
- Value: High (fixed critical bugs, created standards)

**Poor session efficiency:**
- Many tokens spent without clear output
- Stuck on single issue
- No commits created
- Unfinished refactoring

### Quality Metrics

**High quality indicators:**
- Problems solved at root cause
- Documentation created
- Standards established
- Tests written/passing
- Clean commits with clear messages

**This session quality:**
- ✅ Root cause analysis (not quick fixes)
- ✅ Comprehensive documentation (5,000+ lines)
- ✅ Standards for future (api-response-standards.md)
- ✅ Clean git history (3 meaningful commits)

---

## 🔄 Session Continuity

### Before Ending Session

**Claude should:**
1. Update `session-status.md` with final stats
2. Update `session-tracker.json` with final counts
3. List pending tasks in "Notes for Next Session"
4. Summarize what was accomplished
5. Recommend next steps

### Starting New Session

**You should:**
1. Read `session-status.md` first
2. Review "Notes for Next Session" section
3. Check pending tasks
4. Verify git status matches expected state
5. Plan work based on remaining tokens

### Resuming After Break

**If continuing same conversation:**
- Session data persists
- Token count continues from last
- Context maintained

**If starting fresh conversation:**
- Reference `session-status.md` for context
- Mention specific files/commits to restore context
- Claude can read session files to catch up

---

## 🛠️ Customization

### Update Token Counts Manually

Edit `session-tracker.json`:
```json
{
  "tokensUsed": 100000,  // Update this
  "tokensRemaining": 100000,  // Update this
  "lastUpdated": "2025-11-22T17:00:00Z"  // Update this
}
```

Then regenerate `session-status.md`:
```bash
# Ask Claude to:
"Update session-status.md based on current session-tracker.json"
```

### Add Custom Metrics

Edit `session-tracker.json` to add:
```json
{
  "customMetrics": {
    "bugsFixed": 3,
    "testsWritten": 12,
    "linesOfCodeAdded": 450,
    "linesOfCodeRemoved": 200
  }
}
```

---

## 📋 Quick Reference Commands

```bash
# View session status (recommended)
cat .claude/session-status.md | less

# View session data
jq . .claude/session-tracker.json

# Update timestamp
./.claude/update-session.sh

# Check token usage percentage
jq -r '(.tokensUsed / .tokenBudget * 100 | floor)' .claude/session-tracker.json

# Estimate time remaining (based on avg rate)
# Manually calculate: (tokensRemaining / avgTokensPerMin)

# View session start time
jq -r '.sessionStartTime' .claude/session-tracker.json

# List major tasks
jq -r '.majorTasks[]' .claude/session-tracker.json
```

---

## 🎓 Tips for Effective Sessions

### 1. Front-Load Complex Work
- Start with heavy tasks when token budget is high
- Save simple tasks (testing, commits) for end

### 2. Batch Similar Tasks
- Review multiple files at once
- Make related changes together
- Reduces context-switching overhead

### 3. Document as You Go
- Create notes during work
- Easier than recreating later
- Helps with session continuity

### 4. Commit Frequently
- Don't wait until end of session
- Smaller commits easier to understand
- Reduces risk of losing work

### 5. Monitor Token Usage
- Check status every 30-45 minutes
- Adjust work intensity accordingly
- Save 20k tokens for closing tasks

### 6. Plan Next Session
- Last 15 minutes: document next steps
- List pending tasks clearly
- Note any blockers or questions

---

## ❓ FAQ

**Q: How accurate are the time estimates?**
A: Estimates are based on recent usage patterns. Actual time varies based on task complexity.

**Q: What happens if I run out of tokens mid-task?**
A: Claude will notify you and try to finish critical work (commit, document state).

**Q: Can I manually reset the session?**
A: Yes, edit `session-tracker.json` and reset `tokensUsed` to 0.

**Q: Does this track across different Claude conversations?**
A: No, each conversation has its own token budget. These files help you track within a single conversation thread.

**Q: What if session-status.md shows wrong data?**
A: Update `session-tracker.json` manually, then ask Claude to regenerate the markdown file.

---

## 🔗 Related Documentation

- [Working Principles](./working-principles.md) - Development guidelines
- [API Response Standards](./api-response-standards.md) - API communication patterns
- [API Architecture](./api-architecture.md) - Overall system design

---

**Last Updated:** 2025-11-22
**Version:** 1.0
**Maintained by:** Claude (with user updates)
