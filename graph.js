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
        header.innerHTML = '<span class="material-symbols-outlined section-icon">arrow_back</span> Depends On';
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'lineage-nodes upstream-nodes';

        // Group by type
        const groups = [
            { type: 'tables', label: 'Tables', items: upstream.tables, color: '#7b5ea7' },
            { type: 'columns', label: 'Columns', items: upstream.columns, color: '#4a7c59' },
            { type: 'measures', label: 'Measures', items: upstream.measures, color: '#1a3a5c' }
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
        header.innerHTML = 'Used By <span class="material-symbols-outlined section-icon">arrow_forward</span>';
        section.appendChild(header);

        const content = document.createElement('div');
        content.className = 'lineage-nodes downstream-nodes';

        let hasItems = false;

        // Handle measures with generic group
        if (downstream.measures && downstream.measures.length > 0) {
            hasItems = true;
            const measuresGroup = this.createNodeGroup('Measures', downstream.measures, '#1a3a5c', 'downstream');
            content.appendChild(measuresGroup);
        }

        // Handle visuals with page grouping
        if (downstream.visuals && downstream.visuals.length > 0) {
            hasItems = true;
            const visualsGroup = this.createPageGroupedVisuals(downstream.visuals, '#c89632', 'downstream');
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
            measure: '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">calculate</span>',
            column: '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">view_column</span>',
            table: '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">table_chart</span>',
            visual: '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">dashboard</span>'
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
                    <span class="material-symbols-outlined placeholder-mat-icon">schedule</span>
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

    exportAsPNG() {
        if (!this.selectedNodeData) {
            this.showNotification('No lineage to export. Please analyze an object first.', 'error');
            return;
        }

        // Show loading indicator
        this.showNotification('Exporting lineage as PNG...', 'info');

        // Create a canvas snapshot of the container
        try {
            const html2canvas = window.html2canvas;
            if (typeof html2canvas === 'function') {
                html2canvas(this.container, {
                    backgroundColor: '#1e1e1e', // Match dark background
                    scale: 2 // Higher resolution
                }).then(canvas => {
                    const link = document.createElement('a');
                    // Generate filename with object name and timestamp
                    const objectName = this.selectedNodeData.name || 'lineage';
                    const timestamp = new Date().toISOString().slice(0, 10);
                    link.download = `lineage-${objectName}-${timestamp}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();

                    this.showNotification('Lineage exported successfully!', 'success');
                }).catch(error => {
                    console.error('Export error:', error);
                    this.showNotification('Export failed. Try using browser screenshot (Ctrl+Shift+S).', 'error');
                });
            } else {
                this.showNotification('Export library not loaded. Try refreshing the page.', 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed. Use browser screenshot instead.', 'error');
        }
    }

    // Keep old method name for backward compatibility
    exportAsSVG() {
        this.exportAsPNG();
    }

    /**
     * Show a notification message
     * @param {string} message - The message to display
     * @param {string} type - 'info', 'success', or 'error'
     */
    showNotification(message, type = 'info') {
        // Remove existing notification if any
        const existing = document.querySelector('.export-notification');
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `export-notification export-notification-${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            animation: 'fadeIn 0.3s ease',
            backgroundColor: type === 'success' ? '#4a7c59' :
                           type === 'error' ? '#c1440e' : '#1a3a5c'
        });

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds (longer for errors)
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, type === 'error' ? 5000 : 3000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphVisualizer;
}
