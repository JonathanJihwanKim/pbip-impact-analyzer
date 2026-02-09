# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PBIP Impact Analyzer is a browser-based tool for Power BI developers to safely refactor Power BI semantic models. It provides impact analysis, dependency lineage visualization, and safe refactoring of PBIP (Power BI Project) folders.

- **Hosting**: GitHub Pages at https://jonathanjihwankim.github.io/pbip-impact-analyzer/
- **Repository**: https://github.com/JonathanJihwanKim/pbip-impact-analyzer
- **License**: MIT

## Hard Constraints

- **Vanilla JS only**: No frameworks, no TypeScript, no transpilers, no build tools, no npm
- **No new CDN dependencies** without explicit approval (html2canvas is the only existing one)
- **Single HTML entry**: `index.html` loads all JS via `<script>` tags and CSS via `<link>`
- **Chromium-only**: Requires File System Access API (Chrome 86+, Edge 86+, Opera 72+)
- **No server**: Entire app runs client-side in the browser
- **No module system**: All scripts share the global scope (no import/export)

## Development

No build step. Open `index.html` in Chrome or Edge to run. No automated tests exist — manual testing only:

1. Open `index.html` in a Chromium browser
2. Click "Select PBIP Folder" and load a Power BI Project folder
3. Test all three tabs: Impact Analysis, Lineage, Safe Refactoring
4. Verify no console errors in browser DevTools

## Architecture

### Script Load Order (strict — order matters)

`html2canvas` (CDN) → `src/fileAccess.js` → `src/parsers.js` → `src/analyzer.js` → `src/refactor.js` → `src/graph.js` → `src/sessionManager.js` → `src/app.js`

### Data Flow Pipeline

```
User selects folder → FileAccessManager reads PBIP files
  → TMDLParser parses TMDL/JSON into {measures, tables, visuals, relationships, pages}
    → DependencyAnalyzer.buildDependencyGraph() creates node/edge graph
      → analyzeImpact(nodeId) returns upstream/downstream dependencies
        → GraphVisualizer renders SVG lineage diagram
        → RefactoringEngine generates rename previews and diffs
```

### Dependency Graph Node ID Format

Node IDs are string keys in `DependencyAnalyzer.dependencyGraph.nodes`:
- Measures: `Measure.{name}` (e.g., `Measure.Total Sales`)
- Columns: `{tableName}.{columnName}` (e.g., `Sales.Amount`)
- Tables: `Table.{tableName}` (e.g., `Table.Sales`)
- Visuals: `{pageId}/{visualId}` (e.g., `page1/visual3`)
- Calculation items: `CalcItem.{groupName}.{itemName}`
- Field parameters: `FieldParam.{tableName}.{columnName}`

### Global State (in `src/app.js`)

Five globals instantiated in `init()`, invoked on `DOMContentLoaded`:
- `fileAccessManager` — `FileAccessManager` instance
- `dependencyAnalyzer` — `DependencyAnalyzer` instance
- `refactoringEngine` — `RefactoringEngine(dependencyAnalyzer, fileAccessManager)`
- `graphVisualizer` — `GraphVisualizer('graphContainer')`
- `sessionManager` — `SessionManager` (uses localStorage with `pbip-impact-analyzer` prefix)
- `parsedData` — raw parsed output passed to `buildDependencyGraph()`

### Module Responsibilities

| File | Class/Pattern | Responsibility |
|------|---------------|----------------|
| `src/fileAccess.js` | `FileAccessManager` | File System Access API wrapper, folder traversal, file read/write |
| `src/parsers.js` | `TMDLParser` (static methods) | TMDL file parsing, DAX extraction, JSON report parsing |
| `src/analyzer.js` | `DependencyAnalyzer` | Dependency graph building, impact analysis (upstream/downstream) |
| `src/refactor.js` | `RefactoringEngine` | Rename preview, diff generation, apply with backup/rollback |
| `src/graph.js` | `GraphVisualizer` | SVG-based horizontal lineage diagram, PNG export via html2canvas |
| `src/sessionManager.js` | `SessionManager` | Session persistence via localStorage (recent analyses, favorites) |
| `src/app.js` | Global functions + `init()` + `SearchableSelect` class | App orchestration, UI event handlers, DOM manipulation |

### UI Structure

Tab-based layout with three tabs (`data-tab` attribute): `impact`, `graph`, `refactor`. Each tab has a sidebar (controls) and main content area. Tab switching via `switchTab()` in `src/app.js`.

## CSS Design System

All colors use CSS custom properties defined in `:root` in `src/styles.css`. Never hardcode colors.

```css
--primary-color: #0078d4;    --primary-hover: #106ebe;
--success-color: #107c10;    --danger-color: #d13438;
--warning-color: #ffb900;    --bg-color: #f5f5f5;
--surface-color: #ffffff;    --border-color: #e0e0e0;
--text-primary: #323130;     --text-secondary: #605e5c;
```

## Coding Standards

- `const`/`let` only (never `var`)
- JSDoc comments on public methods
- No inline styles in HTML (dynamically created elements in JS are acceptable)

---

## Orchestration Workflow

This project uses an agentic orchestration system with Claude Code. Enhancement work follows a two-phase process.

### Phase 1: Orchestration (Main Context)

1. Analyze the current state of the application
2. Research Power BI / Microsoft Fabric trends for enhancement opportunities
3. Create an orchestration document at `docs/orchestration/YYYY-MM-DD-enhancement.md` using `docs/orchestration/template.md`
4. Categorize work into: Frontend Design, Features, Other (testing/CI/CD/docs)
5. Assign each task to a named sub-agent role (UI Agent, Feature Agent, DevOps Agent)
6. Commit the orchestration doc to `main` and present the plan to the user
7. On approval, create GitHub Issues for each task using `gh` CLI

### Phase 2: Execution (Separate Contexts)

Each sub-agent runs in its own Claude Code context:

1. Read the orchestration document from `docs/orchestration/`
2. Create a git worktree: `git worktree add ../worktrees/task-{cycle}-{seq}-description task-{cycle}-{seq}/description`
3. Work exclusively within that worktree
4. Create a PR using `gh pr create` linking to the GitHub Issue
5. After the user reviews and merges the PR, clean up the worktree

### Git Conventions

- **Worktree location**: `../worktrees/` (outside repo root)
- **Worktree naming**: `task-{cycle}-{seq}-short-description`
- **Branch naming**: `task-{cycle}-{seq}/short-description`
- **PR title**: `[Task {cycle}-{seq}] Short description`
- **PR body**: Link orchestration doc, link issue (`Closes #{number}`), summary, testing checklist from `.github/pull_request_template.md`
- All PRs target `main` — require user review before merge

### Sub-Agent Roles

| Role | Responsibilities |
|------|------------------|
| **UI Agent** | Frontend design, CSS, HTML structure, responsive layout, accessibility |
| **Feature Agent** | New features, JS logic, parsers, analyzers, business logic |
| **DevOps Agent** | Testing, CI/CD, GitHub Actions, documentation |

### Conflict Resolution

If a sub-agent's branch has diverged from `main`:
1. `git fetch origin main` then `git rebase origin/main`
2. Resolve trivial conflicts; flag complex conflicts (same lines) in PR description for user resolution
