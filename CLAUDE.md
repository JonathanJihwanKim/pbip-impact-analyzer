# CLAUDE.md - Project Instructions for AI Agents

## Project Overview

PBIP Impact Analyzer is a browser-based tool for Power BI developers to safely refactor Power BI semantic models. It provides impact analysis, dependency lineage visualization, and safe refactoring of PBIP (Power BI Project) folders.

- **Hosting**: GitHub Pages at https://jonathanjihwankim.github.io/pbip-impact-analyzer/
- **Repository**: https://github.com/JonathanJihwanKim/pbip-impact-analyzer
- **License**: MIT

## Hard Constraints

- **Vanilla JS only**: No frameworks (React, Vue, etc.), no TypeScript, no transpilers
- **No build tools**: No npm, no package.json, no webpack, no bundlers
- **No new CDN dependencies** without explicit approval (html2canvas is the only existing CDN library)
- **Single HTML entry**: `index.html` loads all JS via `<script>` tags and CSS via `<link>`
- **Chromium-only**: Requires File System Access API (Chrome 86+, Edge 86+, Opera 72+)
- **No server**: Entire app runs client-side in the browser

## File Structure and Module Responsibilities

| File | Class/Pattern | Responsibility |
|------|---------------|----------------|
| `index.html` | HTML structure | Tab layout, forms, result containers, script loading order |
| `src/app.js` | Global functions + `init()` | App orchestration, UI event handlers, DOM manipulation |
| `src/analyzer.js` | `class DependencyAnalyzer` | Dependency graph building, impact analysis (upstream/downstream) |
| `src/parsers.js` | `class TMDLParser` (static methods) | TMDL file parsing, DAX extraction, JSON report parsing |
| `src/fileAccess.js` | `class FileAccessManager` | File System Access API wrapper, folder traversal, file read/write |
| `src/refactor.js` | `class RefactoringEngine` | Rename preview, diff generation, apply with backup/rollback |
| `src/graph.js` | `class GraphVisualizer` | SVG-based horizontal lineage diagram, PNG export |
| `src/sessionManager.js` | `class SessionManager` | Session persistence, recent analyses, favorites |
| `src/styles.css` | CSS custom properties | All styling, Microsoft Fluent-inspired design system |

## Architecture Notes

- **Script load order** in `index.html`: `src/fileAccess.js` → `src/parsers.js` → `src/analyzer.js` → `src/refactor.js` → `src/graph.js` → `src/sessionManager.js` → `src/app.js` (plus `html2canvas` from CDN before all scripts)
- **No module system**: All scripts share the global scope (no import/export)
- **Global state** in `src/app.js`: `fileAccessManager`, `dependencyAnalyzer`, `refactoringEngine`, `graphVisualizer`, `parsedData`
- **Classes instantiated** in `src/app.js` `init()` function
- **UI is tab-based**: Impact Analysis, Lineage, Safe Refactoring

## CSS Design System

All colors use CSS custom properties defined in `:root` in `src/styles.css`. New CSS must use these variables — never hardcode colors.

```css
--primary-color: #0078d4;    --primary-hover: #106ebe;
--success-color: #107c10;    --success-hover: #0e6b0e;
--danger-color: #d13438;     --warning-color: #ffb900;
--bg-color: #f5f5f5;         --surface-color: #ffffff;
--border-color: #e0e0e0;     --text-primary: #323130;
--text-secondary: #605e5c;
--shadow-sm / --shadow-md / --shadow-lg
--border-radius: 4px;        --transition: all 0.2s ease;
```

Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`)

## Coding Standards

- Use `const` and `let` (never `var`)
- Descriptive function and variable names
- Single responsibility per function
- JSDoc comments on public methods
- Error handling via try/catch with user-facing error messages
- No inline styles in HTML (dynamically created elements in JS are acceptable)

## Testing Protocol

No automated test suite exists yet. Manual testing:
1. Open `index.html` in Chrome or Edge
2. Click "Select PBIP Folder" and load a Power BI Project folder
3. Test all three tabs: Impact Analysis, Lineage, Safe Refactoring
4. Verify no console errors in browser DevTools

---

## Orchestration Workflow

This project uses an agentic orchestration system with Claude Code. Enhancement work follows a two-phase process.

### Phase 1: Orchestration (Main Context)

The orchestrate-agent runs in the main Claude Code context:

1. Analyze the current state of the application
2. Research Power BI / Microsoft Fabric trends for enhancement opportunities
3. Create an orchestration document at `docs/orchestration/YYYY-MM-DD-enhancement.md` using `docs/orchestration/template.md`
4. Categorize work into: Frontend Design, Features, Other (testing/CI/CD/docs)
5. Assign each task to a named sub-agent role
6. Commit the orchestration doc to `main` and present the plan to the user
7. On approval, create GitHub Issues for each task using `gh` CLI
8. Update the orchestration doc with issue numbers and commit again

### Phase 2: Execution (Separate Contexts)

Each sub-agent runs in its own Claude Code context:

1. Read the orchestration document from `docs/orchestration/`
2. Create a git worktree: `git worktree add ../worktrees/task-{cycle}-{seq}-description task-{cycle}-{seq}/description`
3. Work exclusively within that worktree
4. Create a PR using `gh pr create` linking to the GitHub Issue
5. After the user reviews and merges the PR, clean up the worktree

### Git Worktree Conventions

- **Location**: `../worktrees/` (one level up from repo root, outside the repo)
- **Worktree naming**: `task-{cycle}-{seq}-short-description` (e.g., `task-1-3-dark-mode`)
- **Branch naming**: `task-{cycle}-{seq}/short-description` (e.g., `task-1-3/dark-mode`)
- Each worktree is independent — never cross-modify between worktrees
- Clean up after merge: `git worktree remove ../worktrees/task-{cycle}-{seq}-description`

### PR Conventions

- **Title**: `[Task {cycle}-{seq}] Short description`
- **Body must include**:
  - Link to orchestration doc (`docs/orchestration/YYYY-MM-DD-enhancement.md`)
  - Link to GitHub Issue (`Closes #{number}`)
  - Summary of changes
  - Testing checklist (from `.github/pull_request_template.md`)
- All PRs target `main` branch
- PRs require user review before merge

### Sub-Agent Roles

| Role | Responsibilities |
|------|------------------|
| **UI Agent** | Frontend design, CSS, HTML structure, responsive layout, accessibility |
| **Feature Agent** | New features, JS logic, parsers, analyzers, business logic |
| **DevOps Agent** | Testing, CI/CD, GitHub Actions, documentation |

### Conflict Resolution

If a sub-agent's branch has diverged from `main`:
1. Fetch latest main: `git fetch origin main`
2. Rebase: `git rebase origin/main`
3. Resolve trivial conflicts (non-overlapping changes)
4. For complex conflicts (same lines in same file), flag in the PR description for user resolution
