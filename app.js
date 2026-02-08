/**
 * Main Application Module
 * Orchestrates UI interactions and coordinates between modules
 */

/**
 * SearchableSelect - Custom searchable dropdown component
 * Wraps a native <select> with a text input + filtered dropdown list.
 */
class SearchableSelect {
    /**
     * @param {string} selectId - ID of the native <select> to enhance
     * @param {Object} options - Configuration options
     * @param {Function} options.onChange - Callback when selection changes
     */
    constructor(selectId, options = {}) {
        this.nativeSelect = document.getElementById(selectId);
        if (!this.nativeSelect) return;

        this.onChange = options.onChange || null;
        this.isOpen = false;
        this.highlightedIndex = -1;
        this.filteredOptions = [];

        this._build();
        this._bindEvents();
    }

    /** Build the custom dropdown DOM */
    _build() {
        // Hide native select
        this.nativeSelect.style.display = 'none';

        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'searchable-select';

        // Search input
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'searchable-select-input';
        this.input.placeholder = 'Type to search...';
        this.input.autocomplete = 'off';

        // Dropdown list
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'searchable-select-dropdown';

        // Result count
        this.countEl = document.createElement('div');
        this.countEl.className = 'searchable-select-count';

        this.wrapper.appendChild(this.input);
        this.wrapper.appendChild(this.dropdown);
        this.wrapper.appendChild(this.countEl);

        // Insert after native select
        this.nativeSelect.parentNode.insertBefore(this.wrapper, this.nativeSelect.nextSibling);
    }

    /** Bind event listeners */
    _bindEvents() {
        this.input.addEventListener('input', () => this._onInput());
        this.input.addEventListener('focus', () => this._open());
        this.input.addEventListener('keydown', (e) => this._onKeydown(e));

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this._close();
            }
        });
    }

    /** Handle text input */
    _onInput() {
        this._filter(this.input.value);
        this._open();
    }

    /** Filter options by query */
    _filter(query) {
        const q = query.toLowerCase().trim();
        const allOptions = Array.from(this.nativeSelect.options).slice(1); // skip placeholder

        this.filteredOptions = allOptions.filter(opt =>
            opt.textContent.toLowerCase().includes(q)
        );

        this._renderDropdown();
        this.highlightedIndex = -1;
    }

    /** Render the filtered dropdown */
    _renderDropdown() {
        this.dropdown.innerHTML = '';

        if (this.filteredOptions.length === 0) {
            this.dropdown.innerHTML = '<div class="searchable-select-empty">No matches</div>';
            this.countEl.textContent = '0 results';
            return;
        }

        // Limit visible items for performance
        const maxVisible = 100;
        const visibleOptions = this.filteredOptions.slice(0, maxVisible);

        visibleOptions.forEach((opt, idx) => {
            const item = document.createElement('div');
            item.className = 'searchable-select-item';
            item.textContent = opt.textContent;
            item.title = opt.textContent;
            item.dataset.value = opt.value;
            item.dataset.index = idx;
            item.addEventListener('click', () => this._selectItem(opt));
            item.addEventListener('mouseenter', () => {
                this.highlightedIndex = idx;
                this._updateHighlight();
            });
            this.dropdown.appendChild(item);
        });

        const total = this.filteredOptions.length;
        const query = this.input.value.trim();
        if (query) {
            this.countEl.textContent = `${total} result${total !== 1 ? 's' : ''} matching "${query}"`;
        } else {
            this.countEl.textContent = `${total} item${total !== 1 ? 's' : ''}`;
        }
    }

    /** Select an item */
    _selectItem(opt) {
        this.nativeSelect.value = opt.value;
        this.input.value = opt.textContent;
        this._close();

        // Trigger change event on native select
        this.nativeSelect.dispatchEvent(new Event('change'));
        if (this.onChange) this.onChange(opt.value);
    }

    /** Handle keyboard navigation */
    _onKeydown(e) {
        if (!this.isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                this._open();
                e.preventDefault();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredOptions.length - 1);
            this._updateHighlight();
            this._scrollToHighlighted();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
            this._updateHighlight();
            this._scrollToHighlighted();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredOptions.length) {
                this._selectItem(this.filteredOptions[this.highlightedIndex]);
            }
        } else if (e.key === 'Escape') {
            this._close();
        }
    }

    /** Update visual highlight */
    _updateHighlight() {
        const items = this.dropdown.querySelectorAll('.searchable-select-item');
        items.forEach((item, idx) => {
            item.classList.toggle('highlighted', idx === this.highlightedIndex);
        });
    }

    /** Scroll dropdown to keep highlighted item visible */
    _scrollToHighlighted() {
        const items = this.dropdown.querySelectorAll('.searchable-select-item');
        if (items[this.highlightedIndex]) {
            items[this.highlightedIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    /** Open dropdown */
    _open() {
        if (!this.isOpen) {
            this._filter(this.input.value);
            this.isOpen = true;
            this.dropdown.classList.add('open');
        }
    }

    /** Close dropdown */
    _close() {
        this.isOpen = false;
        this.dropdown.classList.remove('open');
        this.highlightedIndex = -1;
    }

    /** Refresh options (call after native select options change) */
    refresh() {
        this.input.value = '';
        this._filter('');
        this._close();
    }

    /** Set value programmatically */
    setValue(value) {
        const opt = Array.from(this.nativeSelect.options).find(o => o.value === value);
        if (opt) {
            this.nativeSelect.value = value;
            this.input.value = opt.textContent;
        }
    }

    /** Clear the input */
    clear() {
        this.input.value = '';
        this.nativeSelect.value = '';
        this._close();
    }
}

// Sponsor configuration — edit this array to add/remove sponsors
const SPONSORS = [
    // { name: 'Example Corp', logo: 'assets/sponsors/example.png', url: 'https://example.com' },
];

// Global state
let fileAccessManager;
let dependencyAnalyzer;
let refactoringEngine;
let graphVisualizer;
let sessionManager;
let parsedData = {
    measures: [],
    tables: [],
    visuals: [],
    relationships: [],
    pages: []
};
let currentImpactResult = null; // Store current impact analysis result

// Searchable select instances
let impactObjectSearch = null;
let refactorObjectSearch = null;

// Filter state (persists across tab switches)
let filterState = {
    searchText: '',
    typeFilters: { measure: true, column: true, table: true, visual: true },
    maxDepth: 0 // 0 = show all
};

/**
 * Initialize application
 */
function init() {
    console.log('Initializing PBIP Impact Analyzer...');

    // Initialize managers
    fileAccessManager = new FileAccessManager();
    dependencyAnalyzer = new DependencyAnalyzer();
    refactoringEngine = new RefactoringEngine(dependencyAnalyzer, fileAccessManager);
    graphVisualizer = new GraphVisualizer('graphContainer');
    sessionManager = new SessionManager();

    // Check browser support
    if (!fileAccessManager.isSupported()) {
        showError('File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.');
        document.getElementById('selectFolderBtn').disabled = true;
        return;
    }

    // Set up event listeners
    setupEventListeners();

    // Render sponsor bar if sponsors are configured
    renderSponsors();

    // Restore session state
    restoreSessionState();

    console.log('Application initialized successfully');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Folder selection
    document.getElementById('selectFolderBtn').addEventListener('click', handleFolderSelection);

    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Impact Analysis tab
    document.getElementById('objectTypeSelect').addEventListener('change', handleObjectTypeChange);
    document.getElementById('objectSelect').addEventListener('change', handleObjectSelectChange);
    document.getElementById('pageSelect').addEventListener('change', handlePageSelectChange);
    document.getElementById('visualSelect').addEventListener('change', handleVisualSelectChange);
    document.getElementById('analyzeBtn').addEventListener('click', handleAnalyzeImpact);

    // Operation toggle (rename vs delete)
    document.querySelectorAll('.op-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.op-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const analyzeBtn = document.getElementById('analyzeBtn');
            analyzeBtn.textContent = btn.dataset.op === 'delete' ? 'Analyze Delete Impact' : 'Analyze Rename Impact';
        });
    });

    // Safe Refactoring tab
    document.getElementById('refactorTypeSelect').addEventListener('change', handleRefactorTypeChange);
    document.getElementById('refactorObjectSelect').addEventListener('change', handleRefactorObjectChange);
    document.getElementById('newNameInput').addEventListener('input', handleNewNameInput);
    document.getElementById('previewBtn').addEventListener('click', handlePreviewRefactor);

    // Dependency Graph tab (export only)
    document.getElementById('exportGraphBtn').addEventListener('click', handleExportGraph);

    // Initialize searchable selects
    impactObjectSearch = new SearchableSelect('objectSelect');
    refactorObjectSearch = new SearchableSelect('refactorObjectSelect');

    // Impact results filter bar
    const impactSearchInput = document.getElementById('impactSearchInput');
    if (impactSearchInput) {
        impactSearchInput.addEventListener('input', () => {
            filterState.searchText = impactSearchInput.value;
            applyResultsFilter();
        });
    }

    // Type filter checkboxes
    document.querySelectorAll('.filter-chip-input').forEach(cb => {
        cb.addEventListener('change', () => {
            filterState.typeFilters[cb.dataset.filter] = cb.checked;
            applyResultsFilter();
        });
    });

    // Depth filter buttons
    document.querySelectorAll('.depth-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.depth-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterState.maxDepth = parseInt(btn.dataset.depth) || 0;
            applyResultsFilter();
        });
    });

    // Lineage search
    const lineageSearchInput = document.getElementById('lineageSearchInput');
    if (lineageSearchInput) {
        lineageSearchInput.addEventListener('input', () => {
            applyLineageSearch(lineageSearchInput.value);
        });
    }
}

/**
 * Handle folder selection
 */
async function handleFolderSelection() {
    try {
        showLoading(true, 'Analyzing folder structure...');

        // Step 1: Always ask user to select PROJECT folder first
        const folderHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
        });

        if (!folderHandle) {
            showLoading(false);
            return; // User cancelled
        }

        fileAccessManager.folderHandle = folderHandle;

        // Analyze what was selected
        const analysis = await fileAccessManager.analyzeFolder(folderHandle);

        // Route based on what was selected
        if (analysis.isSemanticModel) {
            // User selected SemanticModel directly - show helpful error
            showError(
                'You selected a SemanticModel folder directly.\n\n' +
                'To discover related Report folders, please select the PROJECT folder instead.\n\n' +
                'The PROJECT folder is the parent folder that contains:\n' +
                '- One or more .SemanticModel folders\n' +
                '- One or more .Report folders\n\n' +
                `You selected: ${folderHandle.name}\n` +
                'Please select the folder one level up and try again.'
            );
            showLoading(false);
            return;
        }

        if (analysis.isReport) {
            // User selected Report directly - show helpful error
            showError(
                'You selected a Report folder directly.\n\n' +
                'To discover the correct structure, please select the PROJECT folder instead.\n\n' +
                'The PROJECT folder is the parent folder that contains:\n' +
                '- One or more .SemanticModel folders\n' +
                '- One or more .Report folders\n\n' +
                `You selected: ${folderHandle.name}\n` +
                'Please select the folder one level up and try again.'
            );
            showLoading(false);
            return;
        }

        // Step 2: Show SemanticModel picker
        if (analysis.semanticModels.length === 0) {
            throw new Error(
                'No .SemanticModel folders found in the selected folder.\n\n' +
                'Please select a PBIP project folder that contains:\n' +
                '- At least one .SemanticModel folder\n' +
                '- Optionally, one or more .Report folders\n\n' +
                `Selected: ${folderHandle.name}`
            );
        } else if (analysis.semanticModels.length === 1) {
            // Auto-select the only one
            fileAccessManager.semanticModelHandle = analysis.semanticModels[0].handle;
            console.log(`Auto-selected SemanticModel: ${analysis.semanticModels[0].name}`);
        } else {
            // Show picker for multiple
            await showSemanticModelPicker(analysis.semanticModels);
        }

        // Step 3: Discover and show related Reports
        await handleReportDiscovery();

    } catch (error) {
        if (error.name !== 'AbortError' && error.message !== 'User cancelled') {
            console.error('Error selecting folder:', error);
            showError(error.message);
        }
        showLoading(false);
    }
}

/**
 * Get page display name from pageId
 * @param {string} pageId - The page ID (folder name)
 * @returns {string} The display name or pageId if not found
 */
function getPageDisplayName(pageId) {
    const page = parsedData.pages.find(p => p.pageId === pageId);
    const displayName = page?.content?.displayName;
    // Fallback to pageId if displayName is missing or empty
    return displayName && displayName.trim() !== '' ? displayName : pageId;
}

/**
 * Load and parse PBIP files
 */
async function loadPBIPFiles() {
    console.log('Loading PBIP files...');

    // Read semantic model files
    showLoading(true, 'Reading semantic model files...');
    const semanticModelFiles = await fileAccessManager.readSemanticModelFiles();

    // Parse measures
    showLoading(true, 'Parsing measures...');
    if (semanticModelFiles.measures) {
        parsedData.measures = TMDLParser.parseMeasuresTMDL(semanticModelFiles.measures.content);
    }

    // Parse tables
    showLoading(true, `Parsing ${semanticModelFiles.tables.length} tables...`);
    parsedData.tables = [];
    const tableParseErrors = [];
    for (let i = 0; i < semanticModelFiles.tables.length; i++) {
        const tableFile = semanticModelFiles.tables[i];
        if (i % 5 === 0) { // Update every 5 tables to avoid too many DOM updates
            showLoading(true, `Parsing tables (${i + 1}/${semanticModelFiles.tables.length})...`);
        }
        try {
            const tableData = TMDLParser.parseTableTMDL(tableFile.content, tableFile.fileName);
            parsedData.tables.push(tableData);
        } catch (error) {
            console.warn(`Failed to parse table ${tableFile.fileName}:`, error);
            tableParseErrors.push(tableFile.fileName);
        }
    }

    // Parse relationships
    showLoading(true, 'Parsing relationships...');
    if (semanticModelFiles.relationships) {
        parsedData.relationships = TMDLParser.parseRelationshipsTMDL(semanticModelFiles.relationships.content);
    }

    // Read report files
    showLoading(true, 'Reading report files...');
    const reportFiles = await fileAccessManager.readReportFiles();

    // Store pages for display name lookup
    parsedData.pages = reportFiles.pages || [];

    // Parse visuals
    const totalVisuals = reportFiles.visuals.length;
    showLoading(true, `Parsing ${totalVisuals} visuals...`);
    parsedData.visuals = [];
    for (let i = 0; i < reportFiles.visuals.length; i++) {
        const visualFile = reportFiles.visuals[i];
        if (i % 10 === 0) { // Update every 10 visuals
            showLoading(true, `Parsing visuals (${i + 1}/${totalVisuals})...`);
        }
        const visualData = JSONParser.parseVisual(visualFile.content);
        parsedData.visuals.push({
            pageId: visualFile.pageId,
            visualId: visualFile.visualId,
            visualType: visualData.visualType,
            visualName: visualData.visualName,
            fields: visualData.fields,
            pageName: getPageDisplayName(visualFile.pageId),
            position: visualData.position
        });
    }

    // Build dependency graph
    showLoading(true, 'Building dependency graph...');

    // Build dependency graph
    dependencyAnalyzer.buildDependencyGraph(parsedData);

    // Check for circular dependencies
    const circularDeps = dependencyAnalyzer.detectCircularDependencies();
    if (circularDeps.length > 0) {
        displayCircularDependencyWarning(circularDeps);
    }

    // Update UI
    updateModelStats();
    populateObjectSelects();

    // Initialize graph with placeholder (will update after impact analysis)
    graphVisualizer.clear();

    // Update selection summary
    updateSelectionSummary();

    // Save folder metadata to session
    if (sessionManager) {
        sessionManager.saveLastFolder(
            fileAccessManager.folderHandle?.name || '',
            fileAccessManager.semanticModelHandle?.name || '',
            fileAccessManager.reportHandle?.name || ''
        );
        // Hide the last-folder hint after a fresh load
        const hintEl = document.getElementById('lastFolderHint');
        if (hintEl) hintEl.classList.add('hidden');
    }

    // Show model stats and enable tabs
    document.getElementById('modelStats').classList.remove('hidden');
    document.getElementById('tabNav').style.display = 'flex';

    showLoading(false);

    // Warn user about any table files that failed to parse
    if (tableParseErrors.length > 0) {
        showError(`Warning: ${tableParseErrors.length} table(s) could not be parsed and were skipped:\n\n${tableParseErrors.join('\n')}\n\nThe remaining tables were loaded successfully.`);
    }

    // Success feedback is provided by the populated stats and project info
}

/**
 * Update selection summary display
 */
function updateSelectionSummary() {
    const summarySection = document.getElementById('selectionSummary');
    const projectEl = document.getElementById('selectedProject');
    const semanticModelEl = document.getElementById('selectedSemanticModel');
    const reportEl = document.getElementById('selectedReport');

    if (fileAccessManager.folderHandle) {
        projectEl.textContent = fileAccessManager.folderHandle.name;
    }

    if (fileAccessManager.semanticModelHandle) {
        semanticModelEl.textContent = fileAccessManager.semanticModelHandle.name;
    }

    if (fileAccessManager.reportHandle) {
        reportEl.textContent = fileAccessManager.reportHandle.name;
    } else {
        reportEl.textContent = 'None (SemanticModel only)';
    }

    summarySection.classList.remove('hidden');
}

/**
 * Update model statistics display
 */
function updateModelStats() {
    const stats = dependencyAnalyzer.getStatistics();

    document.getElementById('measureCount').textContent = stats.measureCount;
    document.getElementById('tableCount').textContent = stats.tableCount;
    document.getElementById('columnCount').textContent = stats.columnCount;
    document.getElementById('visualCount').textContent = stats.visualCount;

    // Show orphaned references warning if any exist
    if (stats.orphanedCount > 0) {
        displayOrphanedReferencesWarning(stats);
    }

    // Show large model warning if thresholds exceeded
    if (stats.measureCount > 500 || stats.columnCount > 1000 || stats.totalNodes > 2000) {
        displayLargeModelWarning(stats);
    }
}

/**
 * Populate object selection dropdowns
 */
function populateObjectSelects() {
    // Impact Analysis tab
    populateImpactObjectSelect();

    // Refactoring tab
    populateRefactorObjectSelect();
}

/**
 * Populate impact analysis object select
 */
function populateImpactObjectSelect() {
    const typeSelect = document.getElementById('objectTypeSelect');
    const objectSelect = document.getElementById('objectSelect');

    const type = typeSelect.value;

    if (!type) {
        objectSelect.innerHTML = '<option value="">-- Select a measure or column --</option>';
        return;
    }

    objectSelect.innerHTML = '<option value="">-- Select a ' + type + ' --</option>';

    if (type === 'measure') {
        parsedData.measures.forEach(measure => {
            const option = document.createElement('option');
            option.value = `Measure.${measure.name}`;
            option.textContent = measure.name;
            objectSelect.appendChild(option);
        });
    } else if (type === 'column') {
        parsedData.tables.forEach(table => {
            table.columns.forEach(column => {
                const option = document.createElement('option');
                option.value = `${table.tableName}.${column.name}`;
                option.textContent = `${table.tableName}.${column.name}`;
                objectSelect.appendChild(option);
            });
        });
    }

    // Refresh searchable select
    if (impactObjectSearch) impactObjectSearch.refresh();
}

/**
 * Populate refactor object select
 */
function populateRefactorObjectSelect() {
    const typeSelect = document.getElementById('refactorTypeSelect');
    const objectSelect = document.getElementById('refactorObjectSelect');

    const type = typeSelect.value;

    objectSelect.innerHTML = '<option value="">-- Select a ' + type + ' to rename --</option>';

    if (type === 'measure') {
        parsedData.measures.forEach(measure => {
            const option = document.createElement('option');
            option.value = measure.name;
            option.dataset.type = 'measure';
            option.textContent = measure.name;
            objectSelect.appendChild(option);
        });
    } else if (type === 'column') {
        parsedData.tables.forEach(table => {
            table.columns.forEach(column => {
                const option = document.createElement('option');
                option.value = `${table.tableName}.${column.name}`;
                option.dataset.type = 'column';
                option.dataset.table = table.tableName;
                option.dataset.column = column.name;
                option.textContent = `${table.tableName}.${column.name}`;
                objectSelect.appendChild(option);
            });
        });
    } else if (type === 'table') {
        parsedData.tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table.tableName;
            option.dataset.type = 'table';
            option.textContent = table.tableName;
            objectSelect.appendChild(option);
        });
    }

    // Refresh searchable select
    if (refactorObjectSearch) refactorObjectSearch.refresh();
}

/**
 * Handle object type change in impact analysis
 */
function handleObjectTypeChange() {
    const typeSelect = document.getElementById('objectTypeSelect');
    const objectSelect = document.getElementById('objectSelect');
    const objectSelectGroup = document.getElementById('objectSelectGroup');
    const visualPickerGroup = document.getElementById('visualPickerGroup');
    const visualSelectGroup = document.getElementById('visualSelectGroup');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const impactResults = document.getElementById('impactResults');
    const placeholder = document.getElementById('impactPlaceholder');

    // Save object type to session
    if (sessionManager && typeSelect.value) {
        sessionManager.saveSettings({ lastObjectType: typeSelect.value });
    }

    if (typeSelect.value === 'visual') {
        // Show visual picker, hide regular object select (and its searchable wrapper)
        objectSelectGroup.classList.add('hidden');
        visualPickerGroup.classList.remove('hidden');
        visualSelectGroup.classList.remove('hidden');
        populatePageSelect();
        analyzeBtn.disabled = true;
    } else {
        // Show regular object select, hide visual picker
        objectSelectGroup.classList.remove('hidden');
        visualPickerGroup.classList.add('hidden');
        visualSelectGroup.classList.add('hidden');

        if (!typeSelect.value) {
            objectSelect.innerHTML = '<option value="">-- Select a measure or column --</option>';
            if (impactObjectSearch) impactObjectSearch.refresh();
            analyzeBtn.disabled = true;
        } else {
            populateImpactObjectSelect();
        }
    }

    // Hide results, show placeholder
    impactResults.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
}

/**
 * Handle object select change
 */
function handleObjectSelectChange() {
    const objectSelect = document.getElementById('objectSelect');
    const analyzeBtn = document.getElementById('analyzeBtn');

    analyzeBtn.disabled = !objectSelect.value;
}

/**
 * Populate the page select dropdown for visual analysis
 */
function populatePageSelect() {
    const pageSelect = document.getElementById('pageSelect');
    const visualSelect = document.getElementById('visualSelect');

    pageSelect.innerHTML = '<option value="">-- Select a page --</option>';
    visualSelect.innerHTML = '<option value="">-- Select a visual --</option>';

    if (!parsedData.pages || parsedData.pages.length === 0) {
        pageSelect.innerHTML = '<option value="">No report loaded</option>';
        return;
    }

    // Get unique pages that have visuals
    const pagesWithVisuals = new Set(parsedData.visuals.map(v => v.pageId));

    parsedData.pages.forEach(page => {
        const pageId = page.pageId || page.name;
        if (!pagesWithVisuals.has(pageId)) return;

        const option = document.createElement('option');
        option.value = pageId;
        const displayName = page.content?.displayName || page.displayName || pageId;
        option.textContent = displayName;
        pageSelect.appendChild(option);
    });
}

/**
 * Populate the visual select dropdown for the selected page
 * @param {string} pageId - The selected page ID
 */
function populateVisualSelect(pageId) {
    const visualSelect = document.getElementById('visualSelect');
    visualSelect.innerHTML = '<option value="">-- Select a visual --</option>';

    if (!pageId) return;

    const pageVisuals = parsedData.visuals.filter(v => v.pageId === pageId);

    pageVisuals.forEach(visual => {
        const option = document.createElement('option');
        option.value = `${visual.pageId}/${visual.visualId}`;
        const displayName = visual.visualName || visual.visualId;
        option.textContent = `${visual.visualType} - ${displayName}`;
        visualSelect.appendChild(option);
    });
}

/**
 * Handle page select change
 */
function handlePageSelectChange() {
    const pageSelect = document.getElementById('pageSelect');
    const analyzeBtn = document.getElementById('analyzeBtn');

    populateVisualSelect(pageSelect.value);
    analyzeBtn.disabled = true;
}

/**
 * Handle visual select change
 */
function handleVisualSelectChange() {
    const visualSelect = document.getElementById('visualSelect');
    const analyzeBtn = document.getElementById('analyzeBtn');

    analyzeBtn.disabled = !visualSelect.value;

    // Show minimap preview in sidebar when visual is selected
    const existingPreview = document.querySelector('.sidebar-visual-preview');
    if (existingPreview) existingPreview.remove();

    if (visualSelect.value) {
        const parts = visualSelect.value.split('/');
        const pageId = parts[0];
        const visualId = parts[1];
        const visual = parsedData.visuals.find(v => v.pageId === pageId && v.visualId === visualId);

        if (visual) {
            const miniMapHtml = renderVisualMiniMap(visual);
            if (miniMapHtml) {
                const wrapper = document.createElement('div');
                wrapper.className = 'sidebar-visual-preview';
                wrapper.innerHTML = miniMapHtml;
                const visualSelectGroup = document.getElementById('visualSelectGroup');
                visualSelectGroup.after(wrapper);
            }
        }
    }
}

/**
 * Render a mini-map showing the visual's position on the page
 * @param {Object} visual - Visual object with position data
 * @returns {string} HTML string for the mini-map
 */
function renderVisualMiniMap(visual) {
    if (!visual || !visual.position) return '';

    // Standard Power BI page dimensions (16:9)
    const pageWidth = 1280;
    const pageHeight = 720;

    const left = (visual.position.x / pageWidth) * 100;
    const top = (visual.position.y / pageHeight) * 100;
    const width = (visual.position.width / pageWidth) * 100;
    const height = (visual.position.height / pageHeight) * 100;

    // Use center point for zone detection
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const hZone = centerX < 33 ? 'left' : centerX < 66 ? 'center' : 'right';
    const vZone = centerY < 33 ? 'top' : centerY < 66 ? 'middle' : 'bottom';
    const posLabel = vZone === 'middle' && hZone === 'center'
        ? 'center'
        : `${vZone}-${hZone}`;

    return `
        <div class="visual-position-info">
            <div class="visual-minimap">
                <div class="visual-minimap-highlight"
                     style="left:${left}%;top:${top}%;width:${width}%;height:${height}%">
                </div>
            </div>
            <span class="visual-position-label">
                ${escapeHtml(visual.visualType)} &middot; ${posLabel} area
            </span>
        </div>
    `;
}

/**
 * Handle analyze impact button click
 */
function handleAnalyzeImpact() {
    const typeSelect = document.getElementById('objectTypeSelect');
    let nodeId;

    if (typeSelect.value === 'visual') {
        const visualSelect = document.getElementById('visualSelect');
        nodeId = visualSelect.value;
    } else {
        const objectSelect = document.getElementById('objectSelect');
        nodeId = objectSelect.value;
    }

    if (!nodeId) return;

    // Check operation mode
    const activeOp = document.querySelector('.op-toggle-btn.active');
    const operation = activeOp ? activeOp.dataset.op : 'rename';

    if (operation === 'delete') {
        // Perform delete analysis
        const result = dependencyAnalyzer.analyzeDelete(nodeId);
        currentImpactResult = { nodeId, result, operation: 'delete' };
        displayDeleteResults(result);

        // Record in session history
        if (sessionManager) {
            sessionManager.addRecentAnalysis(nodeId, result.targetName, result.targetType);
            refreshQuickAccessPanel();
        }

        // Still update lineage with the rename view for context
        const renameResult = dependencyAnalyzer.analyzeImpactEnhanced(nodeId, 'rename');
        graphVisualizer.renderMiniLineage(nodeId, renameResult);
    } else {
        // Perform enhanced impact analysis
        const result = dependencyAnalyzer.analyzeImpactEnhanced(nodeId, 'rename');
        currentImpactResult = { nodeId, result, operation: 'rename' };

        // Record in session history
        if (sessionManager) {
            sessionManager.addRecentAnalysis(nodeId, result.targetName, result.targetType);
            refreshQuickAccessPanel();
        }

        displayImpactResults(result);
        graphVisualizer.renderMiniLineage(nodeId, result);
    }
}

/**
 * Display enhanced impact analysis results
 */
function displayImpactResults(result) {
    const resultsContainer = document.getElementById('impactResults');
    const placeholder = document.getElementById('impactPlaceholder');
    const isVisual = result.targetType === 'visual';

    // Check for error
    if (result.error) {
        console.error('Impact analysis error:', result.error);
        showError(`Impact analysis failed: ${result.error}`);
        return;
    }

    // Hide placeholder, show results
    if (placeholder) placeholder.classList.add('hidden');

    // Display selected object with DAX
    document.getElementById('selectedObjectName').textContent = result.targetName;

    // Update favorite toggle button
    updateFavoriteButton(result.targetNode);
    const favBtn = document.getElementById('favoriteToggleBtn');
    if (favBtn) {
        favBtn.onclick = () => {
            sessionManager.toggleFavorite(result.targetNode, result.targetName, result.targetType);
            updateFavoriteButton(result.targetNode);
            refreshQuickAccessPanel();
        };
    }

    const daxContainer = document.getElementById('selectedObjectDAX');
    if (result.targetDAX) {
        daxContainer.innerHTML = `<pre><code>${escapeHtml(result.targetDAX)}</code></pre>`;
        daxContainer.classList.remove('hidden');
    } else {
        daxContainer.classList.add('hidden');
    }

    // Clean up any delete-mode elements
    const selectedPanel = document.querySelector('.selected-object-panel');
    const existingRiskBadge = selectedPanel.querySelector('.delete-risk-badge');
    if (existingRiskBadge) existingRiskBadge.remove();

    // Restore upstream/downstream column headers from delete mode
    document.querySelector('.upstream-column h3').textContent = 'Upstream Dependencies';
    document.querySelector('.downstream-column h3').textContent = 'Downstream Dependents';

    // Restore section toggle labels
    const tablesToggle = document.querySelector('[data-section="upstream-tables"]');
    const columnsToggle = document.querySelector('[data-section="upstream-columns"]');
    const measuresToggle = document.querySelector('[data-section="upstream-measures"]');
    // These will be updated with correct counts by displayUpstreamDependencies

    // For visuals: show mini-map and summary above results
    const existingMiniMap = selectedPanel.querySelector('.visual-position-info');
    const existingVisualSummary = selectedPanel.querySelector('.visual-upstream-summary');
    if (existingMiniMap) existingMiniMap.remove();
    if (existingVisualSummary) existingVisualSummary.remove();

    if (isVisual) {
        // Find the visual data for the mini-map
        const nodeId = result.targetNode;
        const parts = nodeId.split('/');
        const pageId = parts[0];
        const visualId = parts[1];
        const visual = parsedData.visuals.find(v => v.pageId === pageId && v.visualId === visualId);

        if (visual) {
            const miniMapHtml = renderVisualMiniMap(visual);
            if (miniMapHtml) {
                selectedPanel.insertAdjacentHTML('beforeend', miniMapHtml);
            }
        }

        // Add visual summary
        const upstream = result.upstream;
        const measureCount = upstream.measures ? upstream.measures.length : 0;
        const columnCount = upstream.columns ? upstream.columns.length : 0;
        const tableCount = upstream.tables ? upstream.tables.length : 0;
        const summaryParts = [];
        if (measureCount > 0) summaryParts.push(`${measureCount} measure${measureCount !== 1 ? 's' : ''}`);
        if (columnCount > 0) summaryParts.push(`${columnCount} column${columnCount !== 1 ? 's' : ''}`);
        if (tableCount > 0) summaryParts.push(`from ${tableCount} table${tableCount !== 1 ? 's' : ''}`);

        if (summaryParts.length > 0) {
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'visual-upstream-summary';
            summaryDiv.textContent = `This visual uses ${summaryParts.join(', ')}`;
            selectedPanel.appendChild(summaryDiv);
        }
    }

    // Display upstream dependencies
    displayUpstreamDependencies(result.upstream, result.targetName, result.targetType);

    // Display downstream dependents
    displayDownstreamDependents(result.downstream, result.targetName, result.targetType);

    // For visuals, collapse the downstream column since visuals have no downstream dependents
    const downstreamColumn = document.querySelector('.downstream-column');
    if (downstreamColumn) {
        if (isVisual) {
            downstreamColumn.classList.add('hidden');
        } else {
            downstreamColumn.classList.remove('hidden');
        }
    }

    // Adjust split view layout for visuals (full-width upstream)
    const splitView = document.querySelector('.impact-split-view');
    if (splitView) {
        if (isVisual) {
            splitView.classList.add('visual-upstream-only');
        } else {
            splitView.classList.remove('visual-upstream-only');
        }
    }

    // Setup section toggle handlers
    document.querySelectorAll('.section-toggle').forEach(btn => {
        btn.addEventListener('click', handleSectionToggle);
    });

    // Update action buttons
    updateImpactActionButtons(result);

    resultsContainer.classList.remove('hidden');

    // Apply any active filters
    applyResultsFilter();
}

/**
 * Display delete analysis results
 * @param {Object} result - Delete analysis result from analyzeDelete()
 */
function displayDeleteResults(result) {
    const resultsContainer = document.getElementById('impactResults');
    const placeholder = document.getElementById('impactPlaceholder');

    if (result.error) {
        console.error('Delete analysis error:', result.error);
        return;
    }

    if (placeholder) placeholder.classList.add('hidden');

    // Display selected object header
    document.getElementById('selectedObjectName').textContent = `DELETE: ${result.targetName}`;

    const daxContainer = document.getElementById('selectedObjectDAX');
    if (result.targetDAX) {
        daxContainer.innerHTML = `<pre><code>${escapeHtml(result.targetDAX)}</code></pre>`;
        daxContainer.classList.remove('hidden');
    } else {
        daxContainer.classList.add('hidden');
    }

    // Clean up any visual-specific elements from rename mode
    const selectedPanel = document.querySelector('.selected-object-panel');
    const existingMiniMap = selectedPanel.querySelector('.visual-position-info');
    const existingVisualSummary = selectedPanel.querySelector('.visual-upstream-summary');
    const existingRiskBadge = selectedPanel.querySelector('.delete-risk-badge');
    if (existingMiniMap) existingMiniMap.remove();
    if (existingVisualSummary) existingVisualSummary.remove();
    if (existingRiskBadge) existingRiskBadge.remove();

    // Add risk badge
    const riskBadge = document.createElement('div');
    riskBadge.className = `delete-risk-badge risk-${result.riskLevel}`;
    const riskIcons = { safe: 'check_circle', caution: 'warning', dangerous: 'dangerous' };
    const riskLabels = { safe: 'Safe to Delete', caution: 'Caution', dangerous: 'Dangerous' };
    riskBadge.innerHTML = `<span class="material-symbols-outlined">${riskIcons[result.riskLevel]}</span> ${riskLabels[result.riskLevel]} — ${result.totalBreaks} break${result.totalBreaks !== 1 ? 's' : ''}`;
    if (result.safeMessage) {
        riskBadge.innerHTML += `<span class="risk-detail">${escapeHtml(result.safeMessage)}</span>`;
    }
    selectedPanel.appendChild(riskBadge);

    // Use the split view for direct vs cascade breaks
    const splitView = document.querySelector('.impact-split-view');
    splitView.classList.remove('visual-upstream-only');

    // Upstream column becomes "Direct Breaks"
    const upstreamColumn = document.querySelector('.upstream-column');
    upstreamColumn.querySelector('h3').textContent = 'Direct Breaks';
    const directTotal = result.directBreaks.measures.length + result.directBreaks.visuals.length + result.directBreaks.relationships.length;
    document.getElementById('upstreamCount').textContent = directTotal;

    // Repurpose upstream sections for direct breaks
    document.getElementById('upstreamTablesCount').textContent = result.directBreaks.relationships.length;
    document.querySelector('[data-section="upstream-tables"]').innerHTML = `<span class="toggle-icon material-symbols-outlined">expand_more</span> Relationships (${result.directBreaks.relationships.length})`;
    const relList = document.getElementById('upstreamTablesList');
    relList.innerHTML = '';
    if (result.directBreaks.relationships.length === 0) {
        relList.innerHTML = '<div class="empty-results">No relationship breaks</div>';
    } else {
        result.directBreaks.relationships.forEach(rel => {
            const div = document.createElement('div');
            div.className = 'dependency-item depth-1 break-item';
            div.innerHTML = `<div class="dependency-item-header"><span class="dependency-item-name broken-ref">${escapeHtml(rel.fromTable)}[${escapeHtml(rel.fromColumn)}] → ${escapeHtml(rel.toTable)}[${escapeHtml(rel.toColumn)}]</span><span class="depth-badge break-badge">Relationship</span></div>`;
            relList.appendChild(div);
        });
    }

    document.getElementById('upstreamColumnsCount').textContent = result.directBreaks.measures.length;
    document.querySelector('[data-section="upstream-columns"]').innerHTML = `<span class="toggle-icon material-symbols-outlined">expand_more</span> Measures (${result.directBreaks.measures.length})`;
    const directMeasuresList = document.getElementById('upstreamColumnsList');
    directMeasuresList.innerHTML = '';
    if (result.directBreaks.measures.length === 0) {
        directMeasuresList.innerHTML = '<div class="empty-results">No measure breaks</div>';
    } else {
        result.directBreaks.measures.forEach(m => {
            const item = createDeleteBreakItem(m, 'measure', result.targetName);
            directMeasuresList.appendChild(item);
        });
    }

    document.getElementById('upstreamMeasuresCount').textContent = result.directBreaks.visuals.length;
    document.querySelector('[data-section="upstream-measures"]').innerHTML = `<span class="toggle-icon material-symbols-outlined">expand_more</span> Visuals (${result.directBreaks.visuals.length})`;
    const directVisualsList = document.getElementById('upstreamMeasuresList');
    directVisualsList.innerHTML = '';
    if (result.directBreaks.visuals.length === 0) {
        directVisualsList.innerHTML = '<div class="empty-results">No visual breaks</div>';
    } else {
        result.directBreaks.visuals.forEach(v => {
            const item = createDeleteBreakItem(v, 'visual', result.targetName);
            directVisualsList.appendChild(item);
        });
    }

    // Downstream column becomes "Cascade Breaks"
    const downstreamColumn = document.querySelector('.downstream-column');
    downstreamColumn.classList.remove('hidden');
    downstreamColumn.querySelector('h3').textContent = 'Cascade Breaks';
    const cascadeTotal = result.cascadeBreaks.measures.length + result.cascadeBreaks.visuals.length;
    document.getElementById('downstreamCount').textContent = cascadeTotal;

    document.getElementById('downstreamMeasuresCount').textContent = result.cascadeBreaks.measures.length;
    const cascadeMeasuresList = document.getElementById('downstreamMeasuresList');
    cascadeMeasuresList.innerHTML = '';
    if (result.cascadeBreaks.measures.length === 0) {
        cascadeMeasuresList.innerHTML = '<div class="empty-results">No cascade measure breaks</div>';
    } else {
        result.cascadeBreaks.measures.forEach(m => {
            const item = createDeleteBreakItem(m, 'measure', result.targetName);
            cascadeMeasuresList.appendChild(item);
        });
    }

    document.getElementById('downstreamVisualsCount').textContent = result.cascadeBreaks.visuals.length;
    const cascadeVisualsList = document.getElementById('downstreamVisualsList');
    cascadeVisualsList.innerHTML = '';
    if (result.cascadeBreaks.visuals.length === 0) {
        cascadeVisualsList.innerHTML = '<div class="empty-results">No cascade visual breaks</div>';
    } else {
        result.cascadeBreaks.visuals.forEach(v => {
            const item = createDeleteBreakItem(v, 'visual', result.targetName);
            cascadeVisualsList.appendChild(item);
        });
    }

    // Setup section toggle handlers
    document.querySelectorAll('.section-toggle').forEach(btn => {
        btn.addEventListener('click', handleSectionToggle);
    });

    // Show action buttons (hide refactor btn for delete mode)
    const actionsContainer = document.getElementById('impactActions');
    if (actionsContainer) actionsContainer.classList.remove('hidden');
    const refactorBtn = document.getElementById('proceedToRefactorBtn');
    if (refactorBtn) refactorBtn.classList.add('hidden');
    const lineageBtn = document.getElementById('viewLineageBtn');
    if (lineageBtn) lineageBtn.onclick = () => switchTab('graph');
    const csvBtn = document.getElementById('exportCSVBtn');
    if (csvBtn) csvBtn.onclick = () => exportDeleteAsCSV(result);

    resultsContainer.classList.remove('hidden');
}

/**
 * Create a break item element for delete analysis
 */
function createDeleteBreakItem(item, type, deletedName) {
    const div = document.createElement('div');
    div.className = `dependency-item depth-${Math.min(item.depth || 1, 4)} break-item`;

    const header = document.createElement('div');
    header.className = 'dependency-item-header';

    const name = document.createElement('span');
    name.className = 'dependency-item-name';
    if (type === 'measure') {
        name.innerHTML = `<span class="broken-ref">${escapeHtml(item.name)}</span>`;
    } else if (type === 'visual') {
        const displayName = item.visualName || item.visualId;
        name.innerHTML = `<span class="broken-ref">${escapeHtml(displayName)}</span>`;
    }
    header.appendChild(name);

    const badge = document.createElement('span');
    badge.className = 'depth-badge break-badge';
    badge.textContent = item.depth === 1 ? 'Direct' : `Cascade (depth ${item.depth})`;
    header.appendChild(badge);

    div.appendChild(header);

    if (type === 'visual') {
        const details = document.createElement('div');
        details.className = 'dependency-item-details';
        details.textContent = `Page: ${item.pageName} | Type: ${item.visualType}`;
        div.appendChild(details);
    }

    // Show DAX with broken reference highlighted for measures
    if (type === 'measure' && item.dax) {
        const daxExpandable = document.createElement('div');
        daxExpandable.className = 'dax-expandable';

        const daxBtn = document.createElement('button');
        daxBtn.className = 'dax-toggle-btn';
        daxBtn.textContent = 'Show DAX';

        const daxCode = document.createElement('div');
        daxCode.className = 'dax-code-container';
        // Highlight the deleted name in the DAX
        const highlightedDAX = highlightBrokenRef(item.dax, deletedName);
        daxCode.innerHTML = `<pre>${highlightedDAX}</pre>`;

        daxBtn.onclick = () => toggleDAX(daxBtn, daxCode);
        daxExpandable.appendChild(daxBtn);
        daxExpandable.appendChild(daxCode);
        div.appendChild(daxExpandable);
    }

    return div;
}

/**
 * Highlight broken references in DAX code
 */
function highlightBrokenRef(dax, refName) {
    if (!dax || !refName) return escapeHtml(dax);
    // Escape the DAX first, then highlight the reference
    const escaped = escapeHtml(dax);
    const escapedRef = escapeHtml(refName);
    // Match [RefName] or 'Table'[RefName] patterns in the escaped text
    const pattern = new RegExp(`(\\[${escapedRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\])`, 'gi');
    return escaped.replace(pattern, '<span class="broken-ref-highlight">$1</span>');
}

/**
 * Export delete analysis as CSV
 */
function exportDeleteAsCSV(result) {
    if (!result) {
        alert('No delete analysis results to export');
        return;
    }

    const rows = [];
    rows.push(['Deleted Object', 'Object Type', 'Risk Level', 'Break Type', 'Broken Item', 'Item Type', 'Depth']);

    const objectName = result.targetName;
    const objectType = result.targetType;
    const risk = result.riskLevel;

    // Direct breaks
    result.directBreaks.measures.forEach(item => {
        rows.push([objectName, objectType, risk, 'Direct', item.name, 'Measure', item.depth]);
    });
    result.directBreaks.visuals.forEach(item => {
        const visualName = item.pageName ? `${item.pageName}/${item.visualId}` : item.visualId;
        rows.push([objectName, objectType, risk, 'Direct', visualName, 'Visual', item.depth]);
    });
    result.directBreaks.relationships.forEach(rel => {
        const relName = `${rel.fromTable}[${rel.fromColumn}] -> ${rel.toTable}[${rel.toColumn}]`;
        rows.push([objectName, objectType, risk, 'Direct', relName, 'Relationship', 1]);
    });

    // Cascade breaks
    result.cascadeBreaks.measures.forEach(item => {
        rows.push([objectName, objectType, risk, 'Cascade', item.name, 'Measure', item.depth]);
    });
    result.cascadeBreaks.visuals.forEach(item => {
        const visualName = item.pageName ? `${item.pageName}/${item.visualId}` : item.visualId;
        rows.push([objectName, objectType, risk, 'Cascade', visualName, 'Visual', item.depth]);
    });

    const csvContent = rows.map(row =>
        row.map(cell => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `delete-impact-${objectName}-${timestamp}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);

    showNotification(`CSV exported: ${rows.length - 1} breaks`, 'success');
}

/**
 * Update action buttons after impact analysis
 */
function updateImpactActionButtons(result) {
    // Show action buttons container
    const actionsContainer = document.getElementById('impactActions');
    if (actionsContainer) {
        actionsContainer.classList.remove('hidden');
    }

    // Setup Proceed to Refactoring button (hide for visuals - can't rename visuals)
    const refactorBtn = document.getElementById('proceedToRefactorBtn');
    if (refactorBtn) {
        if (result.targetType === 'visual') {
            refactorBtn.classList.add('hidden');
        } else {
            refactorBtn.classList.remove('hidden');
            refactorBtn.onclick = () => proceedToRefactoring(result);
        }
    }

    // Setup View Lineage button
    const lineageBtn = document.getElementById('viewLineageBtn');
    if (lineageBtn) {
        lineageBtn.onclick = () => {
            switchTab('graph');
        };
    }

    // Setup Export CSV button
    const csvBtn = document.getElementById('exportCSVBtn');
    if (csvBtn) {
        csvBtn.onclick = () => exportImpactAsCSV(result);
    }
}

/**
 * Proceed to refactoring with current selection
 */
function proceedToRefactoring(result) {
    // Switch to refactoring tab
    switchTab('refactor');

    // Set the object type
    const typeSelect = document.getElementById('refactorTypeSelect');
    typeSelect.value = result.targetType;
    populateRefactorObjectSelect();

    // Set the selected object (update both native select and searchable wrapper)
    let targetValue;
    if (result.targetType === 'measure') {
        targetValue = result.targetName;
    } else if (result.targetType === 'column') {
        // For columns, the value format is "table.column"
        targetValue = result.targetNode.replace('Measure.', '');
    }
    if (targetValue) {
        document.getElementById('refactorObjectSelect').value = targetValue;
        if (refactorObjectSearch) refactorObjectSearch.setValue(targetValue);
    }

    // Focus on new name input
    const newNameInput = document.getElementById('newNameInput');
    newNameInput.focus();
    updatePreviewButton();
}

/**
 * Display upstream dependencies
 * @param {Object} upstream - Upstream dependencies object
 * @param {string} targetName - Name of the analyzed object
 * @param {string} targetType - Type of the analyzed object (measure/column)
 */
function displayUpstreamDependencies(upstream, targetName, targetType) {
    // Restore toggle labels (may have been overwritten by delete mode)
    document.querySelector('[data-section="upstream-tables"]').innerHTML =
        `<span class="toggle-icon material-symbols-outlined">expand_more</span> Tables (<span id="upstreamTablesCount">0</span>)`;
    document.querySelector('[data-section="upstream-columns"]').innerHTML =
        `<span class="toggle-icon material-symbols-outlined">expand_more</span> Columns (<span id="upstreamColumnsCount">0</span>)`;
    document.querySelector('[data-section="upstream-measures"]').innerHTML =
        `<span class="toggle-icon material-symbols-outlined">expand_more</span> Measures (<span id="upstreamMeasuresCount">0</span>)`;

    // Update counts
    document.getElementById('upstreamCount').textContent = upstream.totalCount || 0;
    document.getElementById('upstreamTablesCount').textContent = upstream.tables.length;
    document.getElementById('upstreamColumnsCount').textContent = upstream.columns.length;
    document.getElementById('upstreamMeasuresCount').textContent = upstream.measures.length;

    // Display tables
    const tablesContainer = document.getElementById('upstreamTablesList');
    tablesContainer.innerHTML = '';
    if (upstream.tables.length === 0) {
        tablesContainer.innerHTML = `<div class="empty-results">No table dependencies for "${escapeHtml(targetName)}"</div>`;
    } else {
        upstream.tables.forEach(table => {
            const item = createDependencyItem(table, 'table');
            tablesContainer.appendChild(item);
        });
    }

    // Display columns
    const columnsContainer = document.getElementById('upstreamColumnsList');
    columnsContainer.innerHTML = '';
    if (upstream.columns.length === 0) {
        const hint = targetType === 'measure' ? ' - this measure uses no column references' : '';
        columnsContainer.innerHTML = `<div class="empty-results">No column dependencies${hint}</div>`;
    } else {
        upstream.columns.forEach(column => {
            const item = createDependencyItem(column, 'column');
            columnsContainer.appendChild(item);
        });
    }

    // Display measures
    const measuresContainer = document.getElementById('upstreamMeasuresList');
    measuresContainer.innerHTML = '';
    if (upstream.measures.length === 0) {
        const hint = targetType === 'measure' ? ' - this measure uses no [OtherMeasure] references' : '';
        measuresContainer.innerHTML = `<div class="empty-results">No measure dependencies${hint}</div>`;
    } else {
        upstream.measures.forEach(measure => {
            const item = createDependencyItem(measure, 'measure', true);
            measuresContainer.appendChild(item);
        });
    }
}

/**
 * Display downstream dependents
 * @param {Object} downstream - Downstream dependents object
 * @param {string} targetName - Name of the analyzed object
 * @param {string} targetType - Type of the analyzed object (measure/column)
 */
function displayDownstreamDependents(downstream, targetName, targetType) {
    // Update counts
    document.getElementById('downstreamCount').textContent = downstream.totalCount || 0;
    document.getElementById('downstreamMeasuresCount').textContent = downstream.measures.length;
    document.getElementById('downstreamVisualsCount').textContent = downstream.visuals.length;
    document.getElementById('downstreamCalcItemsCount').textContent = (downstream.calculationItems || []).length;
    document.getElementById('downstreamFieldParamsCount').textContent = (downstream.fieldParameters || []).length;

    // Display measures
    const measuresContainer = document.getElementById('downstreamMeasuresList');
    measuresContainer.innerHTML = '';
    if (downstream.measures.length === 0) {
        measuresContainer.innerHTML = `<div class="empty-results">No measures reference "${escapeHtml(targetName)}" - safe to rename!</div>`;
    } else {
        downstream.measures.forEach(measure => {
            const item = createDependencyItem(measure, 'measure', true);
            measuresContainer.appendChild(item);
        });
    }

    // Display calculation items
    const calcItemsContainer = document.getElementById('downstreamCalcItemsList');
    calcItemsContainer.innerHTML = '';
    const calcItems = downstream.calculationItems || [];
    if (calcItems.length === 0) {
        calcItemsContainer.innerHTML = '<div class="empty-results">No calculation items reference this object</div>';
    } else {
        calcItems.forEach(calcItem => {
            const item = createDependencyItem(calcItem, 'calculationItem', true);
            calcItemsContainer.appendChild(item);
        });
    }

    // Display field parameters
    const fieldParamsContainer = document.getElementById('downstreamFieldParamsList');
    fieldParamsContainer.innerHTML = '';
    const fieldParams = downstream.fieldParameters || [];
    if (fieldParams.length === 0) {
        fieldParamsContainer.innerHTML = '<div class="empty-results">No field parameters reference this object</div>';
    } else {
        fieldParams.forEach(fp => {
            const item = createDependencyItem(fp, 'fieldParameter');
            fieldParamsContainer.appendChild(item);
        });
    }

    // Display visuals
    const visualsContainer = document.getElementById('downstreamVisualsList');
    visualsContainer.innerHTML = '';
    if (downstream.visuals.length === 0) {
        visualsContainer.innerHTML = `<div class="empty-results">No visuals use "${escapeHtml(targetName)}" directly</div>`;
    } else {
        downstream.visuals.forEach(visual => {
            const item = createDependencyItem(visual, 'visual');
            visualsContainer.appendChild(item);
        });
    }
}

/**
 * Create a dependency item element
 */
function createDependencyItem(item, type, showDAX = false) {
    const div = document.createElement('div');
    div.className = `dependency-item depth-${Math.min(item.depth || 1, 4)}`;

    // Header with name and depth
    const header = document.createElement('div');
    header.className = 'dependency-item-header';

    const name = document.createElement('span');
    name.className = 'dependency-item-name';

    if (type === 'measure') {
        name.textContent = item.name;
    } else if (type === 'column') {
        name.textContent = `${item.table}[${item.column}]`;
    } else if (type === 'table') {
        name.textContent = item.tableName;
    } else if (type === 'visual') {
        const displayName = item.visualName || item.visualId;
        name.textContent = displayName;
    } else if (type === 'calculationItem') {
        name.textContent = item.name;
    } else if (type === 'calculationGroup') {
        name.textContent = item.name;
    } else if (type === 'fieldParameter') {
        name.textContent = item.name;
    }

    header.appendChild(name);

    // Depth badge
    const depthBadge = document.createElement('span');
    depthBadge.className = 'depth-badge';
    depthBadge.textContent = `Depth: ${item.depth || 1}`;
    header.appendChild(depthBadge);

    div.appendChild(header);

    // Add details for visuals
    if (type === 'visual') {
        const details = document.createElement('div');
        details.className = 'dependency-item-details';
        details.textContent = `Page: ${item.pageName} | Type: ${item.visualType}`;
        div.appendChild(details);
    }

    // Add details for calculation items
    if (type === 'calculationItem') {
        const details = document.createElement('div');
        details.className = 'dependency-item-details';
        details.textContent = `Calculation Group: ${item.tableName}${item.usesSelectedMeasure ? ' | Uses SELECTEDMEASURE()' : ''}`;
        div.appendChild(details);
    }

    // Add details for field parameters
    if (type === 'fieldParameter') {
        const details = document.createElement('div');
        details.className = 'dependency-item-details';
        details.textContent = `Field Parameter Table`;
        div.appendChild(details);
    }

    // Add DAX expandable for measures
    if (showDAX && item.dax) {
        const daxExpandable = document.createElement('div');
        daxExpandable.className = 'dax-expandable';

        const daxBtn = document.createElement('button');
        daxBtn.className = 'dax-toggle-btn';
        daxBtn.textContent = 'Show DAX';

        const daxCode = document.createElement('div');
        daxCode.className = 'dax-code-container';
        daxCode.innerHTML = `<pre>${escapeHtml(item.dax)}</pre>`;

        daxBtn.onclick = () => toggleDAX(daxBtn, daxCode);

        daxExpandable.appendChild(daxBtn);
        daxExpandable.appendChild(daxCode);
        div.appendChild(daxExpandable);
    }

    return div;
}

/**
 * Toggle DAX code visibility
 */
function toggleDAX(button, codeContainer) {
    if (codeContainer.classList.contains('expanded')) {
        codeContainer.classList.remove('expanded');
        button.textContent = 'Show DAX';
    } else {
        codeContainer.classList.add('expanded');
        button.textContent = 'Hide DAX';
    }
}

/**
 * Handle section toggle
 */
function handleSectionToggle(event) {
    const button = event.currentTarget;
    const section = button.dataset.section;
    const list = document.getElementById(`${section}List`);

    button.classList.toggle('collapsed');
    list.classList.toggle('collapsed');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Create result item element
 */
function createResultItem(header, details, code = null) {
    const item = document.createElement('div');
    item.className = 'result-item';

    const headerEl = document.createElement('div');
    headerEl.className = 'result-item-header';
    headerEl.textContent = header;
    item.appendChild(headerEl);

    const detailsEl = document.createElement('div');
    detailsEl.className = 'result-item-details';
    detailsEl.textContent = details;
    item.appendChild(detailsEl);

    if (code) {
        const codeEl = document.createElement('div');
        codeEl.className = 'result-item-code';
        codeEl.textContent = code.substring(0, 300) + (code.length > 300 ? '...' : '');
        item.appendChild(codeEl);
    }

    return item;
}

/**
 * Handle refactor type change
 */
function handleRefactorTypeChange() {
    populateRefactorObjectSelect();
    document.getElementById('previewResults').classList.add('hidden');
}

/**
 * Handle refactor object change
 */
function handleRefactorObjectChange() {
    const objectSelect = document.getElementById('refactorObjectSelect');
    const newNameInput = document.getElementById('newNameInput');

    newNameInput.value = '';
    updatePreviewButton();
}

/**
 * Handle new name input
 */
function handleNewNameInput() {
    updatePreviewButton();
}

/**
 * Update preview button state
 */
function updatePreviewButton() {
    const objectSelect = document.getElementById('refactorObjectSelect');
    const newNameInput = document.getElementById('newNameInput');
    const previewBtn = document.getElementById('previewBtn');

    previewBtn.disabled = !objectSelect.value || !newNameInput.value.trim();
}

/**
 * Handle preview refactor button click
 */
async function handlePreviewRefactor() {
    const typeSelect = document.getElementById('refactorTypeSelect');
    const objectSelect = document.getElementById('refactorObjectSelect');
    const newNameInput = document.getElementById('newNameInput');

    const type = typeSelect.value;
    const selectedOption = objectSelect.options[objectSelect.selectedIndex];
    const newName = newNameInput.value.trim();

    let oldName, tableName = null;

    if (type === 'measure') {
        oldName = selectedOption.value;
    } else if (type === 'column') {
        tableName = selectedOption.dataset.table;
        oldName = selectedOption.dataset.column;
    } else if (type === 'table') {
        oldName = selectedOption.value;
    }

    try {
        // Preview changes
        const changes = await refactoringEngine.previewRename(oldName, newName, type, tableName);

        // Display preview
        displayRefactorPreview(changes);

        // Show preview results
        document.getElementById('previewResults').classList.remove('hidden');

    } catch (error) {
        console.error('Error previewing refactor:', error);
        const oldName = document.getElementById('refactorObjectSelect').selectedOptions[0]?.textContent || 'selected object';
        const newName = document.getElementById('newNameInput').value || 'new name';
        showError(`Error previewing rename from "${oldName}" to "${newName}":\n\n${error.message}\n\nPlease check the name and try again.`);
    }
}

/**
 * Display refactor preview
 */
function displayRefactorPreview(changes) {
    const changesList = document.getElementById('changesList');
    const placeholder = document.getElementById('refactorPlaceholder');

    changesList.innerHTML = '';

    // Hide placeholder
    if (placeholder) placeholder.classList.add('hidden');

    if (changes.length === 0) {
        changesList.innerHTML = '<div class="empty-results">No changes needed</div>';
        return;
    }

    changes.forEach(change => {
        const item = createChangeItem(change);
        changesList.appendChild(item);
    });

    // Set up apply/cancel buttons
    const applyBtn = document.getElementById('applyChangesBtn');
    const cancelBtn = document.getElementById('cancelChangesBtn');

    applyBtn.onclick = handleApplyChanges;
    cancelBtn.onclick = () => {
        document.getElementById('previewResults').classList.add('hidden');
        const refactorPlaceholder = document.getElementById('refactorPlaceholder');
        if (refactorPlaceholder) refactorPlaceholder.classList.remove('hidden');
    };
}

/**
 * Create change item element
 */
function createChangeItem(change) {
    const item = document.createElement('div');
    item.className = 'change-item';

    const header = document.createElement('div');
    header.className = 'change-header';
    header.textContent = `${change.file} - ${change.description}`;
    item.appendChild(header);

    const diff = document.createElement('div');
    diff.className = 'change-diff';

    const before = document.createElement('div');
    before.className = 'diff-column diff-before';
    before.innerHTML = `<h4>Before:</h4><div class="diff-code">${escapeHtml(change.oldContent)}</div>`;
    diff.appendChild(before);

    const after = document.createElement('div');
    after.className = 'diff-column diff-after';
    after.innerHTML = `<h4>After:</h4><div class="diff-code">${escapeHtml(change.newContent)}</div>`;
    diff.appendChild(after);

    item.appendChild(diff);

    return item;
}

/**
 * Handle apply changes button click
 */
async function handleApplyChanges() {
    if (!confirm('Are you sure you want to apply these changes? This will modify your PBIP files.')) {
        return;
    }

    try {
        showLoading(true, 'Applying changes to files...');

        // Apply changes
        const result = await refactoringEngine.applyChanges();

        showLoading(false);
        showSuccess(`Changes applied successfully! ${result.filesModified} files modified.`);

        // Reload data
        await loadPBIPFiles();

        // Hide preview
        document.getElementById('previewResults').classList.add('hidden');

    } catch (error) {
        console.error('Error applying changes:', error);

        // Provide detailed error message with context
        let errorDetails = error.message;
        if (error.message.includes('rollback')) {
            errorDetails += '\n\nYour original files have been restored.';
        } else if (error.message.includes('permission')) {
            errorDetails += '\n\nTip: Make sure no other application has the files open.';
        }

        showError(`Failed to apply refactoring changes:\n\n${errorDetails}`);
        showLoading(false);
    }
}

/**
 * Handle export graph button click
 */
function handleExportGraph() {
    graphVisualizer.exportAsSVG();
}

/**
 * Export impact analysis results as CSV
 * @param {Object} result - The impact analysis result object
 */
function exportImpactAsCSV(result) {
    if (!result) {
        alert('No impact analysis results to export');
        return;
    }

    // Build CSV data
    const rows = [];

    // Header row
    rows.push(['Selected Object', 'Object Type', 'Direction', 'Dependency Name', 'Dependency Type', 'Depth']);

    const objectName = result.targetName;
    const objectType = result.targetType;

    // Add upstream dependencies
    if (result.upstream) {
        // Tables
        if (result.upstream.tables) {
            result.upstream.tables.forEach(item => {
                rows.push([objectName, objectType, 'Upstream', item.name, 'Table', item.depth || 1]);
            });
        }

        // Columns
        if (result.upstream.columns) {
            result.upstream.columns.forEach(item => {
                const colName = item.table ? `${item.table}[${item.name}]` : item.name;
                rows.push([objectName, objectType, 'Upstream', colName, 'Column', item.depth || 1]);
            });
        }

        // Measures
        if (result.upstream.measures) {
            result.upstream.measures.forEach(item => {
                rows.push([objectName, objectType, 'Upstream', item.name, 'Measure', item.depth || 1]);
            });
        }
    }

    // Add downstream dependencies
    if (result.downstream) {
        // Measures
        if (result.downstream.measures) {
            result.downstream.measures.forEach(item => {
                rows.push([objectName, objectType, 'Downstream', item.name, 'Measure', item.depth || 1]);
            });
        }

        // Visuals
        if (result.downstream.visuals) {
            result.downstream.visuals.forEach(item => {
                const visualName = item.pageName ? `${item.pageName}/${item.visualId}` : item.visualId;
                rows.push([objectName, objectType, 'Downstream', visualName, 'Visual', item.depth || 1]);
            });
        }
    }

    // Convert to CSV string
    const csvContent = rows.map(row =>
        row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(',')
    ).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `impact-report-${objectName}-${timestamp}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);

    // Show success notification
    showNotification(`CSV exported: ${rows.length - 1} dependencies`, 'success');
}

/**
 * Show a notification message (reusable)
 * @param {string} message - The message to display
 * @param {string} type - 'info', 'success', or 'error'
 */
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.querySelector('.app-notification');
    if (existing) {
        existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `app-notification app-notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds (longer for errors)
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, type === 'error' ? 5000 : 3000);
}

/**
 * Switch tab
 */
function switchTab(tabName) {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panes
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === tabName);
    });

    // Save active tab to session
    if (sessionManager) {
        sessionManager.saveSettings({ lastTab: tabName });
    }

    // When switching to refactoring tab, preserve selection from Impact Analysis
    if (tabName === 'refactor') {
        const impactTypeSelect = document.getElementById('objectTypeSelect');
        const impactObjectSelect = document.getElementById('objectSelect');

        if (impactTypeSelect.value && impactObjectSelect.value) {
            const refactorTypeSelect = document.getElementById('refactorTypeSelect');
            refactorTypeSelect.value = impactTypeSelect.value;
            populateRefactorObjectSelect();

            const refactorObjectSelect = document.getElementById('refactorObjectSelect');
            // Map the impact object value to refactor object value
            if (impactTypeSelect.value === 'measure') {
                // Impact uses "Measure.name", refactor uses "name"
                const measureName = impactObjectSelect.value.replace('Measure.', '');
                refactorObjectSelect.value = measureName;
            } else if (impactTypeSelect.value === 'column') {
                // Both use "table.column" format
                refactorObjectSelect.value = impactObjectSelect.value;
            }
            updatePreviewButton();
        }
    }
}

/**
 * Create a picker modal for selection
 */
function createPickerModal({ title, subtitle, message, options, onSelect, onCancel }) {
    const modal = document.createElement('div');
    modal.className = 'picker-modal-overlay';

    const content = document.createElement('div');
    content.className = 'picker-modal-content';

    let html = `<h2>${title}</h2>`;
    if (subtitle) html += `<p class="subtitle">${subtitle}</p>`;
    if (message) html += `<p class="message">${message}</p>`;

    html += '<div class="picker-options">';

    options.forEach((option, index) => {
        if (option.type === 'section') {
            html += `<div class="picker-section-header">${option.label}</div>`;
        } else if (option.type === 'divider') {
            html += '<hr class="picker-divider">';
        } else {
            const id = `option-${index}`;
            const badge = option.badge ? `<span class="badge">${option.badge}</span>` : '';
            const icon = option.icon ? `<span class="icon">${option.icon}</span>` : '';
            const subtitle = option.subtitle ? `<span class="option-subtitle">${option.subtitle}</span>` : '';

            html += `
                <label class="picker-option ${option.recommended ? 'recommended' : ''}">
                    <input type="radio" name="picker" value="${index}" id="${id}">
                    <span class="option-content">
                        ${icon}
                        <span class="option-label">${option.label} ${badge}</span>
                        ${subtitle}
                    </span>
                </label>
            `;
        }
    });

    html += '</div>';
    html += `
        <div class="picker-buttons">
            <button class="btn btn-secondary" id="pickerCancelBtn">Cancel</button>
            <button class="btn btn-primary" id="pickerConfirmBtn" disabled>Continue</button>
        </div>
    `;

    content.innerHTML = html;
    modal.appendChild(content);

    // Event listeners
    const radioInputs = content.querySelectorAll('input[type="radio"]');
    const confirmBtn = content.querySelector('#pickerConfirmBtn');
    const cancelBtn = content.querySelector('#pickerCancelBtn');

    let selectedValue = null;

    radioInputs.forEach((radio) => {
        radio.addEventListener('change', () => {
            const optionIndex = parseInt(radio.value);
            selectedValue = options[optionIndex].value;
            confirmBtn.disabled = false;
        });
    });

    confirmBtn.addEventListener('click', () => {
        onSelect(selectedValue);
    });

    cancelBtn.addEventListener('click', () => onCancel());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) onCancel();
    });

    return modal;
}

/**
 * Show semantic model picker modal
 */
async function showSemanticModelPicker(semanticModels) {
    return new Promise((resolve, reject) => {
        const modal = createPickerModal({
            title: 'Select Semantic Model',
            message: `Found ${semanticModels.length} Semantic Models. Choose one to analyze:`,
            options: semanticModels.map(sm => ({
                value: sm.handle,
                label: sm.name,
                subtitle: `Base name: ${sm.baseName}`
            })),
            onSelect: async (selectedHandle) => {
                fileAccessManager.semanticModelHandle = selectedHandle;
                document.body.removeChild(modal);
                resolve();
            },
            onCancel: () => {
                document.body.removeChild(modal);
                showLoading(false);
                reject(new Error('User cancelled'));
            }
        });

        document.body.appendChild(modal);
    });
}

/**
 * Handle report discovery after semantic model selection
 */
async function handleReportDiscovery() {
    showLoading(true, 'Discovering reports...');

    const { matchingReports } =
        await fileAccessManager.discoverReports(fileAccessManager.semanticModelHandle);

    // Always show picker (even with 0 or 1 matching reports)
    // This gives users the choice to proceed without a report
    await showReportPicker(matchingReports);
}

/**
 * Show report picker modal
 */
async function showReportPicker(matchingReports) {
    const options = [];

    // Add "no report" option FIRST to make it more prominent
    options.push({
        value: null,
        label: 'None (Semantic Model only)',
        icon: '<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">analytics</span>',
        subtitle: 'Analyze the Semantic Model without a Report'
    });

    // Add divider if there are any matching reports
    if (matchingReports.length > 0) {
        options.push({ type: 'divider' });
        options.push({ type: 'section', label: 'Reports Connected to This Semantic Model' });

        matchingReports.forEach(r => {
            options.push({
                value: r.handle,
                label: r.name,
                subtitle: `Dataset: ${r.datasetPath || 'Unknown'}`,
                badge: '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle">check_circle</span> Connected',
                recommended: true
            });
        });
    }

    // Removed: "Other Reports" section - only show connected reports

    return new Promise((resolve) => {
        const modal = createPickerModal({
            title: 'Select Report',
            subtitle: `Semantic Model: ${fileAccessManager.semanticModelHandle.name}`,
            options: options,
            onSelect: async (selectedHandle) => {
                fileAccessManager.reportHandle = selectedHandle;
                document.body.removeChild(modal);
                await loadPBIPFiles();
                resolve();
            },
            onCancel: () => {
                document.body.removeChild(modal);
                showLoading(false);
            }
        });

        document.body.appendChild(modal);
    });
}



/**
 * Show loading indicator
 * @param {boolean} show - Whether to show or hide the loading indicator
 * @param {string} message - Optional message to display
 */
function showLoading(show, message = 'Parsing PBIP files...') {
    const indicator = document.getElementById('loadingIndicator');
    const messageEl = document.getElementById('loadingMessage');

    if (show) {
        indicator.classList.remove('hidden');
        if (messageEl && message) {
            messageEl.textContent = message;
        }
    } else {
        indicator.classList.add('hidden');
    }
}

/**
 * Show error message
 */
function showError(message) {
    // Create modal for better error display
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';

    const content = document.createElement('div');
    content.style.backgroundColor = 'white';
    content.style.padding = '30px';
    content.style.borderRadius = '8px';
    content.style.maxWidth = '600px';
    content.style.maxHeight = '80vh';
    content.style.overflowY = 'auto';
    content.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)';

    const title = document.createElement('h2');
    title.textContent = 'Error';
    title.style.color = '#d13438';
    title.style.marginTop = '0';
    title.style.marginBottom = '15px';
    content.appendChild(title);

    const messageEl = document.createElement('pre');
    messageEl.textContent = message;
    messageEl.style.whiteSpace = 'pre-wrap';
    messageEl.style.fontFamily = 'inherit';
    messageEl.style.fontSize = '14px';
    messageEl.style.lineHeight = '1.6';
    messageEl.style.margin = '0 0 20px 0';
    content.appendChild(messageEl);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'OK';
    closeBtn.className = 'btn btn-primary';
    closeBtn.onclick = () => document.body.removeChild(modal);
    content.appendChild(closeBtn);

    modal.appendChild(content);
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };

    document.body.appendChild(modal);
}

/**
 * Show success message
 */
function showSuccess(message) {
    // Create modal for success message
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';

    const content = document.createElement('div');
    content.style.backgroundColor = 'white';
    content.style.padding = '30px';
    content.style.borderRadius = '8px';
    content.style.maxWidth = '500px';
    content.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)';
    content.style.textAlign = 'center';

    const title = document.createElement('h2');
    title.innerHTML = '<span class="material-symbols-outlined" style="font-size:24px;vertical-align:middle">check_circle</span> Success';
    title.style.color = '#4a7c59';
    title.style.marginTop = '0';
    title.style.marginBottom = '15px';
    content.appendChild(title);

    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.fontSize = '14px';
    messageEl.style.lineHeight = '1.6';
    messageEl.style.margin = '0 0 20px 0';
    content.appendChild(messageEl);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'OK';
    closeBtn.className = 'btn btn-success';
    closeBtn.onclick = () => document.body.removeChild(modal);
    content.appendChild(closeBtn);

    modal.appendChild(content);
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };

    document.body.appendChild(modal);
}

/**
 * Display warning about large model size
 * @param {Object} stats - Statistics object
 */
function displayLargeModelWarning(stats) {
    console.warn('Large model detected:', stats);

    // Create a dismissible performance warning
    const banner = document.createElement('div');
    banner.className = 'large-model-warning-banner notification-banner notification-banner--warning';

    const warningIcon = document.createElement('span');
    warningIcon.className = 'notification-banner__icon';
    warningIcon.innerHTML = '<span class="material-symbols-outlined">bolt</span> ';

    const message = document.createElement('span');
    const details = [];
    if (stats.measureCount > 500) details.push(`${stats.measureCount} measures`);
    if (stats.columnCount > 1000) details.push(`${stats.columnCount} columns`);

    message.innerHTML = `<strong>Large Model:</strong> ${details.join(', ')}. Impact analysis may be slow. Consider analyzing specific objects rather than full graph traversals.`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-banner__close';
    closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    closeBtn.onclick = () => banner.remove();

    banner.appendChild(warningIcon);
    banner.appendChild(message);
    banner.appendChild(closeBtn);

    // Insert at top, adjusting for any existing banners
    const existingBanners = document.querySelectorAll('.circular-warning-banner, .orphaned-warning-banner');
    if (existingBanners.length > 0) {
        const lastBanner = existingBanners[existingBanners.length - 1];
        lastBanner.insertAdjacentElement('afterend', banner);
    } else {
        document.body.insertBefore(banner, document.body.firstChild);
    }
}

/**
 * Display warning about orphaned references found in the model
 * @param {Object} stats - Statistics object containing orphanedReferences
 */
function displayOrphanedReferencesWarning(stats) {
    const orphans = stats.orphanedReferences;
    const measuresWithOrphans = new Set(orphans.map(o => o.inMeasure));

    console.warn(`Found ${orphans.length} orphaned references in ${measuresWithOrphans.size} measures:`, orphans);

    // Create a dismissible info banner (less severe than circular deps)
    const banner = document.createElement('div');
    banner.className = 'orphaned-warning-banner notification-banner notification-banner--info';

    const warningIcon = document.createElement('span');
    warningIcon.className = 'notification-banner__icon';
    warningIcon.innerHTML = '<span class="material-symbols-outlined">info</span> ';

    const message = document.createElement('span');
    const measureList = Array.from(measuresWithOrphans).slice(0, 3);
    const moreCount = measuresWithOrphans.size - 3;

    message.innerHTML = `<strong>Broken References:</strong> ${orphans.length} reference(s) to non-existent objects in measures: `;
    message.innerHTML += measureList.map(m => `<code>${escapeHtml(m)}</code>`).join(', ');
    if (moreCount > 0) {
        message.innerHTML += ` and ${moreCount} more`;
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-banner__close';
    closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    closeBtn.onclick = () => banner.remove();

    banner.appendChild(warningIcon);
    banner.appendChild(message);
    banner.appendChild(closeBtn);

    // Insert after any existing circular warning banner
    const existingBanner = document.querySelector('.circular-warning-banner');
    if (existingBanner) {
        existingBanner.insertAdjacentElement('afterend', banner);
    } else {
        document.body.insertBefore(banner, document.body.firstChild);
    }
}

/**
 * Display warning about circular dependencies found in the model
 * @param {Array} circularDeps - Array of circular dependency chains
 */
function displayCircularDependencyWarning(circularDeps) {
    console.warn(`Found ${circularDeps.length} circular dependency chains:`, circularDeps);

    // Create a dismissible warning banner
    const banner = document.createElement('div');
    banner.className = 'circular-warning-banner notification-banner notification-banner--caution';

    // Format the circular dependencies for display
    const chains = circularDeps.map(chain => {
        // Clean up the node IDs for display
        return chain.map(nodeId => {
            if (nodeId.startsWith('Measure.')) {
                return escapeHtml(nodeId.replace('Measure.', ''));
            }
            return escapeHtml(nodeId);
        }).join(' <span class="material-symbols-outlined">arrow_forward</span> ');
    });

    const warningIcon = document.createElement('span');
    warningIcon.className = 'notification-banner__icon';
    warningIcon.innerHTML = '<span class="material-symbols-outlined">warning</span> ';

    const message = document.createElement('span');
    message.innerHTML = `<strong>Circular Dependencies Detected:</strong> ${circularDeps.length} cycle(s) found. `;

    if (circularDeps.length <= 3) {
        // Show all chains if there are 3 or fewer
        message.innerHTML += chains.map(c => `<code>${c}</code>`).join(' ');
    } else {
        // Show first 2 and count for the rest
        message.innerHTML += chains.slice(0, 2).map(c => `<code>${c}</code>`).join(' ');
        message.innerHTML += ` and ${circularDeps.length - 2} more...`;
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-banner__close';
    closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    closeBtn.onclick = () => banner.remove();

    banner.appendChild(warningIcon);
    banner.appendChild(message);
    banner.appendChild(closeBtn);

    document.body.insertBefore(banner, document.body.firstChild);
}

/**
 * Render sponsor logos in the footer sponsor bar
 */
function renderSponsors() {
    const bar = document.getElementById('sponsorBar');
    const container = document.getElementById('sponsorLogos');
    if (!SPONSORS.length || !bar || !container) return;

    bar.classList.remove('hidden');
    SPONSORS.forEach(sponsor => {
        const link = document.createElement('a');
        link.href = sponsor.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = sponsor.name;
        link.className = 'sponsor-logo-link';

        const img = document.createElement('img');
        img.src = sponsor.logo;
        img.alt = sponsor.name;
        img.className = 'sponsor-logo';

        link.appendChild(img);
        container.appendChild(link);
    });
}

// ── Session Persistence ─────────────────────────────────────────

/**
 * Restore session state from localStorage on app init
 */
function restoreSessionState() {
    // Show last folder hint
    const lastFolder = sessionManager.getLastFolder();
    const hintEl = document.getElementById('lastFolderHint');
    if (lastFolder && hintEl) {
        const parts = [lastFolder.folderName, lastFolder.semanticModelName].filter(Boolean);
        hintEl.textContent = `Last opened: ${parts.join(' / ')}`;
        hintEl.classList.remove('hidden');
    }

    // Restore last active tab
    const settings = sessionManager.getSettings();
    if (settings.lastTab) {
        switchTab(settings.lastTab);
    }

    // Restore last object type
    if (settings.lastObjectType) {
        const typeSelect = document.getElementById('objectTypeSelect');
        if (typeSelect) typeSelect.value = settings.lastObjectType;
    }

    // Populate quick access panel
    refreshQuickAccessPanel();
    setupQuickAccessListeners();
}

/**
 * Set up Quick Access panel tab switching and listeners
 */
function setupQuickAccessListeners() {
    const tabs = document.querySelectorAll('.quick-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.qtab;
            document.getElementById('recentList').classList.toggle('hidden', target !== 'recent');
            document.getElementById('favoritesList').classList.toggle('hidden', target !== 'favorites');
        });
    });
}

/**
 * Refresh the quick access panel with current data
 */
function refreshQuickAccessPanel() {
    const panel = document.getElementById('quickAccessPanel');
    if (!panel) return;

    const recents = sessionManager.getRecentAnalyses();
    const favorites = sessionManager.getFavorites();

    // Show panel if there is anything to display
    if (recents.length === 0 && favorites.length === 0) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');

    // Render recent list
    const recentList = document.getElementById('recentList');
    recentList.innerHTML = '';
    if (recents.length === 0) {
        recentList.innerHTML = '<div class="quick-list-empty">No recent analyses</div>';
    } else {
        recents.forEach(item => {
            const el = createQuickAccessItem(item, false);
            recentList.appendChild(el);
        });
    }

    // Render favorites list
    const favList = document.getElementById('favoritesList');
    favList.innerHTML = '';
    if (favorites.length === 0) {
        favList.innerHTML = '<div class="quick-list-empty">No favorites yet</div>';
    } else {
        favorites.forEach(item => {
            const el = createQuickAccessItem(item, true);
            favList.appendChild(el);
        });
    }
}

/**
 * Create a quick access list item
 * @param {Object} item - { nodeId, name, type, timestamp? }
 * @param {boolean} isFavorite - If true, show remove button
 * @returns {HTMLElement}
 */
function createQuickAccessItem(item, isFavorite) {
    const el = document.createElement('div');
    el.className = 'quick-access-item';

    const info = document.createElement('div');
    info.className = 'quick-item-info';
    info.style.cursor = 'pointer';

    const nameEl = document.createElement('span');
    nameEl.className = 'quick-item-name';
    nameEl.textContent = item.name;
    nameEl.title = item.name;
    info.appendChild(nameEl);

    const meta = document.createElement('span');
    meta.className = 'quick-item-meta';
    if (item.timestamp) {
        meta.textContent = formatRelativeTime(item.timestamp);
    } else {
        meta.textContent = item.type;
    }
    info.appendChild(meta);

    // Click to analyze
    info.addEventListener('click', () => {
        selectAndAnalyzeFromQuickAccess(item);
    });

    el.appendChild(info);

    if (isFavorite) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'quick-item-remove';
        removeBtn.title = 'Remove from favorites';
        removeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sessionManager.removeFavorite(item.nodeId);
            refreshQuickAccessPanel();
        });
        el.appendChild(removeBtn);
    }

    return el;
}

/**
 * Select an object from Quick Access and trigger analysis
 * @param {Object} item - { nodeId, name, type }
 */
function selectAndAnalyzeFromQuickAccess(item) {
    const typeSelect = document.getElementById('objectTypeSelect');
    const objectSelect = document.getElementById('objectSelect');

    // Set type
    typeSelect.value = item.type;
    handleObjectTypeChange();

    // Set object (for measure/column)
    if (item.type === 'measure' || item.type === 'column') {
        objectSelect.value = item.nodeId;
        handleObjectSelectChange();
    }

    // Trigger analysis
    handleAnalyzeImpact();
}

/**
 * Format a timestamp as a relative time string
 * @param {number} timestamp - Unix timestamp in ms
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

/**
 * Update favorite toggle button state
 * @param {string} nodeId
 */
function updateFavoriteButton(nodeId) {
    const btn = document.getElementById('favoriteToggleBtn');
    if (!btn) return;

    btn.classList.remove('hidden');
    const icon = btn.querySelector('.material-symbols-outlined');
    if (sessionManager.isFavorite(nodeId)) {
        btn.classList.add('favorited');
        icon.textContent = 'star';
        btn.title = 'Remove from favorites';
    } else {
        btn.classList.remove('favorited');
        icon.textContent = 'star';
        btn.title = 'Add to favorites';
    }
}

/**
 * Apply filters to impact analysis results
 * Filters dependency items by search text, type, and depth
 */
function applyResultsFilter() {
    const query = filterState.searchText.toLowerCase().trim();
    const maxDepth = filterState.maxDepth;

    // Filter each dependency section
    const sections = [
        { list: 'upstreamTablesList', type: 'table', countId: 'upstreamTablesCount', toggle: 'upstream-tables' },
        { list: 'upstreamColumnsList', type: 'column', countId: 'upstreamColumnsCount', toggle: 'upstream-columns' },
        { list: 'upstreamMeasuresList', type: 'measure', countId: 'upstreamMeasuresCount', toggle: 'upstream-measures' },
        { list: 'downstreamMeasuresList', type: 'measure', countId: 'downstreamMeasuresCount', toggle: 'downstream-measures' },
        { list: 'downstreamVisualsList', type: 'visual', countId: 'downstreamVisualsCount', toggle: 'downstream-visuals' }
    ];

    let totalUpstreamVisible = 0;
    let totalDownstreamVisible = 0;

    sections.forEach(section => {
        const listEl = document.getElementById(section.list);
        if (!listEl) return;

        const items = listEl.querySelectorAll('.dependency-item');
        const typeVisible = filterState.typeFilters[section.type] !== false;
        let visibleCount = 0;
        let totalCount = items.length;

        // Also count empty-results divs (they shouldn't count)
        const emptyResults = listEl.querySelectorAll('.empty-results');
        totalCount -= emptyResults.length;

        items.forEach(item => {
            let show = typeVisible;

            // Text search filter
            if (show && query) {
                const nameEl = item.querySelector('.dependency-item-name');
                const name = nameEl ? nameEl.textContent.toLowerCase() : '';
                show = name.includes(query);
            }

            // Depth filter
            if (show && maxDepth > 0) {
                const depthClass = Array.from(item.classList).find(c => c.startsWith('depth-'));
                const depth = depthClass ? parseInt(depthClass.replace('depth-', '')) : 1;
                show = depth <= maxDepth;
            }

            item.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        // Update section count with "X of Y" format
        const countEl = document.getElementById(section.countId);
        if (countEl) {
            if (query || maxDepth > 0 || !typeVisible) {
                countEl.textContent = `${visibleCount} of ${totalCount}`;
            } else {
                countEl.textContent = totalCount;
            }
        }

        // Toggle section visibility based on type filter
        const sectionToggle = document.querySelector(`[data-section="${section.toggle}"]`);
        if (sectionToggle) {
            const sectionEl = sectionToggle.closest('.dependency-section');
            if (sectionEl) {
                sectionEl.style.display = typeVisible ? '' : 'none';
            }
        }

        // Accumulate totals
        if (section.list.startsWith('upstream')) {
            totalUpstreamVisible += visibleCount;
        } else {
            totalDownstreamVisible += visibleCount;
        }
    });

    // Update total counts
    const upstreamCountEl = document.getElementById('upstreamCount');
    const downstreamCountEl = document.getElementById('downstreamCount');
    if (upstreamCountEl && (query || maxDepth > 0)) {
        upstreamCountEl.textContent = totalUpstreamVisible;
    }
    if (downstreamCountEl && (query || maxDepth > 0)) {
        downstreamCountEl.textContent = totalDownstreamVisible;
    }
}

/**
 * Apply search highlighting to lineage view
 * @param {string} query - Search text
 */
function applyLineageSearch(query) {
    const container = document.getElementById('graphContainer');
    if (!container) return;

    const q = query.toLowerCase().trim();
    const nodes = container.querySelectorAll('.lineage-node');

    nodes.forEach(node => {
        const nameEl = node.querySelector('.node-name');
        const name = nameEl ? nameEl.textContent.toLowerCase() : '';

        if (!q) {
            // No query — remove all search states
            node.classList.remove('search-match', 'search-dim');
        } else if (name.includes(q)) {
            node.classList.add('search-match');
            node.classList.remove('search-dim');
        } else {
            node.classList.remove('search-match');
            node.classList.add('search-dim');
        }
    });

    // Also handle center node
    const centerNode = container.querySelector('.center-node');
    if (centerNode) {
        const centerName = centerNode.querySelector('.center-node-name');
        const name = centerName ? centerName.textContent.toLowerCase() : '';
        if (!q) {
            centerNode.classList.remove('search-match', 'search-dim');
        } else if (name.includes(q)) {
            centerNode.classList.add('search-match');
            centerNode.classList.remove('search-dim');
        } else {
            centerNode.classList.remove('search-match');
            centerNode.classList.add('search-dim');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
