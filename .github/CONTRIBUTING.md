# Contributing to PBIP Impact Analyzer

Thank you for your interest in contributing! This guide will help you get started.

## How to Contribute

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/JonathanJihwanKim/pbip-impact-analyzer/issues/new?template=bug_report.md) with:

- Your browser and version (e.g., Chrome 120, Edge 120)
- Steps to reproduce the issue
- What you expected to happen
- What actually happened
- Screenshots if applicable

### Suggesting Features

Have an idea? [Open a feature request](https://github.com/JonathanJihwanKim/pbip-impact-analyzer/issues/new?template=feature_request.md) describing:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Submitting Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main` (`git checkout -b feature/my-feature`)
3. **Make your changes**
4. **Test** by opening `index.html` in a Chromium browser and verifying your changes work
5. **Commit** with a clear message describing what you changed and why
6. **Push** to your fork and open a pull request

## Development Setup

This project has **zero build steps** and **no dependencies to install**.

1. Clone the repo:
   ```bash
   git clone https://github.com/JonathanJihwanKim/pbip-impact-analyzer.git
   ```
2. Open `index.html` in a Chromium-based browser (Chrome, Edge, Brave, etc.)
3. That's it!

### Browser Requirements

The File System Access API is required, so you need a Chromium-based browser:
- Chrome 86+
- Edge 86+
- Opera 72+

Firefox and Safari are **not supported**.

### Testing Your Changes

1. Open `index.html` in your browser
2. Click "Select PBIP Folder" and load a Power BI Project folder
3. Test across all three tabs: Impact Analysis, Lineage, and Safe Refactoring
4. Verify no console errors appear in the browser developer tools

## Project Structure

| File | Purpose |
|------|---------|
| `index.html` | Main HTML page with tab structure |
| `src/app.js` | Application orchestration and UI event handling |
| `src/analyzer.js` | Dependency graph building and analysis |
| `src/parsers.js` | TMDL, JSON, and DAX parsers |
| `src/fileAccess.js` | File System Access API wrapper |
| `src/refactor.js` | Rename preview and apply operations |
| `src/graph.js` | Lineage visualization and PNG export |
| `src/sessionManager.js` | Session persistence, recent analyses, favorites |
| `src/styles.css` | All styling |

## Code Style

- This is a vanilla JavaScript project (no frameworks, no transpilers)
- Use `const` and `let` (no `var`)
- Use descriptive function and variable names
- Keep functions focused on a single responsibility

## Questions?

Feel free to open an issue or start a [discussion](https://github.com/JonathanJihwanKim/pbip-impact-analyzer/discussions).
