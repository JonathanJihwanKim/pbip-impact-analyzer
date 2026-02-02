# PBIP Impact Analyzer - Implementation Plan

## Project Overview

**Project Name:** `pbip-impact-analyzer`

**Purpose:** A browser-based tool that helps Power BI developers safely refactor semantic models by analyzing the impact of renaming or deleting measures and columns across both SemanticModel (TMDL) and Report (JSON) folders.

**Problem Statement:**
- When developers rename/delete measures or columns in Power BI semantic models, they have no visibility into what will break
- Manual impact analysis is time-consuming and error-prone
- Changes can break DAX measures, relationships, and report visuals without warning
- Power BI Service's impact analysis only shows downstream reports, not internal model dependencies

**Solution:**
A lightweight, browser-based tool (similar to [isHiddenInViewMode](https://github.com/JonathanJihwanKim/isHiddenInViewMode)) that:
1. Analyzes dependencies between measures, columns, relationships, and report visuals
2. Shows complete impact before making changes
3. Provides safe bulk refactoring with preview
4. Works directly with PBIP folders using File System Access API
5. Requires no installation or build process

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  ┌──────────────┬──────────────┬─────────────────────────┐  │
│  │ Impact Tab   │ Refactor Tab │ Dependency Graph Tab    │  │
│  └──────────────┴──────────────┴─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Core Engine Layer                         │
│  ┌──────────────────┬─────────────────┬──────────────────┐  │
│  │ Dependency       │ Impact          │ Refactoring      │  │
│  │ Analyzer         │ Analyzer        │ Engine           │  │
│  └──────────────────┴─────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Parser Layer                              │
│  ┌──────────────────┬─────────────────┬──────────────────┐  │
│  │ TMDL Parser      │ JSON Parser     │ DAX Parser       │  │
│  │ (Measures,       │ (Visuals,       │ (Expressions)    │  │
│  │  Tables,         │  Pages)         │                  │  │
│  │  Relationships)  │                 │                  │  │
│  └──────────────────┴─────────────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    File Access Layer                         │
│              (File System Access API)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Read/Write PBIP Folders (SemanticModel + Report)    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. File Access Layer
**File:** `fileAccess.js`

**Responsibilities:**
- Use File System Access API to read/write PBIP folders
- Directory traversal for SemanticModel and Report folders
- File reading (TMDL text files, JSON files)
- File writing with validation

**Key Functions:**
```javascript
async function selectPBIPFolder()
async function readSemanticModelFiles(folderHandle)
async function readReportFiles(folderHandle)
async function writeFile(fileHandle, content)
async function getFileStructure(folderHandle)
```

#### 2. Parser Layer

**File:** `parsers.js`

**A. TMDL Parser**
- Parses `Measure.tmdl` to extract all measures and their DAX expressions
- Parses table `.tmdl` files to extract columns and properties
- Parses `relationships.tmdl` to extract relationship definitions

**Key Functions:**
```javascript
function parseMeasuresTMDL(tmdlContent) // Returns: [{name, dax, formatString, lineageTag}]
function parseTableTMDL(tmdlContent) // Returns: {tableName, columns: [{name, dataType, ...}]}
function parseRelationshipsTMDL(tmdlContent) // Returns: [{name, fromColumn, toColumn}]
```

**B. DAX Parser (Regex-based)**
- Extracts measure references: `[MeasureName]`
- Extracts column references: `tableName[columnName]`
- Extracts function calls: `FUNCTION(args)`

**Key Functions:**
```javascript
function extractMeasureReferences(daxExpression) // Returns: ['MeasureName1', 'MeasureName2']
function extractColumnReferences(daxExpression) // Returns: [{table: 'sales', column: 'Quantity'}]
function extractFunctionCalls(daxExpression) // Returns: ['SUM', 'DISTINCTCOUNT']
```

**C. JSON Parser (Report Visuals)**
- Parses `pages.json` to get page list
- Parses `page.json` to get page metadata
- Parses `visual.json` to extract field references

**Key Functions:**
```javascript
function parsePages(pagesJsonContent) // Returns: [{pageId, displayName}]
function parsePage(pageJsonContent) // Returns: {name, displayName, visualInteractions}
function parseVisual(visualJsonContent) // Returns: {visualId, visualType, fields: [...]}
function extractFieldReferences(queryState) // Returns: [{type: 'measure'|'column', entity, property}]
```

#### 3. Core Engine Layer

**File:** `analyzer.js`

**A. Dependency Analyzer**
- Builds dependency graph from parsed data
- Nodes: measures, columns, tables
- Edges: "uses" relationships

**Data Structure:**
```javascript
{
  nodes: {
    'Measure.Total Sales': {
      type: 'measure',
      dax: 'SUMX(sales, sales[Quantity] * sales[UnitPrice])',
      dependencies: [
        {type: 'column', ref: 'sales.Quantity'},
        {type: 'column', ref: 'sales.UnitPrice'}
      ],
      usedBy: [
        {type: 'measure', ref: 'Measure.Profit Margin'},
        {type: 'visual', ref: 'page1/visual123', visualType: 'clusteredColumnChart'}
      ]
    },
    'sales.Quantity': {
      type: 'column',
      table: 'sales',
      dataType: 'int64',
      usedBy: [
        {type: 'measure', ref: 'Measure.Total Sales'},
        {type: 'measure', ref: 'Measure.Total Quantity'},
        {type: 'visual', ref: 'page2/visual456', visualType: 'tableEx'}
      ]
    }
  }
}
```

**Key Functions:**
```javascript
function buildDependencyGraph(measures, tables, visuals)
function findDependencies(nodeId) // Returns all nodes this depends on
function findUsages(nodeId) // Returns all nodes that use this
function detectCircularDependencies()
```

**B. Impact Analyzer**
- Calculates impact of renaming/deleting a measure or column
- Traverses dependency graph to find all affected objects

**Key Functions:**
```javascript
function analyzeImpact(nodeId, operation) // operation: 'rename' | 'delete'
// Returns: {
//   affectedMeasures: [...],
//   affectedVisuals: [{pageId, pageName, visualId, visualType}],
//   affectedRelationships: [...],
//   totalImpact: number
// }
```

**C. Refactoring Engine**
- Performs bulk rename operations
- Updates TMDL files (DAX expressions, table/column definitions)
- Updates JSON files (visual field references)
- Validates changes before applying

**Key Functions:**
```javascript
function previewRename(oldName, newName, nodeType)
function applyRename(changes) // Writes all changes to files
function validateChanges(changes) // Ensures no syntax errors
```

#### 4. UI Layer

**Files:** `index.html`, `app.js`, `styles.css`

**Tab 1: Impact Analysis**
- Dropdown to select measure or column
- "Analyze Impact" button
- Results display:
  - Summary card (total impact count)
  - Affected measures list (with DAX preview)
  - Affected visuals list (grouped by page, with visual type)
  - Affected relationships list (for columns)

**Tab 2: Safe Refactoring**
- Select object to rename
- Enter new name
- "Preview Changes" button
- Diff view showing before/after for each affected file
- "Apply Changes" button (with confirmation)

**Tab 3: Dependency Graph**
- Visual graph representation using D3.js or vis.js
- Interactive: click node to highlight dependencies
- Filter by type (measures only, columns only, etc.)
- Export as SVG/PNG

---

## File Structure

```
pbip-impact-analyzer/
├── index.html              # Main HTML page with tab structure
├── app.js                  # Main application logic and UI orchestration
├── fileAccess.js           # File System Access API wrapper
├── parsers.js              # TMDL, JSON, and DAX parsers
├── analyzer.js             # Dependency and impact analysis engine
├── refactor.js             # Refactoring operations
├── graph.js                # Dependency graph visualization (D3.js)
├── styles.css              # Styling (similar to isHiddenInViewMode)
├── README.md               # Documentation with screenshots
├── LICENSE                 # MIT License
└── .gitignore              # Ignore .DS_Store, etc.
```

---

## Implementation Phases

### Phase 1: Foundation (Core Parsing)
**Goal:** Read and parse PBIP files

**Tasks:**
1. Set up project structure (HTML, CSS, JS files)
2. Implement File System Access API integration
   - Folder selection dialog
   - Recursive file reading
3. Implement TMDL Parser
   - Parse `Measure.tmdl` → extract measures and DAX
   - Parse table `.tmdl` files → extract columns
   - Parse `relationships.tmdl` → extract relationships
4. Implement JSON Parser
   - Parse `pages.json` → page list
   - Parse `visual.json` → field references
5. Test parsing with sample PBIP project (Contoso Sales)

**Deliverables:**
- Parsed data structures for measures, columns, and visuals
- Console logging to verify correct parsing

### Phase 2: Dependency Analysis
**Goal:** Build dependency graph

**Tasks:**
1. Implement DAX Parser (regex-based)
   - Extract measure references: `[MeasureName]`
   - Extract column references: `tableName[columnName]`
2. Build dependency graph
   - Create nodes for measures, columns, tables
   - Create edges for "uses" relationships
3. Implement dependency traversal
   - `findDependencies(nodeId)` → what this depends on
   - `findUsages(nodeId)` → what uses this
4. Test with complex DAX expressions

**Deliverables:**
- Dependency graph data structure
- Console logging to verify correct dependencies

### Phase 3: Impact Analysis UI
**Goal:** Display impact analysis results

**Tasks:**
1. Create Tab 1 UI (Impact Analysis)
   - Dropdown to select measure/column
   - "Analyze Impact" button
   - Results display area
2. Implement `analyzeImpact()` function
   - Traverse graph to find all usages
   - Group by type (measures, visuals, relationships)
3. Display results
   - Summary card with total count
   - Accordion/list of affected measures (with DAX snippet)
   - Table of affected visuals (page name, visual type)
4. Test with Contoso Sales PBIP

**Deliverables:**
- Working Impact Analysis tab
- Clear, readable impact reports

### Phase 4: Safe Refactoring
**Goal:** Rename measures/columns with preview

**Tasks:**
1. Create Tab 2 UI (Safe Refactoring)
   - Select object to rename
   - Input for new name
   - Preview button
   - Diff display area
2. Implement `previewRename()` function
   - Generate list of file changes
   - Show before/after for each file
3. Implement `applyRename()` function
   - Update DAX expressions in `Measure.tmdl`
   - Update column names in table `.tmdl` files
   - Update visual field references in `visual.json` files
   - Update relationships in `relationships.tmdl`
4. Add validation
   - Check for name conflicts
   - Validate DAX syntax after changes
5. Test rename operation end-to-end

**Deliverables:**
- Working refactoring with preview
- File writing without corruption

### Phase 5: Visualization & Polish
**Goal:** Dependency graph visualization and final touches

**Tasks:**
1. Create Tab 3 UI (Dependency Graph)
   - Integrate D3.js or vis.js for graph rendering
   - Interactive nodes (click to highlight)
   - Color coding by type (measures, columns, visuals)
2. Add export functionality
   - Export impact report as CSV
   - Export dependency graph as SVG/PNG
3. Polish UI
   - Responsive design
   - Loading indicators
   - Error handling and user feedback
4. Documentation
   - README with screenshots
   - Usage instructions
   - Example use cases

**Deliverables:**
- Complete, polished application
- Documentation for GitHub

### Phase 6: Testing & Deployment
**Goal:** Ensure reliability and deploy to GitHub Pages

**Tasks:**
1. Test with multiple PBIP projects
   - Simple models (few measures)
   - Complex models (100+ measures, 50+ tables)
   - Edge cases (special characters, nested expressions)
2. Performance optimization
   - Lazy loading for large files
   - Efficient graph algorithms
3. Deploy to GitHub Pages
   - Set up GitHub repository
   - Configure GitHub Pages
   - Add demo video/GIF to README
4. Community feedback
   - Share on Power BI community forums
   - Gather feedback and iterate

**Deliverables:**
- Live demo site on GitHub Pages
- Public GitHub repository

---

## Technical Specifications

### DAX Parsing Strategy

**Approach:** Regex-based parsing (sufficient for dependency analysis)

**Why not a full parser?**
- Full DAX grammar is complex (would require PEG.js or ANTLR)
- For impact analysis, we only need to extract references, not validate syntax
- Regex is fast and sufficient for 95% of cases

**Regex Patterns:**

```javascript
// Measure references: [MeasureName] or 'Measure Name'
const MEASURE_REF_REGEX = /\[([^\]]+)\]/g;
const MEASURE_REF_QUOTED_REGEX = /'([^']+)'/g;

// Column references: tableName[columnName] or 'Table Name'[Column]
const COLUMN_REF_REGEX = /(\w+)\[([^\]]+)\]/g;
const COLUMN_REF_QUOTED_REGEX = /'([^']+)'\[([^\]]+)\]/g;

// Function calls: FUNCTION(...)
const FUNCTION_CALL_REGEX = /\b([A-Z][A-Z0-9_]*)\s*\(/g;
```

**Edge Cases to Handle:**
- Measure names with spaces: `'Total Sales'`
- Measure names with special characters: `[Sales %]`
- Nested expressions: `CALCULATE([Total Sales], FILTER(...))`
- Comments in DAX: `// comment` or `/* comment */`
- String literals: `"text"` (should not be parsed as references)

**Implementation:**
```javascript
function extractReferences(daxExpression) {
  // Remove comments
  let cleaned = daxExpression.replace(/\/\*[\s\S]*?\*\//g, '')
                              .replace(/\/\/.*/g, '');

  // Remove string literals (to avoid false positives)
  cleaned = cleaned.replace(/"[^"]*"/g, '');

  // Extract measure references
  const measureRefs = [];
  let match;
  while ((match = MEASURE_REF_REGEX.exec(cleaned)) !== null) {
    measureRefs.push(match[1]);
  }

  // Extract column references
  const columnRefs = [];
  while ((match = COLUMN_REF_REGEX.exec(cleaned)) !== null) {
    columnRefs.push({ table: match[1], column: match[2] });
  }

  return { measureRefs, columnRefs };
}
```

### Visual Field Reference Extraction

**Location in visual.json:** `query.queryState.{projectionName}.projections[]`

**Example JSON structure:**
```json
{
  "query": {
    "queryState": {
      "Category": {
        "projections": [
          {
            "field": {
              "Column": {
                "Expression": { "SourceRef": { "Entity": "date" } },
                "Property": "Date"
              }
            },
            "queryRef": "date.Date",
            "active": true
          }
        ]
      },
      "Y": {
        "projections": [
          {
            "field": {
              "Measure": {
                "Expression": { "SourceRef": { "Entity": "Measure" } },
                "Property": "Total Sales"
              }
            },
            "queryRef": "Measure.Total Sales"
          }
        ]
      }
    }
  }
}
```

**Extraction Algorithm:**
```javascript
function extractFieldReferences(visualJson) {
  const fields = [];
  const queryState = visualJson.query?.queryState;

  if (!queryState) return fields;

  // Iterate through all projection groups (Category, Y, X, Values, etc.)
  for (const [projectionName, projection] of Object.entries(queryState)) {
    if (!projection.projections) continue;

    for (const proj of projection.projections) {
      if (proj.field?.Column) {
        // Column reference
        const entity = proj.field.Column.Expression.SourceRef.Entity;
        const property = proj.field.Column.Property;
        fields.push({
          type: 'column',
          table: entity,
          column: property,
          queryRef: proj.queryRef
        });
      } else if (proj.field?.Measure) {
        // Measure reference
        const property = proj.field.Measure.Property;
        fields.push({
          type: 'measure',
          name: property,
          queryRef: proj.queryRef
        });
      }
    }
  }

  return fields;
}
```

### Refactoring Algorithm

**Renaming a Measure:**

```javascript
function renameMeasure(oldName, newName, dependencyGraph) {
  const changes = [];

  // 1. Update measure definition in Measure.tmdl
  const measureFile = readFile('definition/tables/Measure.tmdl');
  const updatedMeasure = measureFile.replace(
    new RegExp(`measure '${oldName}'`, 'g'),
    `measure '${newName}'`
  );
  changes.push({
    file: 'definition/tables/Measure.tmdl',
    before: measureFile,
    after: updatedMeasure
  });

  // 2. Update references in other measures' DAX expressions
  const node = dependencyGraph.nodes[`Measure.${oldName}`];
  for (const usage of node.usedBy) {
    if (usage.type === 'measure') {
      const usageMeasureName = usage.ref.split('.')[1];
      const usageMeasure = dependencyGraph.nodes[usage.ref];

      // Replace [OldName] with [NewName] in DAX
      const updatedDAX = usageMeasure.dax.replace(
        new RegExp(`\\[${oldName}\\]`, 'g'),
        `[${newName}]`
      );

      // Update in Measure.tmdl
      const file = readFile('definition/tables/Measure.tmdl');
      const updated = file.replace(usageMeasure.dax, updatedDAX);
      changes.push({
        file: 'definition/tables/Measure.tmdl',
        before: file,
        after: updated
      });
    }
  }

  // 3. Update visual field references in all visual.json files
  for (const usage of node.usedBy) {
    if (usage.type === 'visual') {
      const [pageId, visualId] = usage.ref.split('/');
      const visualFile = readFile(`pages/${pageId}/visuals/${visualId}/visual.json`);
      const visualJson = JSON.parse(visualFile);

      // Find and update Measure.Property
      updateMeasureInVisual(visualJson, oldName, newName);

      changes.push({
        file: `pages/${pageId}/visuals/${visualId}/visual.json`,
        before: visualFile,
        after: JSON.stringify(visualJson, null, 2)
      });
    }
  }

  return changes;
}

function updateMeasureInVisual(visualJson, oldName, newName) {
  const queryState = visualJson.query?.queryState;
  if (!queryState) return;

  for (const projection of Object.values(queryState)) {
    if (!projection.projections) continue;

    for (const proj of projection.projections) {
      if (proj.field?.Measure?.Property === oldName) {
        proj.field.Measure.Property = newName;
        proj.queryRef = proj.queryRef.replace(oldName, newName);
        if (proj.nativeQueryRef) {
          proj.nativeQueryRef = newName;
        }
      }
    }
  }
}
```

**Renaming a Column:**

Similar approach, but also update:
1. Column definition in table's `.tmdl` file
2. Relationship definitions in `relationships.tmdl`
3. All measure DAX expressions that reference the column
4. Visual field references in `visual.json` files

---

## Critical Files to Modify

**In the new project (pbip-impact-analyzer):**

| File | Purpose | Key Functions |
|------|---------|---------------|
| `index.html` | Main UI structure with tabs | Tab container, dropdowns, buttons |
| `app.js` | UI orchestration and event handlers | `init()`, `onAnalyzeClick()`, `onRefactorClick()` |
| `fileAccess.js` | File System Access API wrapper | `selectPBIPFolder()`, `readFile()`, `writeFile()` |
| `parsers.js` | Parse TMDL and JSON files | `parseMeasuresTMDL()`, `parseVisual()`, `extractReferences()` |
| `analyzer.js` | Dependency and impact analysis | `buildDependencyGraph()`, `analyzeImpact()` |
| `refactor.js` | Refactoring operations | `previewRename()`, `applyRename()` |
| `graph.js` | Dependency visualization (D3.js) | `renderGraph()`, `highlightNode()` |
| `styles.css` | Styling | Tab styles, list styles, diff view |

**Files to read from PBIP (Contoso example):**

**SemanticModel:**
- `import_contoso_sales.SemanticModel/definition/tables/Measure.tmdl` - All measures
- `import_contoso_sales.SemanticModel/definition/tables/*.tmdl` - Table/column definitions
- `import_contoso_sales.SemanticModel/definition/relationships.tmdl` - Relationships

**Report:**
- `import_contoso_sales.Report/definition/pages/pages.json` - Page list
- `import_contoso_sales.Report/definition/pages/*/page.json` - Page metadata
- `import_contoso_sales.Report/definition/pages/*/visuals/*/visual.json` - Visual field references

---

## Verification & Testing

### Manual Testing Checklist

**Test Case 1: Impact Analysis**
1. Open the app in browser
2. Select the Contoso PBIP folder
3. Wait for parsing to complete
4. Navigate to "Impact Analysis" tab
5. Select measure "Total Sales" from dropdown
6. Click "Analyze Impact"
7. Verify results show:
   - Affected measures (e.g., "Profit Margin" if it uses Total Sales)
   - Affected visuals (page name, visual type)
   - Total impact count
8. Repeat with a column (e.g., "sales.Quantity")

**Test Case 2: Safe Refactoring**
1. Navigate to "Safe Refactoring" tab
2. Select measure "Total Sales"
3. Enter new name "Total Revenue"
4. Click "Preview Changes"
5. Verify diff view shows:
   - Measure.tmdl: measure name change
   - Other measures: DAX expression updates
   - Visual.json files: field reference updates
6. Click "Apply Changes"
7. Open PBIP in Power BI Desktop
8. Verify measure was renamed correctly
9. Verify all visuals still work

**Test Case 3: Dependency Graph**
1. Navigate to "Dependency Graph" tab
2. Verify graph renders with nodes for measures, columns, visuals
3. Click on "Total Sales" measure node
4. Verify dependencies are highlighted
5. Export graph as SVG

### Edge Cases to Test

1. **Special characters in names**: Measure named `Sales %` or `Total Sales (USD)`
2. **Circular dependencies**: Measure A references Measure B, which references Measure A
3. **Large models**: 100+ measures, 50+ tables, 20+ report pages
4. **Missing references**: Visual references a measure that doesn't exist (orphaned)
5. **Multiple renames**: Rename measure A to B, then B to C in same session

### Performance Targets

- Parse model with 100 measures in < 2 seconds
- Build dependency graph in < 1 second
- Render dependency graph with 200 nodes in < 3 seconds
- Preview rename operation in < 500ms

---

## Project Name Justification

**Recommended:** `pbip-impact-analyzer`

**Why?**
- **Clear & Descriptive**: Immediately conveys what the tool does
- **Consistent Naming**: Follows convention with "pbip-" prefix (like pbip file format)
- **Professional**: Suitable for open source project
- **SEO-friendly**: Easy to find when searching "PBIP impact analysis"
- **Memorable**: Simple, not overly clever

**Alternative Names:**
- `power-bi-refactor-guardian` - More protective/defensive angle
- `semantic-model-impact-viewer` - More specific to semantic models
- `pbip-dependency-analyzer` - Focus on dependency analysis

---

## Next Steps

Once this plan is approved:

1. **Create new project folder**: `pbip-impact-analyzer/`
2. **Initialize Git repository**: Set up version control
3. **Implement Phase 1**: Set up file structure, implement parsers
4. **Iterate through phases**: Build incrementally with testing at each stage
5. **Deploy to GitHub Pages**: Make publicly accessible
6. **Share with community**: Power BI forums, LinkedIn, Twitter

This plan provides a clear roadmap from concept to deployment for a production-ready Power BI impact analysis tool.
