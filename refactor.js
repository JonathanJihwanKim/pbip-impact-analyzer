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
        if (nodeType === 'table') {
            const tableNodeId = `Table.${newName}`;
            if (this.analyzer.dependencyGraph.nodes[tableNodeId]) {
                throw new Error(`A table with name "${newName}" already exists`);
            }
        } else {
            const nodeId = nodeType === 'measure'
                ? `Measure.${newName}`
                : `${tableName}.${newName}`;

            if (this.analyzer.dependencyGraph.nodes[nodeId]) {
                throw new Error(`A ${nodeType} with name "${newName}" already exists`);
            }
        }

        // Generate changes based on type
        if (nodeType === 'measure') {
            await this.previewMeasureRename(oldName, newName);
        } else if (nodeType === 'column') {
            await this.previewColumnRename(oldName, newName, tableName);
        } else if (nodeType === 'table') {
            await this.previewTableRename(oldName, newName);
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
     * Preview table rename operation with cascading updates
     * @param {string} oldTableName - Current table name
     * @param {string} newTableName - New table name
     */
    async previewTableRename(oldTableName, newTableName) {
        const tableNodeId = `Table.${oldTableName}`;
        const tableNode = this.analyzer.dependencyGraph.nodes[tableNodeId];

        if (!tableNode) {
            throw new Error(`Table "${oldTableName}" not found`);
        }

        // 1. TMDL file rename + update table declaration inside
        this.previewChanges.push({
            file: `definition/tables/${oldTableName}.tmdl`,
            type: 'file-rename',
            description: `Rename file "${oldTableName}.tmdl" to "${newTableName}.tmdl"`,
            oldFileName: `${oldTableName}.tmdl`,
            newFileName: `${newTableName}.tmdl`,
            oldContent: `table '${oldTableName}'`,
            newContent: `table '${newTableName}'`
        });

        // 2. Update all measure DAX that references this table
        for (const measure of this.analyzer.measures) {
            const oldDAX = measure.dax;
            const newDAX = this.replaceTableNameInDAX(oldDAX, oldTableName, newTableName);

            if (oldDAX !== newDAX) {
                this.previewChanges.push({
                    file: 'definition/tables/Measure.tmdl',
                    type: 'table-dax-reference',
                    description: `Update table references in measure "${measure.name}"`,
                    oldContent: oldDAX.substring(0, 200) + (oldDAX.length > 200 ? '...' : ''),
                    newContent: newDAX.substring(0, 200) + (newDAX.length > 200 ? '...' : ''),
                    fullOldContent: oldDAX,
                    fullNewContent: newDAX,
                    affectedMeasureName: measure.name
                });
            }
        }

        // 3. Update visual field references (Entity name)
        for (const visual of this.analyzer.visuals) {
            const visualNodeId = `${visual.pageId}/${visual.visualId}`;
            const visualNode = this.analyzer.dependencyGraph.nodes[visualNodeId];
            if (!visualNode) continue;

            // Check if any field in this visual references the table being renamed
            const hasTableRef = visual.fields.some(f =>
                (f.type === 'column' && f.table === oldTableName) ||
                (f.type === 'measure' && f.entity === oldTableName)
            );

            if (hasTableRef) {
                this.previewChanges.push({
                    file: `definition/pages/${visual.pageId}/visuals/${visual.visualId}/visual.json`,
                    type: 'visual-entity-reference',
                    description: `Update table entity in visual ${visual.visualId} on page ${visual.pageId}`,
                    oldContent: `"Entity": "${oldTableName}"`,
                    newContent: `"Entity": "${newTableName}"`
                });
            }
        }

        // 4. Update relationships
        for (const rel of this.analyzer.relationships) {
            if (rel.fromTable === oldTableName) {
                this.previewChanges.push({
                    file: 'definition/relationships.tmdl',
                    type: 'relationship-table-reference',
                    description: `Update fromTable in relationship "${rel.name}"`,
                    oldContent: `${oldTableName}.${rel.fromColumn}`,
                    newContent: `${newTableName}.${rel.fromColumn}`
                });
            }
            if (rel.toTable === oldTableName) {
                this.previewChanges.push({
                    file: 'definition/relationships.tmdl',
                    type: 'relationship-table-reference',
                    description: `Update toTable in relationship "${rel.name}"`,
                    oldContent: `${oldTableName}.${rel.toColumn}`,
                    newContent: `${newTableName}.${rel.toColumn}`
                });
            }
        }
    }

    /**
     * Replace table name in DAX expression
     * Handles: Table[Column], 'Table'[Column], COUNTROWS(Table), COUNTROWS('Table'), etc.
     * @param {string} dax - The DAX expression
     * @param {string} oldTableName - Old table name
     * @param {string} newTableName - New table name
     * @returns {string} Updated DAX
     */
    replaceTableNameInDAX(dax, oldTableName, newTableName) {
        let result = dax;

        // Determine if the new table name needs quoting (has spaces or special chars)
        const needsQuotes = /\s/.test(newTableName);

        // Pattern 1: Unquoted table name before column reference: TableName[Column]
        const pattern1 = new RegExp(
            `(?<!')${this.escapeRegex(oldTableName)}\\[`,
            'gi'
        );
        result = result.replace(pattern1, (match) => {
            const replacement = needsQuotes ? `'${newTableName}'[` : `${newTableName}[`;
            return replacement;
        });

        // Pattern 2: Quoted table name before column reference: 'Table Name'[Column]
        const pattern2 = new RegExp(
            `'${this.escapeRegex(oldTableName)}'\\[`,
            'gi'
        );
        result = result.replace(pattern2, `'${newTableName}'[`);

        // Pattern 3: Table name in function arguments (unquoted): COUNTROWS(TableName)
        const tableFunctions = 'COUNTROWS|RELATEDTABLE|VALUES|ALL|DISTINCT|SUMMARIZE|ADDCOLUMNS|SELECTCOLUMNS|FILTER|CALCULATETABLE|TOPN|SAMPLE|GENERATE|GENERATEALL|NATURALLEFTOUTERJOIN|NATURALINNERJOIN|CROSSJOIN|UNION|INTERSECT|EXCEPT|DATATABLE|TREATAS';
        const pattern3 = new RegExp(
            `((?:${tableFunctions})\\s*\\(\\s*)(?<!')${this.escapeRegex(oldTableName)}(\\s*[,)])`,
            'gi'
        );
        result = result.replace(pattern3, (match, prefix, suffix) => {
            const replacement = needsQuotes ? `${prefix}'${newTableName}'${suffix}` : `${prefix}${newTableName}${suffix}`;
            return replacement;
        });

        // Pattern 4: Table name in function arguments (quoted): COUNTROWS('Table Name')
        const pattern4 = new RegExp(
            `((?:${tableFunctions})\\s*\\(\\s*)'${this.escapeRegex(oldTableName)}'(\\s*[,)])`,
            'gi'
        );
        result = result.replace(pattern4, `$1'${newTableName}'$2`);

        return result;
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
            // Separate file-rename changes from content changes
            const fileRenameChanges = this.previewChanges.filter(c => c.type === 'file-rename');
            const contentChanges = this.previewChanges.filter(c => c.type !== 'file-rename');

            // Group content changes by file
            const changesByFile = {};
            for (const change of contentChanges) {
                if (!changesByFile[change.file]) {
                    changesByFile[change.file] = [];
                }
                changesByFile[change.file].push(change);
            }

            const filesModified = [];

            // Apply file rename changes first (rename + update content inside)
            for (const change of fileRenameChanges) {
                await this.applyFileRename(change);
                filesModified.push(change.file);
            }

            // Apply content changes file by file
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

        for (const [filePath, backup] of this.backups) {
            try {
                if (backup && typeof backup === 'object' && backup.type === 'file-rename') {
                    // Rollback a file rename: rename back and restore original content
                    await this.fileAccess.renameFile(backup.dirHandle, backup.newFileName, backup.oldFileName);
                    const restoredHandle = await backup.dirHandle.getFileHandle(backup.oldFileName);
                    await this.fileAccess.writeFile(restoredHandle, backup.originalContent);
                    console.log(`Restored file rename: ${backup.newFileName} → ${backup.oldFileName}`);
                } else {
                    // Rollback a content change
                    const fileHandle = await this.getFileHandleFromPath(filePath);
                    await this.fileAccess.writeFile(fileHandle, backup);
                    console.log(`Restored ${filePath}`);
                }
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
     * Apply a file rename change (rename TMDL file + update content inside)
     * @param {Object} change - The file-rename change object
     */
    async applyFileRename(change) {
        console.log(`Renaming file: ${change.oldFileName} → ${change.newFileName}`);

        try {
            // Navigate to the directory containing the file
            const parts = change.file.split('/');
            let currentHandle = this.fileAccess.semanticModelHandle;
            for (let i = 0; i < parts.length - 1; i++) {
                currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
            }

            // Read current file content for backup
            const oldFileHandle = await currentHandle.getFileHandle(change.oldFileName);
            const oldFile = await oldFileHandle.getFile();
            const originalContent = await oldFile.text();

            // Store backup with old filename for rollback
            this.backups.set(change.file, {
                type: 'file-rename',
                dirHandle: currentHandle,
                oldFileName: change.oldFileName,
                newFileName: change.newFileName,
                originalContent: originalContent
            });

            // Update content (table declaration) inside the file
            let newContent = originalContent;
            if (change.oldContent && change.newContent) {
                newContent = newContent.split(change.oldContent).join(change.newContent);
            }

            // Perform the rename via FileAccessManager
            await this.fileAccess.renameFile(currentHandle, change.oldFileName, change.newFileName);

            // If content was updated, write the modified content to the new file
            if (newContent !== originalContent) {
                const newFileHandle = await currentHandle.getFileHandle(change.newFileName);
                await this.fileAccess.writeFile(newFileHandle, newContent);
            }

            console.log(`Successfully renamed ${change.oldFileName} → ${change.newFileName}`);
        } catch (error) {
            console.error(`Error renaming file ${change.oldFileName}:`, error);
            throw new Error(`Failed to rename ${change.oldFileName}: ${error.message}`);
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
                if (change.type === 'measure-dax-reference' || change.type === 'column-dax-reference' || change.type === 'table-dax-reference') {
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
