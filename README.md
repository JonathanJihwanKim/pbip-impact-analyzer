# PBIP Impact Analyzer

<img src="https://img.shields.io/github/stars/JonathanJihwanKim/pbip-impact-analyzer" alt="GitHub Stars" height="20"> <img src="https://img.shields.io/github/forks/JonathanJihwanKim/pbip-impact-analyzer" alt="GitHub Forks" height="20"> <img src="https://api.visitorbadge.io/api/visitors?path=JonathanJihwanKim%2Fpbip-impact-analyzer&label=visitors&countColor=%23263759" alt="Visitors" height="20"> <img src="https://img.shields.io/github/license/JonathanJihwanKim/pbip-impact-analyzer" alt="License: MIT" height="20">

Safely refactor Power BI semantic models with confidence.

A browser-based tool for Power BI developers working with PBIP (Power BI Project) folders. No installation, no dependencies, no sign-up. Just open it in your browser and go.

**[Launch the App](https://jonathanjihwankim.github.io/pbip-impact-analyzer/)** | **[Support Development](https://github.com/sponsors/JonathanJihwanKim)**

---

## Why This Tool?

Renaming a measure or column in a Power BI semantic model is risky. You can't easily see what depends on it -- other measures, visuals across multiple report pages, or relationship definitions buried in TMDL files. One wrong rename can break things silently.

PBIP Impact Analyzer solves this by scanning your entire PBIP folder and showing you the full picture before you change anything.

## Features

### Impact Analysis
- See every measure, column, and visual affected **before** making a change
- Upstream dependencies (what it needs) and downstream dependents (what uses it)
- Depth indicators show how far the impact reaches
- View the DAX formula for any referenced measure
- Export impact reports to CSV

### Dependency Lineage
- Visual horizontal diagram showing the full dependency chain
- Color-coded by type: Tables (purple), Columns (blue), Measures (green), Visuals (orange)
- Visuals grouped by report page for easy navigation
- Export lineage diagrams as PNG for documentation or sharing

### Safe Refactoring
- Rename measures and columns with a full before/after preview
- Side-by-side diff of every file that will change
- Automatic backup with rollback if anything goes wrong
- Name validation catches reserved DAX/TMDL keywords, special characters, and naming conflicts

### Built-in Safety Checks
- Circular dependency detection with warning banner on load
- Orphaned reference warnings for broken or missing refs
- Large model performance warnings (500+ measures)

## Getting Started

1. **[Launch the App](https://jonathanjihwankim.github.io/pbip-impact-analyzer/)** in Chrome or Edge
2. Click **Select PBIP Folder** and pick your Power BI Project folder
3. Start analyzing!

Works with any `.pbip` project folder. The app reads your SemanticModel and Report folders, auto-detects models, and builds the full dependency graph.

> **Browser support:** Chrome 86+, Edge 86+, Opera 72+, and other Chromium-based browsers. Firefox and Safari are not supported (they lack the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)).

## How to Use

### What's a PBIP Folder?

When you save a Power BI project in **PBIP (Power BI Project)** format, it stores your semantic model and report as separate files instead of a single `.pbix` file. A PBIP folder typically contains:
- `<name>.SemanticModel` — your data model (measures, tables, columns, relationships) in TMDL format
- `<name>.Report` (optional) — your report pages and visuals as JSON

### Tab 1: Impact Analysis

Select an object (measure, column, or visual) and choose **Rename** or **Delete** to see its full impact before making changes.

- **Upstream**: what this object depends on. **Downstream**: what uses it.
- Filter results by type or depth, search by name, or export to CSV.
- Toggle to **Delete** mode to see a risk score with direct and cascade breaks.

### Tab 2: Lineage

Click **View Lineage** from an impact analysis result to see a visual dependency diagram.

- Color-coded nodes: Tables (purple), Columns (blue), Measures (green), Visuals (orange).
- Search within the diagram or export as PNG for documentation.

### Tab 3: Safe Refactoring

Click **Proceed to Refactoring** or go directly to this tab to rename an object.

- Enter a new name and click **Preview Changes** to see side-by-side diffs of every affected file.
- Name validation catches reserved DAX keywords, special characters, and naming conflicts.
- Click **Apply All Changes** to write — the app creates a backup and rolls back automatically if anything fails.

> **Tip:** The app never modifies your files until you explicitly click "Apply All Changes." All analysis and previews are read-only.

## Contributing

Contributions are welcome! Please read the [Contributing Guide](.github/CONTRIBUTING.md) to get started. Check out the [Roadmap](docs/ROADMAP.md) for planned features.

## Keep This Tool Free & Updated

This tool saves hours of manual dependency tracing across TMDL files. Your support funds continuous updates as Microsoft ships PBIR/PBIP changes.

**Why sponsor?**
- Ensures ongoing compatibility with Power BI Desktop updates and new TMDL features
- Funds new features requested by the community
- Keeps the tool free for everyone

**Support options:**
- [Sponsor on GitHub](https://github.com/sponsors/JonathanJihwanKim) — monthly or one-time
- [Buy Me a Coffee](https://buymeacoffee.com/jihwankim) — quick one-time support
- ⭐ **Star this repo** — free, helps others discover it

## Also by Jihwan Kim

- **[PBIR Visual Manager](https://github.com/JonathanJihwanKim/isHiddenInViewMode)** — Bulk-manage filter visibility, layer order, and visual interactions in Power BI PBIR reports

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Author**: [Jonathan Jihwan Kim](https://github.com/JonathanJihwanKim)
