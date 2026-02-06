# Enhancement Orchestration: [CYCLE_TITLE]

| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD |
| **Cycle** | #N |
| **Status** | Draft / Approved / In Progress / Completed |
| **Orchestration Agent** | Claude Code (main context) |

---

## 1. Research Findings

### Power BI & Microsoft Fabric Trends
- [Trend 1]: [Description and relevance to this tool]
- [Trend 2]: [Description and relevance to this tool]
- [Trend 3]: [Description and relevance to this tool]

### User-Facing Opportunities
- [Opportunity derived from trends or community feedback]

### Technical Opportunities
- [Opportunity derived from codebase analysis or ROADMAP.md items]

---

## 2. Enhancement Plan

### Category A: Frontend Design

#### Task {N}-1: [Title]

| Field | Value |
|-------|-------|
| **ID** | {N}-1 |
| **Agent Role** | UI Agent |
| **Branch** | `task-{N}-1/short-description` |
| **Complexity** | Low / Medium / High |
| **Dependencies** | None |
| **GitHub Issue** | _#TBD_ |

**Description:**
[Detailed description of what needs to be done. 2-4 paragraphs providing enough context for a sub-agent to work independently.]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] No console errors in Chrome/Edge DevTools
- [ ] Existing functionality not broken (manual smoke test)

**Files Likely Affected:**
- `styles.css` - [what changes]
- `index.html` - [what changes]

---

### Category B: Features

#### Task {N}-2: [Title]

| Field | Value |
|-------|-------|
| **ID** | {N}-2 |
| **Agent Role** | Feature Agent |
| **Branch** | `task-{N}-2/short-description` |
| **Complexity** | Low / Medium / High |
| **Dependencies** | None |
| **GitHub Issue** | _#TBD_ |

**Description:**
[Detailed description]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion]
- [ ] No console errors in Chrome/Edge DevTools
- [ ] Existing functionality not broken

**Files Likely Affected:**
- `app.js` - [what changes]
- `analyzer.js` - [what changes]

---

### Category C: Other (Testing / CI/CD / Documentation)

#### Task {N}-3: [Title]

| Field | Value |
|-------|-------|
| **ID** | {N}-3 |
| **Agent Role** | DevOps Agent |
| **Branch** | `task-{N}-3/short-description` |
| **Complexity** | Low / Medium / High |
| **Dependencies** | None |
| **GitHub Issue** | _#TBD_ |

**Description:**
[Detailed description]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion]

**Files Likely Affected:**
- [files]

---

## 3. Agent Role Definitions

### UI Agent
- **Scope**: HTML structure, CSS styling, responsive design, accessibility, visual polish
- **Constraints**: Must use CSS custom properties from `:root`. No inline styles in HTML. No JavaScript logic changes unless directly tied to a UI interaction.
- **Testing**: Visual inspection in Chrome/Edge at desktop and mobile widths.

### Feature Agent
- **Scope**: JavaScript business logic, new parsers, analyzer enhancements, new tab features, export capabilities
- **Constraints**: Zero new dependencies. All new JS must follow the existing class pattern (or global function pattern in app.js). Must integrate with existing global state.
- **Testing**: Load a PBIP folder and verify the feature works across all tabs without breaking existing functionality.

### DevOps Agent
- **Scope**: GitHub Actions CI/CD, automated testing setup, documentation improvements
- **Constraints**: Testing framework must work without npm if possible (or document npm as dev-only). CI must validate that the app still works as static HTML.
- **Testing**: CI pipeline passes. Documentation renders correctly.

---

## 4. Execution Instructions

### Starting a Task

Open a new Claude Code context in the repo root (`d:\pbip-impact-analyzer`) and say:

> Start task {N}-X as [Agent Role] per the orchestration doc at docs/orchestration/YYYY-MM-DD-enhancement.md

The sub-agent will:
1. Read `CLAUDE.md` (loaded automatically)
2. Read this orchestration document
3. Create a worktree: `git worktree add ../worktrees/task-{N}-X-description task-{N}-X/description`
4. Work in the worktree directory
5. Make commits with descriptive messages
6. Create a PR: `gh pr create --title "[Task {N}-X] Title" --body "Closes #issue"`
7. Report completion

### Task Execution Order

Execute tasks respecting dependencies. Independent tasks can run in parallel in separate contexts.

1. **Independent (can start immediately):** [List tasks with no dependencies]
2. **Depends on group 1:** [List tasks that require group 1 to be merged first]

---

## 5. Change Log

| Date | Action | Actor |
|------|--------|-------|
| YYYY-MM-DD | Orchestration doc created | Orchestrate Agent |
| YYYY-MM-DD | Plan approved by user | User |
| YYYY-MM-DD | GitHub Issues created | Orchestrate Agent |
