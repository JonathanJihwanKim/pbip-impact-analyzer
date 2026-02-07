/**
 * Refactor Module
 * Handles safe refactoring operations (rename measures and columns)
 */

class RefactoringEngine {
    constructor(dependencyAnalyzer, fileAccessManager) {
        this.analyzer = dependencyAnalyzer;
        this.fileAccess = fileAccessManager;
        this.previewChanges = [];
        this.backups = new Map(); // Store backups for rollback
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
        this.backups.clear();

        // Validate input
        if (!oldName || !newName) {
            throw new Error('Old name and new name are required');
        }

        if (oldName === newName) {
            throw new Error('New name must be different from old name');
        }

        // Validate new name for reserved keywords and special characters
        const nameValidation = this.validateNewName(newName, nodeType);
        if (!nameValidation.valid) {
            throw new Error(`Invalid new name: ${nameValidation.issues.join(', ')}`);
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

        // 4. Update NAMEOF() references in field parameter partition expressions
        for (const usage of node.usedBy) {
            if (usage.type === 'fieldParameter') {
                const paramNode = this.analyzer.dependencyGraph.nodes[usage.ref];
                if (paramNode) {
                    await this.addFieldParameterNameofChange(oldName, newName, 'measure', null, paramNode.tableName);
                }
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

        // 5. Update NAMEOF() references in field parameter partition expressions
        for (const usage of node.usedBy) {
            if (usage.type === 'fieldParameter') {
                const paramNode = this.analyzer.dependencyGraph.nodes[usage.ref];
                if (paramNode) {
                    await this.addFieldParameterNameofChange(oldName, newName, 'column', tableName, paramNode.tableName);
                }
            }
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
                newContent: newDAX.substring(0, 200) + (newDAX.length > 200 ? '...' : ''),
                // Store full content for actual application
                fullOldContent: oldDAX,
                fullNewContent: newDAX,
                affectedMeasureName: affectedMeasureName
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
                newContent: newDAX.substring(0, 200) + (newDAX.length > 200 ? '...' : ''),
                // Store full content for actual application
                fullOldContent: oldDAX,
                fullNewContent: newDAX,
                affectedMeasureName: affectedMeasureName
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
     * Add NAMEOF() reference change in field parameter partition expression
     * @param {string} oldName - Old measure/column name
     * @param {string} newName - New measure/column name
     * @param {string} refType - 'measure' or 'column'
     * @param {string|null} tableName - Table name (for columns)
     * @param {string} paramTableName - Name of the field parameter table
     */
    async addFieldParameterNameofChange(oldName, newName, refType, tableName, paramTableName) {
        let oldContent, newContent;

        if (refType === 'measure') {
            // NAMEOF('Measure'[OldName]) → NAMEOF('Measure'[NewName])
            // The table prefix may be 'Measure' or 'Measures'
            oldContent = `[${oldName}]`;
            newContent = `[${newName}]`;
        } else {
            // NAMEOF('TableName'[OldColumn]) → NAMEOF('TableName'[NewColumn])
            oldContent = `'${tableName}'[${oldName}]`;
            newContent = `'${tableName}'[${newName}]`;
        }

        const change = {
            file: `definition/tables/${paramTableName}.tmdl`,
            type: 'field-parameter-nameof',
            description: `Update NAMEOF() reference in field parameter "${paramTableName}"`,
            oldContent: oldContent,
            newContent: newContent
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
     * DAX is case-insensitive, so we use case-insensitive matching
     */
    replaceMeasureInDAX(dax, oldName, newName) {
        // Replace [OldName] with [NewName] - case insensitive
        const pattern = new RegExp(`\\[${this.escapeRegex(oldName)}\\]`, 'gi');
        return dax.replace(pattern, `[${newName}]`);
    }

    /**
     * Replace column reference in DAX expression
     * Handles multiple formats: Table[Column], 'Table'[Column], 'Table Name'[Column]
     */
    replaceColumnInDAX(dax, tableName, oldColumnName, newColumnName) {
        let result = dax;

        // Pattern 1: Unquoted table name - TableName[Column]
        const pattern1 = new RegExp(
            `${this.escapeRegex(tableName)}\\[${this.escapeRegex(oldColumnName)}\\]`,
            'gi'
        );
        result = result.replace(pattern1, `${tableName}[${newColumnName}]`);

        // Pattern 2: Single-quoted table name - 'Table Name'[Column]
        const pattern2 = new RegExp(
            `'${this.escapeRegex(tableName)}'\\[${this.escapeRegex(oldColumnName)}\\]`,
            'gi'
        );
        result = result.replace(pattern2, `'${tableName}'[${newColumnName}]`);

        // Pattern 3: Table name might have spaces, need quotes - handle existing quoted refs
        // This catches cases where the table name in the DAX has different quoting than stored
        const escapedTable = this.escapeRegex(tableName);
        const pattern3 = new RegExp(
            `(['"]?)${escapedTable}\\1\\[${this.escapeRegex(oldColumnName)}\\]`,
            'gi'
        );
        result = result.replace(pattern3, (match, quote) => {
            return `${quote}${tableName}${quote}[${newColumnName}]`;
        });

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

        // Verify write permission before proceeding
        await this.verifyWritePermission();

        // Clear any previous backups
        this.backups.clear();

        try {
            // Group changes by file
            const changesByFile = {};

            for (const change of this.previewChanges) {
                if (!changesByFile[change.file]) {
                    changesByFile[change.file] = [];
                }
                changesByFile[change.file].push(change);
            }

            const filesModified = [];

            // Apply changes file by file
            for (const [filePath, changes] of Object.entries(changesByFile)) {
                await this.applyChangesToFile(filePath, changes);
                filesModified.push(filePath);
            }

            console.log('All changes applied successfully');

            // Clear backups after successful completion
            this.clearBackups();

            // Clear preview changes after successful application
            const totalChanges = this.previewChanges.length;
            this.previewChanges = [];

            return {
                success: true,
                filesModified: filesModified.length,
                filesList: filesModified,
                totalChanges: totalChanges
            };

        } catch (error) {
            console.error('Error applying changes:', error);

            // Attempt to rollback if we have backups
            if (this.backups.size > 0) {
                console.log('Attempting rollback...');
                try {
                    await this.restoreBackups();
                    console.log('Rollback completed');
                    error.message = `${error.message} (changes were rolled back)`;
                } catch (rollbackError) {
                    console.error('Rollback failed:', rollbackError);
                    error.message = `${error.message} (WARNING: rollback also failed - manual recovery may be needed)`;
                }
            }

            throw error;
        }
    }

    /**
     * Get file handle from a relative path within the semantic model or report
     * @param {string} filePath - Relative path like "definition/tables/Measure.tmdl"
     * @returns {Promise<FileHandle>}
     */
    async getFileHandleFromPath(filePath) {
        const parts = filePath.split('/');

        // Determine if this is a semantic model file or report file
        // Report files have paths like "definition/pages/..."
        // Semantic model files have paths like "definition/tables/..." or "definition/relationships.tmdl"
        const isReportFile = filePath.includes('/pages/');

        let currentHandle = isReportFile
            ? this.fileAccess.reportHandle
            : this.fileAccess.semanticModelHandle;

        if (!currentHandle) {
            throw new Error(`No ${isReportFile ? 'report' : 'semantic model'} handle available`);
        }

        // Navigate through directories
        for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
        }

        // Get the file handle
        const fileName = parts[parts.length - 1];
        return await currentHandle.getFileHandle(fileName);
    }

    /**
     * Create backup of file content before modification
     * @param {string} filePath
     * @param {string} content
     */
    createBackup(filePath, content) {
        this.backups.set(filePath, content);
        console.log(`Backup created for ${filePath}`);
    }

    /**
     * Restore all backed up files (rollback)
     */
    async restoreBackups() {
        console.log(`Rolling back ${this.backups.size} files...`);
        const failures = [];

        for (const [filePath, originalContent] of this.backups) {
            try {
                const fileHandle = await this.getFileHandleFromPath(filePath);
                await this.fileAccess.writeFile(fileHandle, originalContent);
                console.log(`Restored ${filePath}`);
            } catch (error) {
                console.error(`Failed to restore ${filePath}:`, error);
                failures.push({ filePath, error: error.message });
            }
        }

        this.backups.clear();

        if (failures.length > 0) {
            const failedFiles = failures.map(f => f.filePath).join(', ');
            throw new Error(`Rollback partially failed. Could not restore: ${failedFiles}. Manual recovery may be needed.`);
        }
    }

    /**
     * Clear backups after successful operation
     */
    clearBackups() {
        this.backups.clear();
    }

    /**
     * Verify write permission on the file system handles
     * @returns {Promise<void>}
     */
    async verifyWritePermission() {
        const handle = this.fileAccess.semanticModelHandle;
        if (!handle) {
            throw new Error('No semantic model folder selected');
        }

        // Check current permission state
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') return;

        // Request permission if not granted
        const requested = await handle.requestPermission({ mode: 'readwrite' });
        if (requested !== 'granted') {
            throw new Error('Write permission denied. Please grant write access to apply changes.');
        }
    }

    /**
     * Apply changes to a specific file
     * @param {string} filePath - Relative path to the file
     * @param {Array} changes - Array of change objects to apply
     */
    async applyChangesToFile(filePath, changes) {
        console.log(`Applying ${changes.length} changes to ${filePath}`);

        try {
            // 1. Get file handle
            const fileHandle = await this.getFileHandleFromPath(filePath);

            // 2. Read current content
            const file = await fileHandle.getFile();
            let content = await file.text();

            // 3. Create backup before modification
            this.createBackup(filePath, content);

            // 4. Apply all changes to this file
            for (const change of changes) {
                // For DAX changes, use the full content stored during preview
                if (change.type === 'measure-dax-reference' || change.type === 'column-dax-reference') {
                    // Use full content for DAX replacements (oldContent/newContent are truncated for display)
                    if (change.fullOldContent && change.fullNewContent) {
                        if (content.includes(change.fullOldContent)) {
                            content = content.replace(change.fullOldContent, change.fullNewContent);
                            console.log(`  Applied: ${change.description}`);
                        } else {
                            console.warn(`  DAX pattern not found for: ${change.affectedMeasureName}`);
                        }
                    }
                } else {
                    // Simple string replacement for definitions and visual references
                    if (content.includes(change.oldContent)) {
                        content = content.split(change.oldContent).join(change.newContent);
                        console.log(`  Applied: ${change.description}`);
                    } else {
                        console.warn(`  Pattern not found: ${change.oldContent}`);
                    }
                }
            }

            // 5. Write updated content back
            await this.fileAccess.writeFile(fileHandle, content);
            console.log(`Successfully updated ${filePath}`);

        } catch (error) {
            console.error(`Error applying changes to ${filePath}:`, error);
            throw new Error(`Failed to update ${filePath}: ${error.message}`);
        }
    }

    /**
     * Validate changes before applying
     */
    validateChanges() {
        // Check for potential issues
        const issues = [];
        const warnings = [];

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
            issues: issues,
            warnings: warnings
        };
    }

    /**
     * Validate a new name for measures or columns
     * @param {string} newName - The proposed new name
     * @param {string} nodeType - "measure" or "column"
     * @returns {Object} Validation result with valid flag and issues array
     */
    validateNewName(newName, nodeType) {
        const issues = [];
        const warnings = [];

        // DAX reserved keywords (partial list of most common)
        const daxReservedKeywords = [
            'TRUE', 'FALSE', 'AND', 'OR', 'NOT', 'IN', 'VAR', 'RETURN',
            'DEFINE', 'MEASURE', 'EVALUATE', 'ORDER', 'BY', 'ASC', 'DESC',
            'CALCULATE', 'FILTER', 'ALL', 'VALUES', 'DISTINCT', 'RELATED',
            'SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'IF', 'SWITCH', 'BLANK',
            'TABLE', 'COLUMN', 'ROW', 'SUMMARIZE', 'ADDCOLUMNS', 'SELECTCOLUMNS'
        ];

        // TMDL reserved keywords
        const tmdlReservedKeywords = [
            'table', 'column', 'measure', 'relationship', 'partition',
            'expression', 'formatString', 'isHidden', 'dataType', 'sourceColumn'
        ];

        // Check if empty
        if (!newName || newName.trim().length === 0) {
            issues.push('Name cannot be empty');
            return { valid: false, issues, warnings };
        }

        const trimmedName = newName.trim();

        // Check for reserved keywords (case-insensitive)
        const upperName = trimmedName.toUpperCase();
        if (daxReservedKeywords.includes(upperName)) {
            issues.push(`"${trimmedName}" is a DAX reserved keyword`);
        }

        if (tmdlReservedKeywords.includes(trimmedName.toLowerCase())) {
            issues.push(`"${trimmedName}" is a TMDL reserved keyword`);
        }

        // Check for problematic characters
        const invalidChars = /[[\]{}'"\\\/\n\r\t]/;
        if (invalidChars.test(trimmedName)) {
            issues.push('Name contains invalid characters: [ ] { } \' " \\ / or line breaks');
        }

        // Check for leading/trailing spaces
        if (newName !== trimmedName) {
            warnings.push('Name has leading or trailing spaces which will be trimmed');
        }

        // Check length
        if (trimmedName.length > 100) {
            warnings.push('Name is very long (>100 characters) which may cause display issues');
        }

        // Check if starts with number
        if (/^\d/.test(trimmedName)) {
            warnings.push('Name starts with a number which may cause issues in some DAX contexts');
        }

        return {
            valid: issues.length === 0,
            issues: issues,
            warnings: warnings
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RefactoringEngine;
}
