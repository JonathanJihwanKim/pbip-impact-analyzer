/**
 * Refactor Module
 * Handles safe refactoring operations (rename measures and columns)
 */

class RefactoringEngine {
    constructor(dependencyAnalyzer, fileAccessManager) {
        this.analyzer = dependencyAnalyzer;
        this.fileAccess = fileAccessManager;
        this.previewChanges = [];
    }

    /**
     * Preview rename operation
     * @param {string} oldName - Current name
     * @param {string} newName - New name
     * @param {string} nodeType - "measure" or "column"
     * @param {string} tableName - For columns, the table name
     * @returns {Array<Object>} Array of change objects
     */
    async previewRename(oldName, newName, nodeType, tableName = null) {
        console.log(`Previewing rename: ${oldName} -> ${newName} (${nodeType})`);

        this.previewChanges = [];

        // Validate input
        if (!oldName || !newName) {
            throw new Error('Old name and new name are required');
        }

        if (oldName === newName) {
            throw new Error('New name must be different from old name');
        }

        // Check for name conflicts
        const nodeId = nodeType === 'measure'
            ? `Measure.${newName}`
            : `${tableName}.${newName}`;

        if (this.analyzer.dependencyGraph.nodes[nodeId]) {
            throw new Error(`A ${nodeType} with name "${newName}" already exists`);
        }

        // Generate changes based on type
        if (nodeType === 'measure') {
            await this.previewMeasureRename(oldName, newName);
        } else if (nodeType === 'column') {
            await this.previewColumnRename(oldName, newName, tableName);
        }

        console.log(`Preview complete: ${this.previewChanges.length} files will be modified`);

        return this.previewChanges;
    }

    /**
     * Preview measure rename operation
     * @param {string} oldName
     * @param {string} newName
     */
    async previewMeasureRename(oldName, newName) {
        const nodeId = `Measure.${oldName}`;
        const node = this.analyzer.dependencyGraph.nodes[nodeId];

        if (!node) {
            throw new Error(`Measure "${oldName}" not found`);
        }

        // 1. Update measure definition in Measure.tmdl
        await this.addMeasureDefinitionChange(oldName, newName);

        // 2. Update references in other measures' DAX expressions
        for (const usage of node.usedBy) {
            if (usage.type === 'measure') {
                await this.addMeasureDAXReferenceChange(oldName, newName, usage.name);
            }
        }

        // 3. Update visual field references
        for (const usage of node.usedBy) {
            if (usage.type === 'visual') {
                await this.addVisualMeasureReferenceChange(oldName, newName, usage.pageId, usage.visualId);
            }
        }
    }

    /**
     * Preview column rename operation
     * @param {string} oldName
     * @param {string} newName
     * @param {string} tableName
     */
    async previewColumnRename(oldName, newName, tableName) {
        const nodeId = `${tableName}.${oldName}`;
        const node = this.analyzer.dependencyGraph.nodes[nodeId];

        if (!node) {
            throw new Error(`Column "${tableName}.${oldName}" not found`);
        }

        // 1. Update column definition in table .tmdl file
        await this.addColumnDefinitionChange(oldName, newName, tableName);

        // 2. Update references in measures' DAX expressions
        for (const usage of node.usedBy) {
            if (usage.type === 'measure') {
                await this.addColumnDAXReferenceChange(oldName, newName, tableName, usage.name);
            }
        }

        // 3. Update visual field references
        for (const usage of node.usedBy) {
            if (usage.type === 'visual') {
                await this.addVisualColumnReferenceChange(oldName, newName, tableName, usage.pageId, usage.visualId);
            }
        }

        // 4. Update relationships
        const affectedRelationships = this.analyzer.findRelationshipsUsingColumn(tableName, oldName);
        for (const rel of affectedRelationships) {
            await this.addRelationshipChange(oldName, newName, tableName, rel);
        }
    }

    /**
     * Add measure definition change to preview
     */
    async addMeasureDefinitionChange(oldName, newName) {
        // Find the measure in parsed data
        const measure = this.analyzer.measures.find(m => m.name === oldName);
        if (!measure) return;

        const change = {
            file: 'definition/tables/Measure.tmdl',
            type: 'measure-definition',
            description: `Rename measure "${oldName}" to "${newName}"`,
            oldContent: `measure '${oldName}' =`,
            newContent: `measure '${newName}' =`
        };

        this.previewChanges.push(change);
    }

    /**
     * Add measure DAX reference change to preview
     */
    async addMeasureDAXReferenceChange(oldName, newName, affectedMeasureName) {
        const affectedMeasure = this.analyzer.measures.find(m => m.name === affectedMeasureName);
        if (!affectedMeasure) return;

        // Replace [OldName] with [NewName] in DAX
        const oldDAX = affectedMeasure.dax;
        const newDAX = this.replaceMeasureInDAX(oldDAX, oldName, newName);

        if (oldDAX !== newDAX) {
            const change = {
                file: 'definition/tables/Measure.tmdl',
                type: 'measure-dax-reference',
                description: `Update reference in measure "${affectedMeasureName}"`,
                oldContent: oldDAX.substring(0, 200) + (oldDAX.length > 200 ? '...' : ''),
                newContent: newDAX.substring(0, 200) + (newDAX.length > 200 ? '...' : '')
            };

            this.previewChanges.push(change);
        }
    }

    /**
     * Add column DAX reference change to preview
     */
    async addColumnDAXReferenceChange(oldName, newName, tableName, affectedMeasureName) {
        const affectedMeasure = this.analyzer.measures.find(m => m.name === affectedMeasureName);
        if (!affectedMeasure) return;

        // Replace tableName[oldName] with tableName[newName] in DAX
        const oldDAX = affectedMeasure.dax;
        const newDAX = this.replaceColumnInDAX(oldDAX, tableName, oldName, newName);

        if (oldDAX !== newDAX) {
            const change = {
                file: 'definition/tables/Measure.tmdl',
                type: 'column-dax-reference',
                description: `Update ${tableName}[${oldName}] reference in measure "${affectedMeasureName}"`,
                oldContent: oldDAX.substring(0, 200) + (oldDAX.length > 200 ? '...' : ''),
                newContent: newDAX.substring(0, 200) + (newDAX.length > 200 ? '...' : '')
            };

            this.previewChanges.push(change);
        }
    }

    /**
     * Add visual measure reference change to preview
     */
    async addVisualMeasureReferenceChange(oldName, newName, pageId, visualId) {
        const change = {
            file: `definition/pages/${pageId}/visuals/${visualId}/visual.json`,
            type: 'visual-measure-reference',
            description: `Update measure reference in visual ${visualId} on page ${pageId}`,
            oldContent: `"Property": "${oldName}"`,
            newContent: `"Property": "${newName}"`
        };

        this.previewChanges.push(change);
    }

    /**
     * Add visual column reference change to preview
     */
    async addVisualColumnReferenceChange(oldName, newName, tableName, pageId, visualId) {
        const change = {
            file: `definition/pages/${pageId}/visuals/${visualId}/visual.json`,
            type: 'visual-column-reference',
            description: `Update column reference in visual ${visualId} on page ${pageId}`,
            oldContent: `"Property": "${oldName}"`,
            newContent: `"Property": "${newName}"`
        };

        this.previewChanges.push(change);
    }

    /**
     * Add column definition change to preview
     */
    async addColumnDefinitionChange(oldName, newName, tableName) {
        const change = {
            file: `definition/tables/${tableName}.tmdl`,
            type: 'column-definition',
            description: `Rename column "${oldName}" to "${newName}" in table ${tableName}`,
            oldContent: `column '${oldName}'`,
            newContent: `column '${newName}'`
        };

        this.previewChanges.push(change);
    }

    /**
     * Add relationship change to preview
     */
    async addRelationshipChange(oldColumnName, newColumnName, tableName, relationship) {
        const change = {
            file: 'definition/relationships.tmdl',
            type: 'relationship-reference',
            description: `Update relationship "${relationship.name}"`,
            oldContent: `${tableName}.${oldColumnName}`,
            newContent: `${tableName}.${newColumnName}`
        };

        this.previewChanges.push(change);
    }

    /**
     * Replace measure reference in DAX expression
     */
    replaceMeasureInDAX(dax, oldName, newName) {
        // Replace [OldName] with [NewName]
        const pattern = new RegExp(`\\[${this.escapeRegex(oldName)}\\]`, 'g');
        return dax.replace(pattern, `[${newName}]`);
    }

    /**
     * Replace column reference in DAX expression
     */
    replaceColumnInDAX(dax, tableName, oldColumnName, newColumnName) {
        // Replace tableName[oldColumnName] with tableName[newColumnName]
        const pattern1 = new RegExp(`${this.escapeRegex(tableName)}\\[${this.escapeRegex(oldColumnName)}\\]`, 'g');
        const pattern2 = new RegExp(`'${this.escapeRegex(tableName)}'\\[${this.escapeRegex(oldColumnName)}\\]`, 'g');

        let result = dax.replace(pattern1, `${tableName}[${newColumnName}]`);
        result = result.replace(pattern2, `'${tableName}'[${newColumnName}]`);

        return result;
    }

    /**
     * Escape special regex characters
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Apply all changes (actual file writes)
     * WARNING: This modifies the PBIP files
     */
    async applyChanges() {
        console.log(`Applying ${this.previewChanges.length} changes...`);

        if (this.previewChanges.length === 0) {
            throw new Error('No changes to apply');
        }

        try {
            // Group changes by file
            const changesByFile = {};

            for (const change of this.previewChanges) {
                if (!changesByFile[change.file]) {
                    changesByFile[change.file] = [];
                }
                changesByFile[change.file].push(change);
            }

            // Apply changes file by file
            for (const [filePath, changes] of Object.entries(changesByFile)) {
                await this.applyChangesToFile(filePath, changes);
            }

            console.log('All changes applied successfully');

            return {
                success: true,
                filesModified: Object.keys(changesByFile).length,
                totalChanges: this.previewChanges.length
            };

        } catch (error) {
            console.error('Error applying changes:', error);
            throw error;
        }
    }

    /**
     * Apply changes to a specific file
     */
    async applyChangesToFile(filePath, changes) {
        console.log(`Applying ${changes.length} changes to ${filePath}`);

        // This is a placeholder - actual implementation would need to:
        // 1. Read the current file content
        // 2. Apply all changes
        // 3. Write the updated content back

        // For now, just log what would happen
        console.warn('File write operations not yet implemented - this is a preview only');
    }

    /**
     * Validate changes before applying
     */
    validateChanges() {
        // Check for potential issues
        const issues = [];

        // Check for duplicate changes
        const changeKeys = new Set();
        for (const change of this.previewChanges) {
            const key = `${change.file}:${change.oldContent}`;
            if (changeKeys.has(key)) {
                issues.push(`Duplicate change detected in ${change.file}`);
            }
            changeKeys.add(key);
        }

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RefactoringEngine;
}
