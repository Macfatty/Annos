# Claude Code Preferences for This Project

## Communication Style

### Decision Making
- **ONE CLEAR PATH**: Always provide a single, direct solution
- **NO MULTIPLE OPTIONS**: Don't present 2-3 different approaches
- **PROJECT-SPECIFIC**: Choose the option that best suits this project and user's setup
- **BE DECISIVE**: Analyze the context and make the best choice automatically

### Example
❌ BAD: "You can do X or Y, which would you prefer?"
✅ GOOD: "Run this command: [specific command for this project]"

## Project Context
- Working on Linux/WSL2 environment
- PostgreSQL 16.10 installed
- Node.js v20.19.5 / npm 10.8.2
- Requires sudo for system installations
- Database name: annos_dev

## User Background
- New to coding, DevOps background
- Pursuing DevOps Engineering exam
- Building Annos food delivery app with AI assistance
- Prefers explanations in simple terms

## Tech Stack
- Frontend: React 19 + Vite (port 5173)
- Backend: Node.js + Express (port 3001)
- Database: PostgreSQL
- Authentication: JWT tokens

## Code Quality & Workflow
- **Frontend has ESLint:** Must run `npm run lint` after editing frontend code
- **Backend has NO ESLint:** Follow existing code style, run `npm test` after changes
- **GitHub Actions CI:** Runs lint (frontend) and tests (backend) on every push
- **Before suggesting commits:** Always verify lint passes and tests pass
- **See:** `.claude/lint-workflow.md` for detailed workflow
