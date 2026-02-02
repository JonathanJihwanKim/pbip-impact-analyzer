/**
 * Graph Visualization Module
 * Creates a horizontal mini lineage visualization for selected objects
 */

class GraphVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.dependencyAnalyzer = null;
        this.selectedNodeId = null;
        this.selectedNodeData = null;
    }

    /**
     * Set the dependency analyzer reference
     * @param {DependencyAnalyzer} analyzer
     */
    setAnalyzer(analyzer) {
        this.dependencyAnalyzer = analyzer;
    }

    /**
     * Render the mini lineage for a selected node
     * @param {string} nodeId - The node ID to visualize
     * @param {Object} impactResult - The impact analysis result
     */
    renderMiniLineage(nodeId, impactResult) {
        if (!nodeId || !impactResult) {
            this.showPlaceholder('Select an object in Impact Analysis to view its lineage');
            return;
        }

        this.selectedNodeId = nodeId;
        this.selectedNodeData = impactResult;

        // Clear container
        this.container.innerHTML = '';
        this.container.style.display = 'block';

        // Create SVG container
        const svgContainer = document.createElement('div');
        svgContainer.className = 'mini-lineage-container';
        this.container.appendChild(svgContainer);

        // Build the visualization
        this.buildMiniLineage(svgContainer, impactResult);
    }

    /**
     * Build the horizontal mini lineage visualization
     */
    buildMiniLineage(container, impactResult) {
        const { upstream, downstream, targetName, targetType, targetDAX } = impactResult;

        // Create main layout
        const layout = document.createElement('div');
        layout.className = 'lineage-layout';

        // Left side: Upstream dependencies
        const upstreamSection = this.createUpstreamSection(upstream);
        layout.appendChild(upstreamSection);

        // Center: Selected node
        const centerSection = this.createCenterSection(targetName, targetType, targetDAX);
        layout.appendChild(centerSection);

        // Right side: Downstream dependents
        const downstreamSection = this.createDownstreamSection(downstream);
        layout.appendChild(downstreamSection);

        container.appendChild(layout);
    }

    /**
     * Create the upstream (left) section
     */
    createUpstreamSection(upstream) {
        const section = document.createElement('div');
        section.className = 'lineage-section upstream-section';

        const header = document.createElement('div');
        header.className = 'lineage-section-header';
        header.innerHTML = '<span class="section-icon">&#8592;</span> Depends On';
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'lineage-nodes upstream-nodes';

        // Group by type
        const groups = [
            { type: 'tables', label: 'Tables', items: upstream.tables, color: '#9C27B0' },
            { type: 'columns', label: 'Columns', items: upstream.columns, color: '#2196F3' },
            { type: 'measures', label: 'Measures', items: upstream.measures, color: '#4CAF50' }
        ];

        let hasItems = false;
        for (const group of groups) {
            if (group.items && group.items.length > 0) {
                hasItems = true;
                const groupEl = this.createNodeGroup(group.label, group.items, group.color, 'upstream');
                content.appendChild(groupEl);
            }
        }

        if (!hasItems) {
            const empty = document.createElement('div');
            empty.className = 'lineage-empty';
            empty.textContent = 'No upstream dependencies';
            content.appendChild(empty);
        }

        section.appendChild(content);
        return section;
    }

    /**
     * Create the center section with the selected node
     */
    createCenterSection(name, type, dax) {
        const section = document.createElement('div');
        section.className = 'lineage-section center-section';

        const nodeWrapper = document.createElement('div');
        nodeWrapper.className = 'center-node-wrapper';

        // Create the main node
        const node = document.createElement('div');
        node.className = `center-node node-type-${type}`;

        const typeIcon = this.getTypeIcon(type);
        const typeLabel = document.createElement('div');
        typeLabel.className = 'center-node-type';
        typeLabel.innerHTML = `${typeIcon} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        node.appendChild(typeLabel);

        const nameEl = document.createElement('div');
        nameEl.className = 'center-node-name';
        nameEl.textContent = name;
        node.appendChild(nameEl);

        nodeWrapper.appendChild(node);

        // Connection lines
        const leftLine = document.createElement('div');
        leftLine.className = 'connection-line left-line';
        nodeWrapper.appendChild(leftLine);

        const rightLine = document.createElement('div');
        rightLine.className = 'connection-line right-line';
        nodeWrapper.appendChild(rightLine);

        section.appendChild(nodeWrapper);

        // DAX preview if available
        if (dax && type === 'measure') {
            const daxPreview = document.createElement('div');
            daxPreview.className = 'center-dax-preview';
            const truncatedDax = dax.length > 150 ? dax.substring(0, 150) + '...' : dax;
            daxPreview.innerHTML = `<pre>${this.escapeHtml(truncatedDax)}</pre>`;
            section.appendChild(daxPreview);
        }

        return section;
    }

    /**
     * Create the downstream (right) section
     */
    createDownstreamSection(downstream) {
        const section = document.createElement('div');
        section.className = 'lineage-section downstream-section';

        const header = document.createElement('div');
        header.className = 'lineage-section-header';
        header.innerHTML = 'Used By <span class="section-icon">&#8594;</span>';
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'lineage-nodes downstream-nodes';

        let hasItems = false;

        // Handle measures with generic group
        if (downstream.measures && downstream.measures.length > 0) {
            hasItems = true;
            const measuresGroup = this.createNodeGroup('Measures', downstream.measures, '#4CAF50', 'downstream');
            content.appendChild(measuresGroup);
        }

        // Handle visuals with page grouping
        if (downstream.visuals && downstream.visuals.length > 0) {
            hasItems = true;
            const visualsGroup = this.createPageGroupedVisuals(downstream.visuals, '#FF9800', 'downstream');
            content.appendChild(visualsGroup);
        }

        if (!hasItems) {
            const empty = document.createElement('div');
            empty.className = 'lineage-empty';
            empty.textContent = 'No downstream dependents';
            content.appendChild(empty);
        }

        section.appendChild(content);
        return section;
    }

    /**
     * Create a group of nodes
     */
    createNodeGroup(label, items, color, direction) {
        const group = document.createElement('div');
        group.className = 'node-group';

        const groupHeader = document.createElement('div');
        groupHeader.className = 'node-group-header';
        groupHeader.style.borderLeftColor = color;
        groupHeader.innerHTML = `<span class="group-label">${label}</span> <span class="group-count">${items.length}</span>`;
        group.appendChild(groupHeader);

        const nodesList = document.createElement('div');
        nodesList.className = 'nodes-list';

        // Show first 5 items, then collapse
        const maxVisible = 5;
        const visibleItems = items.slice(0, maxVisible);
        const hiddenItems = items.slice(maxVisible);

        for (const item of visibleItems) {
            const nodeEl = this.createNodeItem(item, color, direction);
            nodesList.appendChild(nodeEl);
        }

        if (hiddenItems.length > 0) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-nodes-btn';
            expandBtn.textContent = `+ ${hiddenItems.length} more`;

            const hiddenContainer = document.createElement('div');
            hiddenContainer.className = 'hidden-nodes';
            hiddenContainer.style.display = 'none';

            for (const item of hiddenItems) {
                const nodeEl = this.createNodeItem(item, color, direction);
                hiddenContainer.appendChild(nodeEl);
            }

            expandBtn.onclick = () => {
                if (hiddenContainer.style.display === 'none') {
                    hiddenContainer.style.display = 'block';
                    expandBtn.textContent = '- Show less';
                } else {
                    hiddenContainer.style.display = 'none';
                    expandBtn.textContent = `+ ${hiddenItems.length} more`;
                }
            };

            nodesList.appendChild(expandBtn);
            nodesList.appendChild(hiddenContainer);
        }

        group.appendChild(nodesList);
        return group;
    }

    /**
     * Create a single node item
     * @param {Object} item - The item data
     * @param {string} color - Border color
     * @param {string} direction - 'upstream' or 'downstream'
     * @param {boolean} isInPageGroup - If true, visual subtitle only shows type (page is already shown in group header)
     */
    createNodeItem(item, color, direction, isInPageGroup = false) {
        const node = document.createElement('div');
        node.className = `lineage-node ${direction}-node`;
        node.style.borderLeftColor = color;

        let displayName = '';
        let subtitle = '';

        if (item.type === 'measure') {
            displayName = item.name;
        } else if (item.type === 'column') {
            displayName = `${item.table}[${item.column}]`;
        } else if (item.type === 'table') {
            displayName = item.tableName;
        } else if (item.type === 'visual') {
            displayName = item.visualName || item.visualId;
            // When in page group, only show visual type (page name is in group header)
            subtitle = isInPageGroup ? item.visualType : `${item.pageName} | ${item.visualType}`;
        }

        const nameEl = document.createElement('div');
        nameEl.className = 'node-name';
        nameEl.textContent = displayName;
        node.appendChild(nameEl);

        if (subtitle) {
            const subtitleEl = document.createElement('div');
            subtitleEl.className = 'node-subtitle';
            subtitleEl.textContent = subtitle;
            node.appendChild(subtitleEl);
        }

        if (item.depth) {
            const depthEl = document.createElement('span');
            depthEl.className = 'node-depth';
            depthEl.textContent = `L${item.depth}`;
            depthEl.title = `Depth: ${item.depth}`;
            node.appendChild(depthEl);
        }

        return node;
    }

    /**
     * Group visuals by their page name
     * @param {Array} visuals - Array of visual items
     * @returns {Object} Object with page names as keys and arrays of visuals as values
     */
    groupVisualsByPage(visuals) {
        const pageGroups = {};
        for (const visual of visuals) {
            const pageName = visual.pageName || 'Unknown Page';
            if (!pageGroups[pageName]) {
                pageGroups[pageName] = [];
            }
            pageGroups[pageName].push(visual);
        }
        // Sort page names alphabetically
        return Object.keys(pageGroups)
            .sort()
            .reduce((acc, key) => {
                acc[key] = pageGroups[key];
                return acc;
            }, {});
    }

    /**
     * Create page-grouped visuals section
     * @param {Array} visuals - Array of visual items
     * @param {string} color - Color for visual items
     * @param {string} direction - 'upstream' or 'downstream'
     */
    createPageGroupedVisuals(visuals, color, direction) {
        const group = document.createElement('div');
        group.className = 'node-group';

        // Main "Visuals" header with total count
        const groupHeader = document.createElement('div');
        groupHeader.className = 'node-group-header';
        groupHeader.style.borderLeftColor = color;
        groupHeader.innerHTML = `<span class="group-label">Visuals</span> <span class="group-count">${visuals.length}</span>`;
        group.appendChild(groupHeader);

        const nodesList = document.createElement('div');
        nodesList.className = 'nodes-list';

        // Group visuals by page
        const pageGroups = this.groupVisualsByPage(visuals);
        const pageNames = Object.keys(pageGroups);

        for (const pageName of pageNames) {
            const pageVisuals = pageGroups[pageName];
            const pageSubgroup = this.createPageSubgroup(pageName, pageVisuals, color, direction);
            nodesList.appendChild(pageSubgroup);
        }

        group.appendChild(nodesList);
        return group;
    }

    /**
     * Create a page subgroup with its visuals
     * @param {string} pageName - The page name
     * @param {Array} visuals - Array of visual items on this page
     * @param {string} color - Color for visual items
     * @param {string} direction - 'upstream' or 'downstream'
     */
    createPageSubgroup(pageName, visuals, color, direction) {
        const subgroup = document.createElement('div');
        subgroup.className = 'page-subgroup';

        // Page header
        const pageHeader = document.createElement('div');
        pageHeader.className = 'page-subgroup-header';
        pageHeader.innerHTML = `
            <span class="page-name">${this.escapeHtml(pageName)}</span>
            <span class="page-subgroup-count">${visuals.length}</span>
        `;
        subgroup.appendChild(pageHeader);

        // Visual items in this page
        const visualsList = document.createElement('div');
        visualsList.className = 'page-visuals-list';

        // Show first 3 items per page, collapse rest
        const maxVisible = 3;
        const visibleItems = visuals.slice(0, maxVisible);
        const hiddenItems = visuals.slice(maxVisible);

        for (const visual of visibleItems) {
            const nodeEl = this.createNodeItem(visual, color, direction, true);
            visualsList.appendChild(nodeEl);
        }

        if (hiddenItems.length > 0) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-nodes-btn page-expand-btn';
            expandBtn.textContent = `+ ${hiddenItems.length} more`;

            const hiddenContainer = document.createElement('div');
            hiddenContainer.className = 'hidden-nodes';
            hiddenContainer.style.display = 'none';

            for (const visual of hiddenItems) {
                const nodeEl = this.createNodeItem(visual, color, direction, true);
                hiddenContainer.appendChild(nodeEl);
            }

            expandBtn.onclick = () => {
                if (hiddenContainer.style.display === 'none') {
                    hiddenContainer.style.display = 'block';
                    expandBtn.textContent = '- Show less';
                } else {
                    hiddenContainer.style.display = 'none';
                    expandBtn.textContent = `+ ${hiddenItems.length} more`;
                }
            };

            visualsList.appendChild(expandBtn);
            visualsList.appendChild(hiddenContainer);
        }

        subgroup.appendChild(visualsList);
        return subgroup;
    }

    /**
     * Get icon for node type
     */
    getTypeIcon(type) {
        const icons = {
            measure: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 4v8h14V4H1zm0-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm6 3h2v5H7V6z"/></svg>',
            column: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6"/></svg>',
            table: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>',
            visual: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1v14h14V1H1zm13 13H2V2h12v12zM3 3h4v4H3V3zm0 6h4v4H3V9zm6-6h4v4H9V3zm0 6h4v4H9V9z"/></svg>'
        };
        return icons[type] || '';
    }

    /**
     * Show placeholder message
     */
    showPlaceholder(message) {
        this.container.innerHTML = `
            <div class="lineage-placeholder">
                <div class="placeholder-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                </div>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clear the visualization
     */
    clear() {
        this.selectedNodeId = null;
        this.selectedNodeData = null;
        this.showPlaceholder('Select an object in Impact Analysis to view its lineage');
    }

    // Legacy methods for backward compatibility
    renderGraph() {
        this.showPlaceholder('Select an object in Impact Analysis to view its lineage');
    }

    applyFilter() {
        // No-op for new design
    }

    exportAsSVG() {
        if (!this.selectedNodeData) {
            alert('No lineage to export. Please analyze an object first.');
            return;
        }

        // Create a canvas snapshot of the container
        try {
            const html2canvas = window.html2canvas;
            if (typeof html2canvas === 'function') {
                html2canvas(this.container).then(canvas => {
                    const link = document.createElement('a');
                    link.download = 'lineage-graph.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                });
            } else {
                // Fallback: alert user
                alert('Export feature requires html2canvas library. For now, use browser screenshot (Ctrl+Shift+S in most browsers).');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed. Use browser screenshot instead.');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphVisualizer;
}
