# Roadmap

## Completed Features

| Feature | Notes |
|---------|-------|
| File System Access API | Select PBIP folder, auto-detect SemanticModel/Report |
| TMDL Parsing | Measures, columns, tables, relationships |
| Report JSON Parsing | Pages, visuals, field references |
| DAX Reference Extraction | Regex-based, handles most common patterns |
| Dependency Graph | Nodes for measures, columns, visuals |
| Impact Analysis UI | Upstream/downstream split view with depth indicators |
| Lineage Visualization | Custom horizontal diagram |
| Refactor Preview | Shows before/after diff |
| Refactor Apply | File writes with backup/rollback |
| PNG Export | html2canvas integration |
| CSV Export | Export impact reports to CSV |
| Circular Dependency Detection | Warning banner on load |
| Orphaned Reference Detection | Info banner for broken refs |
| Large Model Warnings | Performance warnings for big models |

## Planned Enhancements

Contributions welcome! If you'd like to work on any of these, please open an issue first to discuss the approach.

### Documentation
- Add demo video/GIF to README
- Usage guide for each tab

### Export Improvements
- True SVG export (DOM to SVG conversion)
- PDF export functionality

### Testing
- Comprehensive test suite for parsers and analyzer

### Deployment
- GitHub Pages hosting for a live demo

---

Have an idea? [Open a feature request](https://github.com/JonathanJihwanKim/pbip-impact-analyzer/issues/new?template=feature_request.md)!
