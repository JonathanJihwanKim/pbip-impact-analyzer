# PBIP Impact Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-live-green)](https://jonathanjihwankim.github.io/pbip-impact-analyzer/)

A browser-based tool that helps Power BI developers safely refactor semantic models by analyzing the impact of renaming or deleting measures and columns across both SemanticModel (TMDL) and Report (JSON) folders.

**[Live Demo](https://jonathanjihwankim.github.io/pbip-impact-analyzer/)**

## Features

- **Impact Analysis**: Visualize what will be affected when renaming or deleting measures and columns
- **Safe Refactoring**: Rename measures and columns with a preview of all changes before applying
- **Dependency Lineage**: Interactive visualization of dependencies between measures, columns, and visuals
- **Browser-Based**: No installation required - runs entirely in your browser
- **PBIP Native**: Works directly with Power BI Project (.pbip) folders using the File System Access API

## How It Works

1. **Select your PBIP folder** - The tool reads your SemanticModel and Report folders
2. **Analyze impact** - See what measures, visuals, and relationships are affected by changes
3. **Preview changes** - Review all modifications before applying them
4. **Apply safely** - Make changes with confidence knowing the full impact

## Getting Started

### Prerequisites

- A modern Chromium-based browser (Chrome, Edge, Brave, etc.)
- A Power BI Project (.pbip) folder

### Usage

1. Open `index.html` in your browser (or visit the [live demo](https://jonathanjihwankim.github.io/pbip-impact-analyzer/))
2. Click "Select PBIP Folder" and choose your .pbip project folder
3. Wait for the tool to parse your files
4. Use the tabs to:
   - **Impact Analysis**: Analyze what will be affected
   - **Safe Refactoring**: Rename measures or columns
   - **Dependency Lineage**: Visualize dependencies

## Architecture

```
+-------------------------------------------------------------+
|                        User Interface                        |
|  +--------------+--------------+-------------------------+   |
|  | Impact Tab   | Refactor Tab | Dependency Lineage Tab  |   |
|  +--------------+--------------+-------------------------+   |
+-------------------------------------------------------------+
                            |
+-------------------------------------------------------------+
|                    Core Engine Layer                          |
|  +------------------+-----------------+------------------+   |
|  | Dependency       | Impact          | Refactoring      |   |
|  | Analyzer         | Analyzer        | Engine           |   |
|  +------------------+-----------------+------------------+   |
+-------------------------------------------------------------+
                            |
+-------------------------------------------------------------+
|                    Parser Layer                               |
|  +------------------+-----------------+------------------+   |
|  | TMDL Parser      | JSON Parser     | DAX Parser       |   |
|  +------------------+-----------------+------------------+   |
+-------------------------------------------------------------+
```

## File Structure

```
pbip-impact-analyzer/
├── index.html          # Main HTML page with tab structure
├── app.js              # Main application logic and UI orchestration
├── fileAccess.js       # File System Access API wrapper
├── parsers.js          # TMDL, JSON, and DAX parsers
├── analyzer.js         # Dependency and impact analysis engine
├── refactor.js         # Refactoring operations
├── graph.js            # Dependency graph visualization
├── styles.css          # Styling
├── LICENSE             # MIT License
├── CONTRIBUTING.md     # Contribution guidelines
├── CODE_OF_CONDUCT.md  # Code of conduct
└── ROADMAP.md          # Planned features and enhancements
```

## Technical Details

### Supported Operations

- **Measure Rename**: Updates measure definition, DAX references, and visual field references
- **Column Rename**: Updates column definition, DAX references, visual field references, and relationships
- **Impact Analysis**: Shows all affected measures, visuals, and relationships before making changes

### Parsing Strategy

- **TMDL Parsing**: Regex-based parsing for measures, tables, columns, and relationships
- **DAX Parsing**: Regex-based extraction of measure and column references
- **JSON Parsing**: Native JSON parsing for report visuals and pages

### Browser Compatibility

This tool uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API), which is supported in:

- Chrome 86+
- Edge 86+
- Opera 72+
- Other Chromium-based browsers

**Note**: Firefox and Safari do not currently support the File System Access API.

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built for the Power BI community.

Inspired by the need for better refactoring tools in Power BI development.

---

**Author**: Jonathan Jihwan Kim
**GitHub**: [JonathanJihwanKim](https://github.com/JonathanJihwanKim)
