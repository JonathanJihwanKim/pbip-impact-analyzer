/**
 * File Access Module
 * Handles File System Access API operations for PBIP folders
 */

class FileAccessManager {
    constructor() {
        this.folderHandle = null;
        this.semanticModelHandle = null;        // Currently selected
        this.reportHandle = null;                // Currently selected
        this.availableSemanticModels = [];      // All discovered
        this.availableReports = [];              // All discovered
        this.fileStructure = {
            measures: [],
            tables: [],
            relationships: null,
            pages: [],
            visuals: []
        };
    }

    /**
     * Check if File System Access API is supported
     */
    isSupported() {
        return 'showDirectoryPicker' in window;
    }

    /**
     * Select PBIP folder using File System Access API
     * @returns {Promise<DirectoryHandle>}
     */
    async selectPBIPFolder() {
        try {
            if (!this.isSupported()) {
                throw new Error('File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.');
            }

            this.folderHandle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'documents'
            });

            // Find SemanticModel and Report folders
            await this.findPBIPStructure();

            return this.folderHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('User cancelled folder selection');
                return null;
            }
            console.error('Error selecting PBIP folder:', error);
            throw error;
        }
    }

    /**
     * Find SemanticModel and Report folder handles within the PBIP structure
     */
    async findPBIPStructure() {
        try {
            // Check if the selected folder itself is a .SemanticModel folder
            if (this.folderHandle.name.endsWith('.SemanticModel')) {
                throw new Error(
                    'You selected a .SemanticModel folder directly.\n\n' +
                    'Please select the PARENT folder that contains both:\n' +
                    '- <name>.SemanticModel\n' +
                    '- <name>.Report\n\n' +
                    `Selected: ${this.folderHandle.name}\n` +
                    'Please select the folder one level up.'
                );
            }

            // Check if the selected folder itself is a .Report folder
            if (this.folderHandle.name.endsWith('.Report')) {
                throw new Error(
                    'You selected a .Report folder directly.\n\n' +
                    'Please select the PARENT folder that contains both:\n' +
                    '- <name>.SemanticModel\n' +
                    '- <name>.Report\n\n' +
                    `Selected: ${this.folderHandle.name}\n` +
                    'Please select the folder one level up.'
                );
            }

            // Look for .SemanticModel and .Report folders in the selected folder
            for await (const entry of this.folderHandle.values()) {
                if (entry.kind === 'directory') {
                    if (entry.name.endsWith('.SemanticModel')) {
                        this.semanticModelHandle = entry;
                        console.log('Found SemanticModel:', entry.name);
                    } else if (entry.name.endsWith('.Report')) {
                        this.reportHandle = entry;
                        console.log('Found Report:', entry.name);
                    }
                }
            }

            if (!this.semanticModelHandle) {
                throw new Error(
                    'No .SemanticModel folder found in the selected directory.\n\n' +
                    'Please select a valid PBIP folder that contains:\n' +
                    '- <name>.SemanticModel (required)\n' +
                    '- <name>.Report (optional)\n\n' +
                    `Selected folder: ${this.folderHandle.name}`
                );
            }

            // Report is optional
            if (!this.reportHandle) {
                console.warn('Report folder not found. Only semantic model analysis will be available.');
            }

        } catch (error) {
            console.error('Error finding PBIP structure:', error);
            throw error;
        }
    }

    /**
     * Analyze a folder to discover SemanticModels and Reports
     * @param {DirectoryHandle} folderHandle - Folder to analyze
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeFolder(folderHandle) {
        const semanticModels = [];
        const reports = [];

        // Check if folder itself is a .SemanticModel or .Report
        const isSemanticModel = folderHandle.name.endsWith('.SemanticModel');
        const isReport = folderHandle.name.endsWith('.Report');

        if (!isSemanticModel && !isReport) {
            // Scan for PBIP folders (collect ALL, don't overwrite)
            for await (const entry of folderHandle.values()) {
                if (entry.kind === 'directory') {
                    if (entry.name.endsWith('.SemanticModel')) {
                        semanticModels.push({
                            handle: entry,
                            name: entry.name,
                            baseName: entry.name.replace('.SemanticModel', '')
                        });
                    } else if (entry.name.endsWith('.Report')) {
                        reports.push({
                            handle: entry,
                            name: entry.name,
                            baseName: entry.name.replace('.Report', '')
                        });
                    }
                }
            }
        }

        // Determine if this is a project folder (contains at least one SemanticModel)
        const isProjectFolder = semanticModels.length > 0;

        return { isSemanticModel, isReport, isProjectFolder, semanticModels, reports };
    }

    /**
     * Read Report definition.pbir file to get dataset reference
     * @param {DirectoryHandle} reportHandle - The report folder
     * @returns {Promise<Object>} Dataset path and full definition
     */
    async readReportDefinition(reportHandle) {
        try {
            // Read definition.pbir at root of Report folder
            const definitionFile = await this.getFileHandle(reportHandle, 'definition.pbir');
            const content = await this.readFile(definitionFile);
            const definition = JSON.parse(content);

            // Extract datasetReference path
            const datasetPath = definition.datasetReference?.byPath?.path;

            return {
                datasetPath: datasetPath || null, // Path is a string like "../Sales.SemanticModel"
                fullDefinition: definition
            };
        } catch (error) {
            console.warn(`Could not read definition.pbir for ${reportHandle.name}:`, error);
            return { datasetPath: null, fullDefinition: null };
        }
    }

    /**
     * Discover Reports that match or are related to the selected SemanticModel
     * Uses definition.pbir files to find actual connections (not folder name matching)
     * @param {DirectoryHandle} semanticModelHandle - The semantic model folder
     * @returns {Promise<Object>} Matching and other reports
     */
    async discoverReports(semanticModelHandle) {
        const semanticModelName = semanticModelHandle.name;
        const parentHandle = this.folderHandle; // Use initially selected root

        const matchingReports = [];

        try {
            for await (const entry of parentHandle.values()) {
                if (entry.kind === 'directory' && entry.name.endsWith('.Report')) {
                    // Read definition.pbir to check actual connection
                    const { datasetPath } = await this.readReportDefinition(entry);

                    // Extract just the folder name from relative path
                    // E.g., "../Sales.SemanticModel" → "Sales.SemanticModel"
                    const datasetFolderName = datasetPath ? datasetPath.split('/').pop() : null;

                    // ONLY add reports that match the selected semantic model
                    // Ignore reports that reference different models or have no reference
                    if (datasetFolderName === semanticModelName) {
                        matchingReports.push({
                            handle: entry,
                            name: entry.name,
                            datasetPath: datasetPath
                        });
                        console.log(`Found report ${entry.name} connected to ${semanticModelName}`);
                    }
                    // Removed: else branches that tracked "other reports"
                }
            }
        } catch (error) {
            console.warn('Error discovering reports:', error);
        }

        return { matchingReports };
    }

    /**
     * Get parent folder handle
     * Note: File System Access API doesn't provide parent access,
     * so we use the initially selected root folder
     * @returns {DirectoryHandle}
     */
    getParentFolder() {
        return this.folderHandle;
    }

    /**
     * Read all semantic model files (TMDL)
     * @returns {Promise<Object>}
     */
    async readSemanticModelFiles() {
        if (!this.semanticModelHandle) {
            throw new Error('SemanticModel folder not found');
        }

        try {
            const result = {
                measures: null,
                tables: [],
                relationships: null
            };

            // Navigate to definition/tables folder
            const definitionHandle = await this.getDirectoryHandle(this.semanticModelHandle, 'definition');
            const tablesHandle = await this.getDirectoryHandle(definitionHandle, 'tables');

            // Read all .tmdl files in tables folder
            for await (const entry of tablesHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.tmdl')) {
                    const content = await this.readFile(entry);

                    if (entry.name === 'Measure.tmdl') {
                        result.measures = {
                            fileName: entry.name,
                            content: content,
                            fileHandle: entry
                        };
                    } else {
                        result.tables.push({
                            fileName: entry.name,
                            tableName: entry.name.replace('.tmdl', ''),
                            content: content,
                            fileHandle: entry
                        });
                    }
                }
            }

            // Read relationships.tmdl from definition folder
            try {
                const relationshipsHandle = await this.getFileHandle(definitionHandle, 'relationships.tmdl');
                const content = await this.readFile(relationshipsHandle);
                result.relationships = {
                    fileName: 'relationships.tmdl',
                    content: content,
                    fileHandle: relationshipsHandle
                };
            } catch (error) {
                console.warn('relationships.tmdl not found');
            }

            return result;
        } catch (error) {
            console.error('Error reading semantic model files:', error);
            throw error;
        }
    }

    /**
     * Read all report files (JSON)
     * @returns {Promise<Object>}
     */
    async readReportFiles() {
        if (!this.reportHandle) {
            console.warn('Report folder not available');
            return {
                pages: [],
                visuals: []
            };
        }

        try {
            const result = {
                pages: [],
                visuals: []
            };

            // Navigate to definition/pages folder
            const definitionHandle = await this.getDirectoryHandle(this.reportHandle, 'definition');
            const pagesHandle = await this.getDirectoryHandle(definitionHandle, 'pages');

            // Read pages.json (we just check it exists, actual parsing happens in parsers.js if needed)
            try {
                await this.getFileHandle(pagesHandle, 'pages.json');

                // Read each page folder
                for await (const pageEntry of pagesHandle.values()) {
                    if (pageEntry.kind === 'directory' && pageEntry.name !== 'pages.json') {
                        const pageId = pageEntry.name;

                        // Read page.json
                        const pageJsonHandle = await this.getFileHandle(pageEntry, 'page.json');
                        const pageContent = await this.readFile(pageJsonHandle);
                        const pageData = JSON.parse(pageContent);

                        result.pages.push({
                            pageId: pageId,
                            content: pageData,
                            fileHandle: pageJsonHandle
                        });

                        // Read visuals folder
                        try {
                            const visualsHandle = await this.getDirectoryHandle(pageEntry, 'visuals');

                            for await (const visualEntry of visualsHandle.values()) {
                                if (visualEntry.kind === 'directory') {
                                    const visualId = visualEntry.name;

                                    // Read visual.json
                                    const visualJsonHandle = await this.getFileHandle(visualEntry, 'visual.json');
                                    const visualContent = await this.readFile(visualJsonHandle);
                                    const visualData = JSON.parse(visualContent);

                                    result.visuals.push({
                                        pageId: pageId,
                                        visualId: visualId,
                                        content: visualData,
                                        fileHandle: visualJsonHandle
                                    });
                                }
                            }
                        } catch (error) {
                            console.warn(`No visuals found for page ${pageId}`);
                        }
                    }
                }
            } catch (error) {
                console.error('Error reading pages.json:', error);
            }

            return result;
        } catch (error) {
            console.error('Error reading report files:', error);
            throw error;
        }
    }

    /**
     * Get directory handle by name
     * @param {DirectoryHandle} parentHandle
     * @param {string} dirName
     * @returns {Promise<DirectoryHandle>}
     */
    async getDirectoryHandle(parentHandle, dirName) {
        try {
            return await parentHandle.getDirectoryHandle(dirName);
        } catch (error) {
            throw new Error(`Directory "${dirName}" not found in ${parentHandle.name}`);
        }
    }

    /**
     * Get file handle by name
     * @param {DirectoryHandle} parentHandle
     * @param {string} fileName
     * @returns {Promise<FileHandle>}
     */
    async getFileHandle(parentHandle, fileName) {
        try {
            return await parentHandle.getFileHandle(fileName);
        } catch (error) {
            throw new Error(`File "${fileName}" not found in ${parentHandle.name}`);
        }
    }

    /**
     * Read file content
     * @param {FileHandle} fileHandle
     * @returns {Promise<string>}
     */
    async readFile(fileHandle) {
        try {
            const file = await fileHandle.getFile();
            const content = await file.text();
            return content;
        } catch (error) {
            console.error(`Error reading file ${fileHandle.name}:`, error);
            throw error;
        }
    }

    /**
     * Write content to file
     * @param {FileHandle} fileHandle
     * @param {string} content
     */
    async writeFile(fileHandle, content) {
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            console.log(`File ${fileHandle.name} written successfully`);
        } catch (error) {
            console.error(`Error writing file ${fileHandle.name}:`, error);
            throw error;
        }
    }

    /**
     * Rename a file by copying content to a new file and deleting the old one
     * File System Access API does not support direct rename.
     * @param {DirectoryHandle} parentDirHandle - Directory containing the file
     * @param {string} oldName - Current file name
     * @param {string} newName - New file name
     * @returns {Promise<FileHandle>} Handle to the new file
     */
    async renameFile(parentDirHandle, oldName, newName) {
        // Read old file
        const oldFileHandle = await parentDirHandle.getFileHandle(oldName);
        const oldFile = await oldFileHandle.getFile();
        const content = await oldFile.text();

        // Create new file with new name
        const newFileHandle = await parentDirHandle.getFileHandle(newName, { create: true });
        await this.writeFile(newFileHandle, content);

        // Delete old file
        await parentDirHandle.removeEntry(oldName);

        console.log(`Renamed ${oldName} → ${newName}`);
        return newFileHandle;
    }

    /**
     * Get folder name
     */
    getFolderName() {
        return this.folderHandle ? this.folderHandle.name : null;
    }

    /**
     * Get file structure summary
     */
    getFileStructure() {
        return {
            folderName: this.getFolderName(),
            hasSemanticModel: !!this.semanticModelHandle,
            hasReport: !!this.reportHandle,
            semanticModelName: this.semanticModelHandle?.name,
            reportName: this.reportHandle?.name
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileAccessManager;
}
