/**
 * Analyzer Module
 * Handles dependency graph building and impact analysis
 */

class DependencyAnalyzer {
    constructor() {
        this.dependencyGraph = {
            nodes: {},
            edges: []
        };
        this.measures = [];
        this.tables = [];
        this.visuals = [];
        this.relationships = [];
    }

    /**
     * Build dependency graph from parsed data
     * @param {Object} parsedData - Object containing measures, tables, visuals
     */
    buildDependencyGraph(parsedData) {
        console.log('Building dependency graph...');

        this.measures = parsedData.measures || [];
        this.tables = parsedData.tables || [];
        this.visuals = parsedData.visuals || [];
        this.relationships = parsedData.relationships || [];
        this.pages = parsedData.pages || [];

        // Reset graph
        this.dependencyGraph = {
            nodes: {},
            edges: []
        };

        // Add measure nodes
        this.addMeasureNodes();

        // Add column nodes
        this.addColumnNodes();

        // Add table nodes
        this.addTableNodes();

        // Add visual nodes
        this.addVisualNodes();

        // Build edges (dependencies)
        this.buildMeasureDependencies();
        this.buildVisualDependencies();

        console.log(`Dependency graph built with ${Object.keys(this.dependencyGraph.nodes).length} nodes`);

        return this.dependencyGraph;
    }

    /**
     * Add measure nodes to graph
     */
    addMeasureNodes() {
        for (const measure of this.measures) {
            const nodeId = `Measure.${measure.name}`;

            this.dependencyGraph.nodes[nodeId] = {
                type: 'measure',
                name: measure.name,
                dax: measure.dax,
                formatString: measure.formatString,
                displayFolder: measure.displayFolder,
                dependencies: [],
                usedBy: []
            };
        }
    }

    /**
     * Add column nodes to graph
     */
    addColumnNodes() {
        for (const table of this.tables) {
            for (const column of table.columns) {
                const nodeId = `${table.tableName}.${column.name}`;

                this.dependencyGraph.nodes[nodeId] = {
                    type: 'column',
                    table: table.tableName,
                    column: column.name,
                    dataType: column.dataType,
                    isHidden: column.isHidden,
                    dependencies: [],
                    usedBy: []
                };
            }
        }
    }

    /**
     * Add table nodes to the dependency graph
     * Only creates nodes for tables that will be referenced
     */
    addTableNodes() {
        for (const table of this.tables) {
            const nodeId = `Table.${table.tableName}`;

            this.dependencyGraph.nodes[nodeId] = {
                type: 'table',
                tableName: table.tableName,
                columnCount: table.columns.length,
                dependencies: [],
                usedBy: []
            };
        }
    }

    /**
     * Add visual nodes to graph
     */
    addVisualNodes() {
        for (const visual of this.visuals) {
            const nodeId = `${visual.pageId}/${visual.visualId}`;

            this.dependencyGraph.nodes[nodeId] = {
                type: 'visual',
                pageId: visual.pageId,
                visualId: visual.visualId,
                visualType: visual.visualType,
                visualName: visual.visualName || null,
                pageName: visual.pageName || visual.pageId,
                dependencies: [],
                usedBy: []
            };
        }
    }

    /**
     * Build dependencies between measures
     */
    buildMeasureDependencies() {
        for (const measure of this.measures) {
            const measureNodeId = `Measure.${measure.name}`;
            const measureNode = this.dependencyGraph.nodes[measureNodeId];

            if (!measureNode) continue;

            // Extract references from DAX
            const references = DAXParser.extractReferences(measure.dax);

            // Add measure dependencies
            for (const refName of references.measureRefs) {
                const refNodeId = `Measure.${refName}`;

                // Check if referenced measure exists
                if (this.dependencyGraph.nodes[refNodeId]) {
                    // Add to dependencies
                    measureNode.dependencies.push({
                        type: 'measure',
                        ref: refNodeId,
                        name: refName
                    });

                    // Add to usedBy
                    this.dependencyGraph.nodes[refNodeId].usedBy.push({
                        type: 'measure',
                        ref: measureNodeId,
                        name: measure.name
                    });

                    // Add edge
                    this.dependencyGraph.edges.push({
                        from: measureNodeId,
                        to: refNodeId,
                        type: 'measure-to-measure'
                    });
                }
            }

            // Add column dependencies
            for (const colRef of references.columnRefs) {
                const colNodeId = `${colRef.table}.${colRef.column}`;

                // Check if referenced column exists
                if (this.dependencyGraph.nodes[colNodeId]) {
                    // Add to dependencies
                    measureNode.dependencies.push({
                        type: 'column',
                        ref: colNodeId,
                        table: colRef.table,
                        column: colRef.column
                    });

                    // Add to usedBy
                    this.dependencyGraph.nodes[colNodeId].usedBy.push({
                        type: 'measure',
                        ref: measureNodeId,
                        name: measure.name
                    });

                    // Add edge
                    this.dependencyGraph.edges.push({
                        from: measureNodeId,
                        to: colNodeId,
                        type: 'measure-to-column'
                    });
                }
            }

            // Add table-only dependencies
            for (const tableName of references.tableRefs) {
                const tableNodeId = `Table.${tableName}`;

                if (this.dependencyGraph.nodes[tableNodeId]) {
                    // Check if we already have a column reference from this table
                    const hasColumnRef = measureNode.dependencies.some(
                        dep => dep.type === 'column' &&
                               this.dependencyGraph.nodes[dep.ref]?.table === tableName
                    );

                    // Only add table ref if no specific column refs exist
                    if (!hasColumnRef) {
                        measureNode.dependencies.push({
                            type: 'table',
                            ref: tableNodeId,
                            name: tableName
                        });

                        this.dependencyGraph.nodes[tableNodeId].usedBy.push({
                            type: 'measure',
                            ref: measureNodeId,
                            name: measure.name
                        });

                        this.dependencyGraph.edges.push({
                            from: measureNodeId,
                            to: tableNodeId,
                            type: 'measure-to-table'
                        });
                    }
                }
            }
        }
    }

    /**
     * Build dependencies between visuals and measures/columns
     */
    buildVisualDependencies() {
        for (const visual of this.visuals) {
            const visualNodeId = `${visual.pageId}/${visual.visualId}`;
            const visualNode = this.dependencyGraph.nodes[visualNodeId];

            if (!visualNode) continue;

            for (const field of visual.fields) {
                if (field.type === 'measure') {
                    const measureNodeId = `Measure.${field.name}`;

                    if (this.dependencyGraph.nodes[measureNodeId]) {
                        // Add to dependencies
                        visualNode.dependencies.push({
                            type: 'measure',
                            ref: measureNodeId,
                            name: field.name
                        });

                        // Add to usedBy
                        this.dependencyGraph.nodes[measureNodeId].usedBy.push({
                            type: 'visual',
                            ref: visualNodeId,
                            pageId: visual.pageId,
                            visualId: visual.visualId,
                            visualType: visual.visualType
                        });

                        // Add edge
                        this.dependencyGraph.edges.push({
                            from: visualNodeId,
                            to: measureNodeId,
                            type: 'visual-to-measure'
                        });
                    }
                } else if (field.type === 'column') {
                    const colNodeId = `${field.table}.${field.column}`;

                    if (this.dependencyGraph.nodes[colNodeId]) {
                        // Add to dependencies
                        visualNode.dependencies.push({
                            type: 'column',
                            ref: colNodeId,
                            table: field.table,
                            column: field.column
                        });

                        // Add to usedBy
                        this.dependencyGraph.nodes[colNodeId].usedBy.push({
                            type: 'visual',
                            ref: visualNodeId,
                            pageId: visual.pageId,
                            visualId: visual.visualId,
                            visualType: visual.visualType
                        });

                        // Add edge
                        this.dependencyGraph.edges.push({
                            from: visualNodeId,
                            to: colNodeId,
                            type: 'visual-to-column'
                        });
                    }
                }
            }
        }
    }

    /**
     * Analyze impact of renaming or deleting a measure or column
     * @param {string} nodeId - Node identifier (e.g., "Measure.Total Sales" or "sales.Quantity")
     * @param {string} operation - "rename" or "delete"
     * @returns {Object} Impact analysis results
     */
    analyzeImpact(nodeId, operation = 'rename') {
        console.log(`Analyzing impact of ${operation} operation on: ${nodeId}`);

        const node = this.dependencyGraph.nodes[nodeId];
        if (!node) {
            return {
                error: `Node "${nodeId}" not found in dependency graph`,
                dependentMeasures: [],
                dependentVisuals: [],
                dependentRelationships: [],
                totalImpact: 0
            };
        }

        const result = {
            operation: operation,
            targetNode: nodeId,
            targetType: node.type,
            dependentMeasures: [],
            dependentVisuals: [],
            dependentRelationships: [],
            totalImpact: 0
        };

        // Find all nodes that use this node
        for (const usage of node.usedBy) {
            if (usage.type === 'measure') {
                const measureNode = this.dependencyGraph.nodes[usage.ref];
                result.dependentMeasures.push({
                    nodeId: usage.ref,
                    name: usage.name,
                    dax: measureNode.dax,
                    displayFolder: measureNode.displayFolder
                });
            } else if (usage.type === 'visual') {
                result.dependentVisuals.push({
                    nodeId: usage.ref,
                    pageId: usage.pageId,
                    visualId: usage.visualId,
                    visualType: usage.visualType,
                    visualName: this.dependencyGraph.nodes[usage.ref]?.visualName || null,
                    pageName: this.getPageName(usage.pageId)
                });
            }
        }

        // Check if column is used in relationships
        if (node.type === 'column') {
            result.dependentRelationships = this.findRelationshipsUsingColumn(node.table, node.column);
        }

        // Calculate total impact
        result.totalImpact = result.dependentMeasures.length +
                            result.dependentVisuals.length +
                            result.dependentRelationships.length;

        console.log(`Impact analysis complete: ${result.totalImpact} total affected items`);

        return result;
    }

    /**
     * Enhanced impact analysis with recursive upstream/downstream traversal
     * @param {string} nodeId - The node to analyze
     * @param {string} operation - The operation type ('rename' or 'delete')
     * @returns {Object} Enhanced impact analysis results
     */
    analyzeImpactEnhanced(nodeId, operation = 'rename') {
        console.log(`Analyzing enhanced impact of ${operation} on: ${nodeId}`);

        const node = this.dependencyGraph.nodes[nodeId];
        if (!node) {
            return {
                error: `Node "${nodeId}" not found in dependency graph`,
                targetNode: nodeId
            };
        }

        // Get upstream and downstream recursively
        const upstream = this.findAllUpstream(nodeId);
        const downstream = this.findAllDownstream(nodeId);

        // Count totals
        const upstreamTotal = upstream.measures.length + upstream.columns.length + upstream.tables.length;
        const downstreamTotal = downstream.measures.length + downstream.visuals.length;

        console.log(`Enhanced impact analysis complete: ${upstreamTotal} upstream, ${downstreamTotal} downstream`);

        return {
            operation,
            targetNode: nodeId,
            targetType: node.type,
            targetName: node.name || nodeId,
            targetDAX: node.dax || null,
            upstream: {
                ...upstream,
                totalCount: upstreamTotal
            },
            downstream: {
                ...downstream,
                totalCount: downstreamTotal
            }
        };
    }

    /**
     * Find relationships that use a specific column
     * @param {string} tableName
     * @param {string} columnName
     * @returns {Array<Object>}
     */
    findRelationshipsUsingColumn(tableName, columnName) {
        const affected = [];

        for (const rel of this.relationships) {
            if ((rel.fromTable === tableName && rel.fromColumn === columnName) ||
                (rel.toTable === tableName && rel.toColumn === columnName)) {
                affected.push({
                    name: rel.name,
                    fromTable: rel.fromTable,
                    fromColumn: rel.fromColumn,
                    toTable: rel.toTable,
                    toColumn: rel.toColumn,
                    isActive: rel.isActive
                });
            }
        }

        return affected;
    }

    /**
     * Get page name by pageId
     * @param {string} pageId
     * @returns {string}
     */
    getPageName(pageId) {
        // Try to get displayName from pages array
        const page = this.pages.find(p => p.pageId === pageId);
        const displayName = page?.content?.displayName;
        if (displayName && displayName.trim() !== '') {
            return displayName;
        }

        // Fallback to visual's pageName
        const visual = this.visuals.find(v => v.pageId === pageId);
        return visual?.pageName || pageId;
    }

    /**
     * Find all dependencies of a node (what this depends on)
     * @param {string} nodeId
     * @returns {Array<Object>}
     */
    findDependencies(nodeId) {
        const node = this.dependencyGraph.nodes[nodeId];
        if (!node) return [];

        return node.dependencies;
    }

    /**
     * Find all usages of a node (what uses this)
     * @param {string} nodeId
     * @returns {Array<Object>}
     */
    findUsages(nodeId) {
        const node = this.dependencyGraph.nodes[nodeId];
        if (!node) return [];

        return node.usedBy;
    }

    /**
     * Find all upstream dependencies recursively
     * Returns tables, columns, and measures that the target depends on
     * @param {string} nodeId - The node to analyze
     * @param {number} maxDepth - Maximum recursion depth (-1 for unlimited)
     * @returns {Object} Grouped upstream dependencies
     */
    findAllUpstream(nodeId, maxDepth = -1) {
        const visited = new Set();
        const allNodes = new Set();

        this._traverseUpstream(nodeId, visited, allNodes, 0, maxDepth);

        // Convert Set to arrays and group by type
        return this._groupByType(allNodes);
    }

    /**
     * Recursive helper to traverse upstream dependencies
     * @private
     */
    _traverseUpstream(nodeId, visited, allNodes, depth, maxDepth) {
        // Cycle detection
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        // Depth limit check
        if (maxDepth !== -1 && depth > maxDepth) return;

        const node = this.dependencyGraph.nodes[nodeId];
        if (!node) return;

        // Add to results (skip starting node at depth 0)
        if (depth > 0) {
            allNodes.add({
                ...node,
                nodeId,
                depth
            });
        }

        // Recursively traverse dependencies
        if (node.dependencies) {
            for (const dep of node.dependencies) {
                this._traverseUpstream(dep.ref, visited, allNodes, depth + 1, maxDepth);
            }
        }
    }

    /**
     * Find all downstream dependents recursively
     * Returns measures and visuals that depend on the target
     * @param {string} nodeId - The node to analyze
     * @param {number} maxDepth - Maximum recursion depth (-1 for unlimited)
     * @returns {Object} Grouped downstream dependents
     */
    findAllDownstream(nodeId, maxDepth = -1) {
        const visited = new Set();
        const allNodes = new Set();

        this._traverseDownstream(nodeId, visited, allNodes, 0, maxDepth);

        // Convert Set to arrays and group by type
        return this._groupByType(allNodes);
    }

    /**
     * Recursive helper to traverse downstream dependents
     * @private
     */
    _traverseDownstream(nodeId, visited, allNodes, depth, maxDepth) {
        // Cycle detection
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        // Depth limit check
        if (maxDepth !== -1 && depth > maxDepth) return;

        const node = this.dependencyGraph.nodes[nodeId];
        if (!node) return;

        // Add to results (skip starting node at depth 0)
        if (depth > 0) {
            allNodes.add({
                ...node,
                nodeId,
                depth
            });
        }

        // Recursively traverse usedBy relationships
        if (node.usedBy) {
            for (const usage of node.usedBy) {
                this._traverseDownstream(usage.ref, visited, allNodes, depth + 1, maxDepth);
            }
        }
    }

    /**
     * Group nodes by type and sort by depth
     * @private
     */
    _groupByType(allNodes) {
        const grouped = {
            measures: [],
            columns: [],
            tables: [],
            visuals: []
        };

        for (const node of allNodes) {
            if (node.type === 'measure') {
                grouped.measures.push(node);
            } else if (node.type === 'column') {
                grouped.columns.push(node);
            } else if (node.type === 'table') {
                grouped.tables.push(node);
            } else if (node.type === 'visual') {
                grouped.visuals.push(node);
            }
        }

        // Sort by depth (shallowest first)
        for (const key in grouped) {
            grouped[key].sort((a, b) => a.depth - b.depth);
        }

        return grouped;
    }

    /**
     * Detect circular dependencies
     * @returns {Array<Array<string>>} Array of circular dependency chains
     */
    detectCircularDependencies() {
        const circular = [];
        const visited = new Set();
        const recursionStack = new Set();

        const dfs = (nodeId, path = []) => {
            if (recursionStack.has(nodeId)) {
                // Found circular dependency
                const circleStart = path.indexOf(nodeId);
                circular.push(path.slice(circleStart).concat(nodeId));
                return;
            }

            if (visited.has(nodeId)) return;

            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);

            const node = this.dependencyGraph.nodes[nodeId];
            if (node) {
                for (const dep of node.dependencies) {
                    dfs(dep.ref, [...path]);
                }
            }

            recursionStack.delete(nodeId);
        };

        // Check all measure nodes for circular dependencies
        for (const nodeId in this.dependencyGraph.nodes) {
            if (this.dependencyGraph.nodes[nodeId].type === 'measure') {
                dfs(nodeId);
            }
        }

        return circular;
    }

    /**
     * Get statistics about the dependency graph
     * @returns {Object}
     */
    getStatistics() {
        const measures = Object.values(this.dependencyGraph.nodes).filter(n => n.type === 'measure');
        const columns = Object.values(this.dependencyGraph.nodes).filter(n => n.type === 'column');
        const visuals = Object.values(this.dependencyGraph.nodes).filter(n => n.type === 'visual');

        return {
            totalNodes: Object.keys(this.dependencyGraph.nodes).length,
            measureCount: measures.length,
            columnCount: columns.length,
            visualCount: visuals.length,
            edgeCount: this.dependencyGraph.edges.length,
            tableCount: new Set(columns.map(c => c.table)).size
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DependencyAnalyzer;
}
