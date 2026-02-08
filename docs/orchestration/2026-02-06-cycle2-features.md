# Enhancement Orchestration: Cycle 2 - Major Feature Additions

| Field | Value |
|-------|-------|
| **Date** | 2026-02-06 |
| **Cycle** | #2 |
| **Status** | In Progress |
| **Orchestration Agent** | Claude Code (main context) |

---

## 1. Overview

This cycle adds eight capabilities to the PBIP Impact Analyzer:

1. **Batch Operations** - Rename a table and cascade to all columns/references
2. **Delete Analysis** - "What breaks if I remove this measure/column?"
3. **Search & Filter in Results** - Tame large models with real-time filtering
4. **Calculation Groups & Field Parameters** - Enterprise model support
5. **Session Persistence** - Remember recent analyses, favorites, and settings
6. **GitHub Sponsors + "Support this project" link** - Monetization foundation
7. **Sponsor Bar in Footer** - Config-driven sponsor logo display
8. **Visual Upstream Analysis** - "What's in this visual?" feature

These features directly address the top gaps identified in the codebase review, transforming the tool from a single-object rename utility into a comprehensive refactoring workbench.

---

## 2. Enhancement Plan

### Category B: Features

---

#### Task 2-1: Batch Operations - Table Rename with Cascade

| Field | Value |
|-------|-------|
| **ID** | 2-1 |
| **Agent Role** | Feature Agent |
| **Branch** | `task-2-1/batch-operations` |
| **Complexity** | High |
| **Dependencies** | None |
| **GitHub Issue** | #28 |

**Description:**

Add the ability to rename a **table** and automatically cascade the rename to all column references, measure DAX, visual JSON, and relationship definitions. This is the most requested batch operation — currently users must manually track every `TableName[Column]` reference across the model.

**Implementation Details:**

1. **Add "Table" to the refactor type selector** (`index.html` + `src/app.js`):
   - Add `<option value="table">Table</option>` to `#refactorTypeSelect`
   - In `populateRefactorObjectSelect()`, when type is `table`, populate with table names from `parsedData.tables`
   - When a table is selected, show the new name input as usual

2. **Add `previewTableRename(oldTableName, newTableName)` to `RefactoringEngine`** (`src/refactor.js`):
   - **Table definition file rename**: The TMDL file itself is named `{TableName}.tmdl`. Generate a change to rename the file AND update the `table 'OldName'` declaration inside it.
   - **Column reference updates in DAX**: For every measure that references `OldTable[Column]` or `'Old Table'[Column]`, replace with `NewTable[Column]` or `'New Table'[Column]`. Use the existing `replaceColumnInDAX()` pattern but replace the table name portion only.
   - **Visual JSON updates**: In visual.json files, the `SourceRef.Entity` field contains the table name. Generate changes for every visual that references any column from this table.
   - **Relationship updates**: In `relationships.tmdl`, the `fromColumn: TableName.Column` and `toColumn: TableName.Column` lines contain the table name.
   - **Table-only DAX references**: Functions like `COUNTROWS(OldTable)`, `ALL(OldTable)`, etc. need the table name replaced.

3. **DAX table name replacement helper** (`src/refactor.js`):
   - Add `replaceTableNameInDAX(dax, oldTableName, newTableName)` that handles:
     - `OldTable[Column]` → `NewTable[Column]` (unquoted)
     - `'Old Table'[Column]` → `'New Table'[Column]` (quoted)
     - `COUNTROWS(OldTable)` → `COUNTROWS(NewTable)` (function args, all 25+ table functions)
     - `COUNTROWS('Old Table')` → `COUNTROWS('New Table')` (quoted function args)
   - Must be case-insensitive (DAX is case-insensitive)
   - Must handle table names with spaces (auto-quote if new name has spaces)

4. **File rename support** (`src/refactor.js` + `src/fileAccess.js`):
   - The File System Access API doesn't support direct file rename. Implement as:
     1. Read old file content
     2. Create new file with new name via `getDirectoryHandle().getFileHandle(newName, { create: true })`
     3. Write content to new file
     4. Delete old file via `getDirectoryHandle().removeEntry(oldName)`
   - Add `renameFile(parentDirHandle, oldName, newName)` to `FileAccessManager`
   - This is the trickiest part — test carefully and ensure backup/rollback covers file renames

5. **Update `applyChanges()` flow** (`src/refactor.js`):
   - Existing flow handles content replacement. Add a new change type `file-rename` that triggers the file rename logic.
   - Backup must store the old filename so rollback can undo the rename.

**Acceptance Criteria:**
- [ ] Can select "Table" in refactor type dropdown and see all table names
- [ ] Preview shows all files that will change (TMDL file rename, DAX in measures, visual JSONs, relationships)
- [ ] Applying changes renames the `.tmdl` file, updates all DAX references, visual Entity refs, and relationship refs
- [ ] Rollback correctly undoes file rename + content changes on failure
- [ ] Table names with spaces are handled correctly (auto-quoting in DAX)
- [ ] No console errors in Chrome/Edge DevTools
- [ ] Existing measure and column rename still works unchanged

**Files Likely Affected:**
- `src/refactor.js` - New `previewTableRename()`, `replaceTableNameInDAX()`, file rename change type
- `src/fileAccess.js` - New `renameFile()` helper
- `src/app.js` - Updated `populateRefactorObjectSelect()`, table option handling
- `index.html` - Add table option to `#refactorTypeSelect`
- `src/styles.css` - Possibly new styling for file-rename change items in preview

---

#### Task 2-2: Delete Analysis

| Field | Value |
|-------|-------|
| **ID** | 2-2 |
| **Agent Role** | Feature Agent |
| **Branch** | `task-2-2/delete-analysis` |
| **Complexity** | Medium |
| **Dependencies** | None |
| **GitHub Issue** | #29 |

**Description:**

Add a "Delete Analysis" mode to the Impact Analysis tab. When a user selects a measure, column, or table, they should be able to see exactly what would break if that object were removed. This is different from rename impact — delete impact means ALL downstream references become broken.

**Implementation Details:**

1. **Add operation selector to Impact Analysis sidebar** (`index.html` + `src/app.js`):
   - Add a toggle or radio group below the object selector:
     ```
     Operation: [Rename Impact] [Delete Impact]
     ```
   - Both operations use the same object type/object selectors.
   - The Analyze button label could update: "Analyze Rename Impact" vs "Analyze Delete Impact"

2. **Add `analyzeDelete(nodeId)` to `DependencyAnalyzer`** (`src/analyzer.js`):
   - Reuse `findAllDownstream(nodeId)` to get the full impact chain.
   - For each downstream node, classify the breakage severity:
     - **Direct break** (depth 1): This measure's DAX directly references the deleted object. It will error.
     - **Cascade break** (depth 2+): This measure references a depth-1 broken measure. It will also error because its dependency broke.
     - **Visual break**: This visual uses the deleted object (or a cascade-broken measure). It will show an error in the report.
     - **Relationship break** (columns only): If the column participates in a relationship, that relationship breaks.
   - Return a structured result:
     ```js
     {
       operation: 'delete',
       targetNode: nodeId,
       riskLevel: 'safe' | 'caution' | 'dangerous',
       directBreaks: { measures: [...], visuals: [...], relationships: [...] },
       cascadeBreaks: { measures: [...], visuals: [...] },
       safeMessage: 'No objects depend on this measure — safe to delete.'
     }
     ```
   - **Risk scoring**:
     - `safe`: 0 downstream dependents
     - `caution`: 1-5 downstream dependents
     - `dangerous`: 6+ downstream dependents OR any relationship breaks

3. **Display delete analysis results** (`src/app.js`):
   - Reuse the existing `impactResults` container but with different styling.
   - Show a prominent risk badge: green "Safe to Delete", yellow "Caution", red "Dangerous".
   - For `dangerous`, show a summary like: "Deleting [Measure X] will break 12 measures, 8 visuals, and 2 relationships."
   - List direct breaks first (these are the immediate failures), then cascade breaks.
   - For each broken measure, show its DAX with the broken reference highlighted (wrap `[DeletedMeasure]` in a `<span class="broken-ref">` with red styling).

4. **Update CSV export** (`src/app.js`):
   - When exporting delete analysis, include a "Break Type" column: "Direct", "Cascade", "Relationship".

**Acceptance Criteria:**
- [ ] Can toggle between "Rename Impact" and "Delete Impact" in the sidebar
- [ ] Delete analysis shows risk level badge (safe/caution/dangerous)
- [ ] Direct breaks are distinguished from cascade breaks in the results
- [ ] Relationship breaks shown for columns involved in relationships
- [ ] "Safe to delete" message when no dependents exist
- [ ] CSV export includes break type classification
- [ ] No console errors in Chrome/Edge DevTools
- [ ] Existing rename impact analysis works unchanged

**Files Likely Affected:**
- `src/analyzer.js` - New `analyzeDelete()` method with risk scoring
- `src/app.js` - Operation toggle UI, new `displayDeleteResults()`, updated CSV export
- `index.html` - Operation toggle radio buttons in impact analysis sidebar
- `src/styles.css` - Risk badge styles, broken-ref highlighting, operation toggle styles

---

#### Task 2-3: Search and Filter in Results

| Field | Value |
|-------|-------|
| **ID** | 2-3 |
| **Agent Role** | UI Agent |
| **Branch** | `task-2-3/search-filter` |
| **Complexity** | Medium |
| **Dependencies** | None |
| **GitHub Issue** | #30 (also addresses existing #19) |

**Description:**

Add search and filtering capabilities throughout the app. Large models (500+ measures, 1000+ columns) produce overwhelming results. Users need to quickly find specific dependencies and filter noise.

**Implementation Details:**

1. **Search in object selection dropdowns** (`src/app.js` + `index.html`):
   - Replace the native `<select>` dropdowns for object selection with a custom searchable dropdown component.
   - Build a reusable `SearchableSelect` class (or global function pattern matching existing code):
     - Text input that filters options as the user types
     - Dropdown list shows matching options (case-insensitive substring match)
     - Keyboard navigation (arrow keys + Enter to select)
     - Shows "X results matching 'query'" count
     - Falls back gracefully if JS fails (native select still works)
   - Apply to: `#objectSelect` (impact), `#refactorObjectSelect` (refactor)
   - This directly addresses GitHub issue #19.

2. **Search bar in impact analysis results** (`src/app.js` + `index.html`):
   - Add a search input above the impact split view:
     ```html
     <div class="results-filter-bar">
       <input type="text" id="impactSearchInput" placeholder="Filter results..." />
       <div class="filter-chips">
         <label><input type="checkbox" checked data-filter="measure"> Measures</label>
         <label><input type="checkbox" checked data-filter="column"> Columns</label>
         <label><input type="checkbox" checked data-filter="table"> Tables</label>
         <label><input type="checkbox" checked data-filter="visual"> Visuals</label>
       </div>
     </div>
     ```
   - Filtering logic:
     - Text search: Hide any `.dependency-item` whose name doesn't contain the search text (case-insensitive)
     - Type filter: Toggle visibility of entire sections (tables, columns, measures, visuals)
     - Update section counts to show "X of Y" when filtering
     - Real-time filtering via `input` event (no debounce needed for DOM filtering)

3. **Depth filter** (`src/app.js` + `index.html`):
   - Add a depth slider or dropdown:
     ```
     Max depth: [1] [2] [3] [All]
     ```
   - When set to depth N, hide all `.dependency-item` elements with `depth > N`.
   - Update counts when depth filter changes.

4. **Filter persistence within session** (`src/app.js`):
   - Store current filter state (search text, type toggles, depth) so they persist when switching tabs and coming back.

5. **Search in lineage view** (`src/graph.js`):
   - Add a simple text filter above the lineage visualization.
   - When text is entered, highlight matching nodes (add a CSS class for glow/border) and dim non-matching ones.

**Acceptance Criteria:**
- [ ] Object dropdowns support type-to-search with real-time filtering
- [ ] Impact results have a search bar that filters items by name
- [ ] Type filter checkboxes toggle visibility of each object type
- [ ] Depth filter limits results to specified depth level
- [ ] Section counts update to "X of Y" format when filtered
- [ ] Lineage view highlights matching nodes when searching
- [ ] Filters persist when switching tabs
- [ ] Keyboard navigation works in searchable dropdowns (Arrow Up/Down, Enter, Escape)
- [ ] No console errors in Chrome/Edge DevTools

**Files Likely Affected:**
- `src/app.js` - `SearchableSelect` class, filter logic, updated `displayImpactResults()`
- `index.html` - Filter bar HTML, searchable dropdown structure
- `src/styles.css` - Filter bar styles, searchable dropdown styles, highlight/dim states
- `src/graph.js` - Node highlighting for search

---

#### Task 2-4: Calculation Groups & Field Parameters Support

| Field | Value |
|-------|-------|
| **ID** | 2-4 |
| **Agent Role** | Feature Agent |
| **Branch** | `task-2-4/calc-groups-field-params` |
| **Complexity** | High |
| **Dependencies** | None |
| **GitHub Issue** | #31 |

**Description:**

Add parsing and dependency tracking for two critical enterprise TMDL features: **Calculation Groups** and **Field Parameters**. These are widely used in production Power BI models but currently invisible to the analyzer.

### Part A: Calculation Groups

**TMDL Structure for Calculation Groups:**

Calculation groups are stored as special tables in TMDL. The table file (`{CalcGroupName}.tmdl`) looks like:

```tmdl
table 'Time Intelligence'
    calculationGroup

        calculationItem 'YTD' =
            CALCULATE(
                SELECTEDMEASURE(),
                DATESYTD('Calendar'[Date])
            )

        calculationItem 'MTD' =
            CALCULATE(
                SELECTEDMEASURE(),
                DATESMTD('Calendar'[Date])
            )

        calculationItem 'YoY %' =
            VAR CurrentValue = SELECTEDMEASURE()
            VAR PriorValue = CALCULATE(SELECTEDMEASURE(), DATEADD('Calendar'[Date], -1, YEAR))
            RETURN
                DIVIDE(CurrentValue - PriorValue, PriorValue)

    column 'Time Intelligence'
        dataType: string
        isHidden
        sourceColumn: Name
        sortByColumn: Ordinal

    column Ordinal
        dataType: int64
        isHidden
        sourceColumn: Ordinal
```

**Implementation for Calculation Groups:**

1. **Update `TMDLParser.parseTableTMDL()`** (`src/parsers.js`):
   - Detect `calculationGroup` keyword in table content.
   - When found, parse `calculationItem 'Name' =` blocks (same pattern as measures).
   - Extract the DAX expression for each calculation item.
   - Return enhanced table object:
     ```js
     {
       tableName: 'Time Intelligence',
       isCalculationGroup: true,
       calculationItems: [
         { name: 'YTD', dax: 'CALCULATE(SELECTEDMEASURE(), ...)' },
         { name: 'MTD', dax: 'CALCULATE(SELECTEDMEASURE(), ...)' }
       ],
       columns: [...] // existing column parsing
     }
     ```

2. **Update `DependencyAnalyzer`** (`src/analyzer.js`):
   - Add `addCalculationGroupNodes()` method.
   - For each calculation group table, create a `calculationGroup` node and individual `calculationItem` nodes.
   - Parse DAX in each calculation item to find column references (e.g., `'Calendar'[Date]`).
   - Note: `SELECTEDMEASURE()` is a special function that applies to ALL measures — it doesn't create a direct dependency on any specific measure. Document this in the node metadata.
   - Add edges: calculationItem → column dependencies (from DAX).

3. **Update lineage and impact analysis**:
   - Calculation items should appear in impact analysis when analyzing columns they reference.
   - In lineage view, use a distinct color (e.g., teal) and icon for calculation group items.

### Part B: Field Parameters

**TMDL Structure for Field Parameters:**

Field parameter tables have a specific pattern. They are tables with:
- An annotation `isParameterTable: true` (or detected by the DAX pattern)
- A column that is the parameter name
- A DAX expression column containing `NAMEOF()` references

Example `Metric Selector.tmdl`:
```tmdl
table 'Metric Selector'
    isParameterTable

    column 'Metric Selector'
        dataType: string
        isHidden: false
        sourceColumn: Name
        sortByColumn: Ordinal

    column Value
        dataType: string
        isHidden: true

    column Ordinal
        dataType: int64
        isHidden: true

    partition 'Metric Selector' = calculated
        expression =
            {
                ("Total Sales", NAMEOF('Measure'[Total Sales]), 0),
                ("Total Cost", NAMEOF('Measure'[Total Cost]), 1),
                ("Profit Margin", NAMEOF('Measure'[Profit Margin]), 2),
                ("Avg Order Value", NAMEOF('Sales'[Avg Order Value]), 3)
            }
```

**Critical note on field parameter references:**

In the TMDL partition expression:
- **Measure references**: `NAMEOF('Measure'[Total Sales])` — The `'Measure'` table prefix is present in the TMDL but is annoying/redundant in display. When showing field parameter references to users, display just the measure name (e.g., "Total Sales") without the `Measure.` prefix.
- **Column references**: `NAMEOF('Sales'[Avg Order Value])` — The `'Sales'` table prefix is mandatory and meaningful. Always display as `Sales[Avg Order Value]`.

The key distinction: for measures, the table name (which is always literally `'Measure'` or sometimes the auto-generated measure table) is noise. For columns, the table name is critical context.

**Implementation for Field Parameters:**

1. **Update `TMDLParser.parseTableTMDL()`** (`src/parsers.js`):
   - Detect `isParameterTable` keyword in table content.
   - When found, also look for `partition` blocks with `calculated` expressions containing `NAMEOF()`.
   - Extract field parameter references:
     ```js
     {
       tableName: 'Metric Selector',
       isFieldParameter: true,
       fieldParameterRefs: [
         { displayName: 'Total Sales', table: 'Measure', property: 'Total Sales', type: 'measure' },
         { displayName: 'Total Cost', table: 'Measure', property: 'Total Cost', type: 'measure' },
         { displayName: 'Avg Order Value', table: 'Sales', property: 'Avg Order Value', type: 'column' }
       ],
       columns: [...] // existing column parsing
     }
     ```

2. **Add `DAXParser.extractFieldParameterRefs(daxExpression)`** (`src/parsers.js`):
   - Parse `NAMEOF('TableName'[PropertyName])` patterns.
   - Regex: `/NAMEOF\s*\(\s*'([^']+)'\[([^\]]+)\]\s*\)/gi`
   - Classify each reference:
     - If table name matches a known measures table (table name is literally `'Measure'` or is a table that only contains measures), classify as `type: 'measure'`.
     - Otherwise, classify as `type: 'column'`.
   - Also extract the display name from the tuple: `("Display Name", NAMEOF(...), ordinal)`.

3. **Update `DependencyAnalyzer`** (`src/analyzer.js`):
   - Add `addFieldParameterNodes()` method.
   - Create a `fieldParameter` node for the parameter table.
   - Create edges from the field parameter to each referenced measure/column.
   - When analyzing impact of a measure rename, field parameters that reference it should appear in downstream dependents.

4. **Display logic** (`src/app.js` + `src/graph.js`):
   - In impact results, show field parameters as a new section under downstream dependents.
   - For measure references in field parameters: display as just `Total Sales` (no table prefix).
   - For column references in field parameters: display as `Sales[Avg Order Value]` (with table prefix).
   - In lineage view, use a distinct color (e.g., warm orange) and icon for field parameter nodes.

5. **Update `RefactoringEngine` for field parameters** (`src/refactor.js`):
   - When renaming a measure, also update `NAMEOF('Measure'[OldName])` → `NAMEOF('Measure'[NewName])` in partition expressions of field parameter tables.
   - When renaming a column, update `NAMEOF('TableName'[OldColumn])` → `NAMEOF('TableName'[NewColumn])`.
   - When renaming a table (Task 2-1), update `NAMEOF('OldTable'[Column])` → `NAMEOF('NewTable'[Column])` in partition expressions.

**Acceptance Criteria:**
- [ ] Calculation group tables are detected and `calculationItem` blocks are parsed with DAX
- [ ] Calculation items appear in dependency graph with column references tracked
- [ ] `SELECTEDMEASURE()` is recognized as a special function (not treated as broken reference)
- [ ] Field parameter tables are detected via `isParameterTable` keyword
- [ ] `NAMEOF()` references are extracted and classified as measure or column
- [ ] Field parameters appear in downstream impact when analyzing referenced measures/columns
- [ ] Measure references in field params display WITHOUT table prefix (just "Total Sales")
- [ ] Column references in field params display WITH table prefix ("Sales[Avg Order Value]")
- [ ] Renaming a measure updates `NAMEOF()` in field parameter partition expressions
- [ ] Renaming a column updates `NAMEOF()` in field parameter partition expressions
- [ ] Lineage view shows distinct colors/icons for calculation groups and field parameters
- [ ] No console errors in Chrome/Edge DevTools
- [ ] Existing parsing of regular tables/measures still works unchanged

**Files Likely Affected:**
- `src/parsers.js` - Updated `parseTableTMDL()`, new `extractFieldParameterRefs()`, calculation item parsing
- `src/analyzer.js` - New `addCalculationGroupNodes()`, `addFieldParameterNodes()`, updated `buildDependencyGraph()`
- `src/refactor.js` - Updated rename preview to handle `NAMEOF()` references in partition expressions
- `src/app.js` - Updated display logic for new node types, field parameter display formatting
- `src/graph.js` - New colors and icons for calculation groups and field parameters
- `index.html` - No structural changes needed (reuses existing containers)
- `src/styles.css` - New colors for calculation group and field parameter nodes

---

#### Task 2-5: Session Persistence

| Field | Value |
|-------|-------|
| **ID** | 2-5 |
| **Agent Role** | Feature Agent |
| **Branch** | `task-2-5/session-persistence` |
| **Complexity** | Medium |
| **Dependencies** | None |
| **GitHub Issue** | #32 (also addresses existing #20) |

**Description:**

Add session persistence using `localStorage` so users don't lose context between visits. Remember recent analyses, favorite objects, and user preferences. This directly addresses GitHub issue #20 (favorites/recent items).

**Implementation Details:**

1. **Create `src/sessionManager.js`** (new file):
   - Add to script load order in `index.html` BEFORE `src/app.js`:
     `src/fileAccess.js → src/parsers.js → src/analyzer.js → src/refactor.js → src/graph.js → src/sessionManager.js → src/app.js`
   - Class: `SessionManager` with methods:
     ```js
     class SessionManager {
       constructor(storageKey = 'pbip-impact-analyzer')

       // Recent analyses
       addRecentAnalysis(nodeId, nodeName, nodeType, timestamp)
       getRecentAnalyses(limit = 10)    // Returns last N analyses
       clearRecentAnalyses()

       // Favorites
       addFavorite(nodeId, nodeName, nodeType)
       removeFavorite(nodeId)
       getFavorites()
       isFavorite(nodeId)
       toggleFavorite(nodeId, nodeName, nodeType)

       // Settings
       saveSettings(settings)           // {lastTab, lastObjectType, lastDepthFilter, ...}
       getSettings()

       // Last folder (display name only — can't store FileHandle)
       saveLastFolder(folderName, semanticModelName, reportName)
       getLastFolder()

       // Internal helpers
       _load()
       _save()
     }
     ```
   - Storage schema in `localStorage`:
     ```json
     {
       "version": 1,
       "recentAnalyses": [
         { "nodeId": "Measure.Total Sales", "name": "Total Sales", "type": "measure", "timestamp": 1738800000 }
       ],
       "favorites": [
         { "nodeId": "Measure.Revenue", "name": "Revenue", "type": "measure" }
       ],
       "settings": {
         "lastTab": "impact",
         "lastObjectType": "measure"
       },
       "lastFolder": {
         "folderName": "MyProject",
         "semanticModelName": "Sales.SemanticModel",
         "reportName": "Sales.Report"
       }
     }
     ```

2. **Quick Access Panel in sidebar** (`index.html` + `src/app.js`):
   - Add a collapsible "Quick Access" section above the object type selector in the Impact Analysis sidebar:
     ```html
     <div class="quick-access-panel">
       <h4>Quick Access</h4>
       <div class="quick-access-tabs">
         <button class="quick-tab active" data-qtab="recent">Recent</button>
         <button class="quick-tab" data-qtab="favorites">Favorites</button>
       </div>
       <div id="recentList" class="quick-list"></div>
       <div id="favoritesList" class="quick-list hidden"></div>
     </div>
     ```
   - Each item in the list is clickable — selecting it auto-fills the object type and object selectors and triggers analysis.
   - Recent list shows last 10 analyzed objects with relative timestamp ("2 min ago", "yesterday").
   - Favorites list shows starred items with a remove button.

3. **Favorite toggle on impact results** (`src/app.js`):
   - Add a star icon button next to the selected object name in impact results:
     ```html
     <button id="favoriteToggleBtn" class="favorite-btn" title="Add to favorites">
       <span class="material-symbols-outlined">star_outline</span>
     </button>
     ```
   - Clicking toggles the favorite state. Filled star = favorited, outline = not favorited.
   - Update `displayImpactResults()` to check `sessionManager.isFavorite(nodeId)` and set initial state.

4. **Restore settings on load** (`src/app.js`):
   - In `init()`, after setting up event listeners:
     - Restore last active tab via `switchTab(settings.lastTab)`.
     - Restore last object type selection.
   - On tab switch, save the active tab.
   - On object type change, save the selection.

5. **Last folder indicator** (`src/app.js`):
   - After successful folder load, save folder metadata via `sessionManager.saveLastFolder()`.
   - On app init, if `getLastFolder()` returns data, show a subtle hint below the "Select Project Folder" button:
     `"Last opened: MyProject / Sales.SemanticModel"`
   - This is just a visual hint — the user still needs to re-select the folder (File System Access API doesn't allow persisted handles without explicit user re-grant).

**Acceptance Criteria:**
- [ ] Recent analyses list shows last 10 analyzed objects with timestamps
- [ ] Clicking a recent item auto-selects and triggers analysis
- [ ] Favorite toggle (star icon) works on impact analysis results
- [ ] Favorites persist across page reloads
- [ ] Quick Access panel shows Recent and Favorites tabs
- [ ] Last active tab is restored on page reload
- [ ] Last folder name is shown as a hint on page load
- [ ] `localStorage` data has a version field for future migration
- [ ] Clearing browser data gracefully resets to defaults (no errors)
- [ ] No console errors in Chrome/Edge DevTools
- [ ] Existing functionality not broken

**Files Likely Affected:**
- `src/sessionManager.js` - **NEW FILE** - `SessionManager` class
- `index.html` - Script tag for `src/sessionManager.js`, Quick Access panel HTML
- `src/app.js` - Initialize `SessionManager`, integrate with analysis flow, favorite toggle, settings restore
- `src/styles.css` - Quick Access panel styles, favorite button styles, recent/favorites list styles

---

#### Task 2-6: GitHub Sponsors + "Support this project" link

| Field | Value |
|-------|-------|
| **ID** | 2-6 |
| **Agent Role** | DevOps Agent |
| **Branch** | `task-2-6/github-sponsors` |
| **Complexity** | Low |
| **Dependencies** | None |
| **GitHub Issue** | _#TBD_ |

**Description:**

Enable GitHub Sponsors for the repository and add a "Support this project" link to the app footer.

**Implementation Details:**

1. Create `.github/FUNDING.yml` with `github: JonathanJihwanKim`
2. Add "Support this project" link to footer (combined with Task 2-7 footer update)
3. Style the sponsor link with `--accent-terracotta` color

**Files Likely Affected:**
- `.github/FUNDING.yml` — new file
- `index.html` — footer update (combined with Task 2-7)
- `src/styles.css` — sponsor link styles

---

#### Task 2-7: Sponsor Bar in Footer

| Field | Value |
|-------|-------|
| **ID** | 2-7 |
| **Agent Role** | UI Agent |
| **Branch** | `task-2-7/sponsor-bar` |
| **Complexity** | Low |
| **Dependencies** | Task 2-6 (same footer edit) |
| **GitHub Issue** | _#TBD_ |

**Description:**

Expand the footer with a config-driven sponsor bar. When the `SPONSORS` array in `src/app.js` is empty, the bar is hidden. Sponsors can be added by editing one array.

**Implementation Details:**

1. Replace footer HTML with combined sponsor bar + footer links
2. Add `SPONSORS` config array and `renderSponsors()` function to `src/app.js`
3. Add CSS styles for sponsor bar, logos, and "Become a sponsor" link
4. Create `assets/sponsors/` directory for future sponsor logos

**Files Likely Affected:**
- `index.html` — new footer structure
- `src/app.js` — `SPONSORS` config + `renderSponsors()` function
- `src/styles.css` — sponsor bar styles
- `assets/sponsors/` — new directory

---

#### Task 2-8: Visual Upstream Analysis

| Field | Value |
|-------|-------|
| **ID** | 2-8 |
| **Agent Role** | Feature Agent |
| **Branch** | `task-2-8/visual-upstream` |
| **Complexity** | Medium |
| **Dependencies** | None (schedule in Wave 3 to avoid app.js conflicts) |
| **GitHub Issue** | _#TBD_ |

**Description:**

Add "Visual" as a third option in the Impact Analysis object type dropdown. When selected, users choose a page then a visual, and see the full upstream dependency chain (measures, columns, tables) along with a position mini-map showing where the visual sits on the page.

**Implementation Details:**

1. Extract position data from visual.json in `src/parsers.js` (`parseVisual()`)
2. Store position in `parsedData.visuals` in `src/app.js`
3. Add "Visual" option to `#objectTypeSelect` in `index.html`
4. Add two-step page/visual picker dropdowns (`index.html` + `src/app.js`)
5. Add `renderVisualMiniMap()` function in `src/app.js`
6. Update `displayImpactResults()` to handle visual analysis (upstream-only, hide downstream)

**Acceptance Criteria:**
- "Visual" appears as third option in Impact Analysis object type dropdown
- Selecting "Visual" shows page dropdown, then visual dropdown
- Analyzing a visual shows full upstream chain (measures, columns, tables)
- Mini-map shows visual's position on the page
- Downstream section hidden/collapsed for visual analysis
- Existing measure/column analysis unaffected

**Files Likely Affected:**
- `src/parsers.js` — extract `position` from `parseVisual()`
- `src/app.js` — new populate/handler functions, `renderVisualMiniMap()`, updated `handleAnalyzeImpact()` and `displayImpactResults()`
- `index.html` — "Visual" option + page/visual dropdowns
- `src/styles.css` — mini-map styles

---

## 3. Agent Role Definitions

### Feature Agent (Tasks 2-1, 2-2, 2-4, 2-5, 2-8)
- **Scope**: JavaScript business logic, new parsers, analyzer enhancements, refactoring engine updates, visual upstream analysis
- **Constraints**: Zero new dependencies. All new JS must follow the existing class pattern (or global function pattern in `src/app.js`). Must integrate with existing global state. No `import/export` — all scripts share global scope.
- **Testing**: Load a PBIP folder in Chrome/Edge and verify the feature works across all tabs without breaking existing functionality. Check browser DevTools for errors.

### UI Agent (Tasks 2-3, 2-7)
- **Scope**: Search/filter UI components, CSS styling, keyboard navigation, responsive design, sponsor bar footer
- **Constraints**: Must use CSS custom properties from `:root`. No inline styles in HTML (dynamic JS styles are acceptable for generated elements). JavaScript for the searchable dropdown should follow the existing function/class patterns in `src/app.js`.
- **Testing**: Visual inspection in Chrome/Edge at desktop and mobile widths. Test keyboard navigation. Verify filter counts update correctly.

### DevOps Agent (Task 2-6)
- **Scope**: GitHub configuration, CI/CD, funding setup
- **Constraints**: Follow GitHub's standard FUNDING.yml format. Ensure sponsor button appears correctly on repo page.
- **Testing**: Push to GitHub and verify the "Sponsor" button appears on the repository page.

---

## 4. Execution Instructions

### Starting a Task

Open a new Claude Code context in the repo root (`D:\pbip-impact-analyzer`) and say:

> Start task 2-X as [Agent Role] per the orchestration doc at docs/orchestration/2026-02-06-cycle2-features.md

The sub-agent will:
1. Read `CLAUDE.md` (loaded automatically)
2. Read this orchestration document
3. Create a worktree: `git worktree add ../worktrees/task-2-X-description task-2-X/description`
4. Work in the worktree directory
5. Make commits with descriptive messages
6. Create a PR: `gh pr create --title "[Task 2-X] Title" --body "Closes #issue"`
7. Report completion

### Task Execution Order

All eight tasks can be organized into waves to minimize merge conflicts in `src/app.js` and `index.html`:

**Recommended execution order:**

1. **Wave 1 (start immediately, minimal overlap):**
   - Task 2-4 (Calculation Groups & Field Params) — primarily touches `src/parsers.js` and `src/analyzer.js`
   - Task 2-5 (Session Persistence) — creates a new `src/sessionManager.js` file
   - Task 2-6 (GitHub Sponsors) — only adds `FUNDING.yml` + small footer change
   - Task 2-7 (Sponsor Bar) — footer HTML/CSS + sponsor config in `src/app.js`

2. **Wave 2 (after Wave 1 merges):**
   - Task 2-1 (Batch Operations) — primarily touches `src/refactor.js` and `src/fileAccess.js`
   - Task 2-2 (Delete Analysis) — primarily touches `src/analyzer.js` and `src/app.js`

3. **Wave 3 (after Wave 2 merges):**
   - Task 2-3 (Search & Filter) — touches `src/app.js` heavily, best done after other `src/app.js` changes land
   - Task 2-8 (Visual Upstream Analysis) — touches Impact Analysis sidebar (same area as 2-3)

**Rationale:** Tasks 2-4 and 2-5 have the least overlap with each other and with the rest. Tasks 2-6 and 2-7 are small footer changes that ship alongside Wave 1 with zero conflict risk. Tasks 2-1 and 2-2 both modify `src/analyzer.js` and `src/app.js` but in different areas. Task 2-3 and 2-8 modify `src/app.js` display functions and the Impact Analysis sidebar, so doing them last minimizes conflict resolution.

### Merge Order

Merge PRs in wave order. After each merge:
1. Pull latest `main` into remaining worktrees via `git fetch origin main && git rebase origin/main`
2. Resolve any conflicts before continuing

---

## 5. Related GitHub Issues

These existing open issues are addressed or partially addressed by this cycle:

| Issue | Title | Addressed By |
|-------|-------|--------------|
| #19 | Search/filter to measure and column dropdowns | Task 2-3 |
| #20 | Favorites/recent items for frequently analyzed measures | Task 2-5 |

---

## 6. Change Log

| Date | Action | Actor |
|------|--------|-------|
| 2026-02-06 | Orchestration doc created | Orchestrate Agent |
| _pending_ | Plan approved by user | User |
| _pending_ | GitHub Issues created | Orchestrate Agent |
