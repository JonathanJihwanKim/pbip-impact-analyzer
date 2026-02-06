# PBIP Impact Analyzer

<img src="https://img.shields.io/github/stars/JonathanJihwanKim/pbip-impact-analyzer" alt="GitHub Stars" height="20">
<img src="https://img.shields.io/github/forks/JonathanJihwanKim/pbip-impact-analyzer" alt="GitHub Forks" height="20">
<img src="https://api.visitorbadge.io/api/visitors?path=JonathanJihwanKim%2Fpbip-impact-analyzer&label=visitors&countColor=%23263759" alt="Visitors" height="20">
<img src="https://img.shields.io/github/license/JonathanJihwanKim/pbip-impact-analyzer" alt="License: MIT" height="20">

Safely refactor Power BI semantic models with confidence.

A browser-based tool for Power BI developers working with PBIP (Power BI Project) folders. No installation, no dependencies, no sign-up. Just open it in your browser and go.

**[Launch the App](https://jonathanjihwankim.github.io/pbip-impact-analyzer/)**

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

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) to get started. Check out the [Roadmap](ROADMAP.md) for planned features.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Author**: [Jonathan Jihwan Kim](https://github.com/JonathanJihwanKim)
