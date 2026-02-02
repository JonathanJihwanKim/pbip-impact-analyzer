/**
 * Parsers Module
 * Handles parsing of TMDL files, JSON files, and DAX expressions
 */

class TMDLParser {
    /**
     * Parse Measure.tmdl to extract all measures and their properties
     * @param {string} tmdlContent - Content of Measure.tmdl file
     * @returns {Array<Object>} Array of measure objects
     */
    static parseMeasuresTMDL(tmdlContent) {
        const measures = [];

        try {
            // Split by measure definitions
            // Pattern: measure 'Name' = or measure Name =
            const measurePattern = /measure\s+(?:'([^']+)'|(\w+))\s*=\s*/g;

            let match;
            const matches = [];

            // Find all measure declarations
            while ((match = measurePattern.exec(tmdlContent)) !== null) {
                matches.push({
                    name: match[1] || match[2],
                    startIndex: match.index,
                    endIndex: measurePattern.lastIndex
                });
            }

            // Extract each measure with its properties
            for (let i = 0; i < matches.length; i++) {
                const currentMatch = matches[i];
                const nextMatch = matches[i + 1];

                // Get content from measure declaration to next measure (or end of file)
                const measureContent = nextMatch
                    ? tmdlContent.substring(currentMatch.endIndex, nextMatch.startIndex)
                    : tmdlContent.substring(currentMatch.endIndex);

                // Extract DAX expression (everything before lineageTag or formatString)
                const daxMatch = measureContent.match(/^\s*([^]*?)(?=\s*(?:lineageTag|formatString|displayFolder|dataCategory|description|$))/);
                const dax = daxMatch ? daxMatch[1].trim() : '';

                // Extract properties
                const lineageTagMatch = measureContent.match(/lineageTag:\s*([^\s\n]+)/);
                const formatStringMatch = measureContent.match(/formatString:\s*(.+?)(?:\n|$)/);
                const displayFolderMatch = measureContent.match(/displayFolder:\s*(.+?)(?:\n|$)/);
                const descriptionMatch = measureContent.match(/description:\s*(.+?)(?:\n|$)/);

                measures.push({
                    name: currentMatch.name,
                    dax: dax,
                    lineageTag: lineageTagMatch ? lineageTagMatch[1] : null,
                    formatString: formatStringMatch ? formatStringMatch[1].trim() : null,
                    displayFolder: displayFolderMatch ? displayFolderMatch[1].trim() : null,
                    description: descriptionMatch ? descriptionMatch[1].trim() : null
                });
            }

            console.log(`Parsed ${measures.length} measures from Measure.tmdl`);
            return measures;

        } catch (error) {
            console.error('Error parsing Measure.tmdl:', error);
            return [];
        }
    }

    /**
     * Parse table TMDL to extract table name and columns
     * @param {string} tmdlContent - Content of table .tmdl file
     * @param {string} fileName - Name of the file (used as fallback table name)
     * @returns {Object} Table object with columns
     */
    static parseTableTMDL(tmdlContent, fileName) {
        try {
            // Extract table name
            const tableNameMatch = tmdlContent.match(/table\s+(?:'([^']+)'|(\w+))/);
            const tableName = tableNameMatch ? (tableNameMatch[1] || tableNameMatch[2]) : fileName.replace('.tmdl', '');

            // Extract columns
            const columns = [];
            const columnPattern = /column\s+(?:'([^']+)'|(\w+))\s*/g;

            let match;
            const columnMatches = [];

            while ((match = columnPattern.exec(tmdlContent)) !== null) {
                columnMatches.push({
                    name: match[1] || match[2],
                    startIndex: match.index,
                    endIndex: columnPattern.lastIndex
                });
            }

            // Extract column properties
            for (let i = 0; i < columnMatches.length; i++) {
                const currentMatch = columnMatches[i];
                const nextMatch = columnMatches[i + 1];

                const columnContent = nextMatch
                    ? tmdlContent.substring(currentMatch.endIndex, nextMatch.startIndex)
                    : tmdlContent.substring(currentMatch.endIndex);

                // Extract properties
                const dataTypeMatch = columnContent.match(/dataType:\s*(\w+)/);
                const formatStringMatch = columnContent.match(/formatString:\s*(.+?)(?:\n|$)/);
                const lineageTagMatch = columnContent.match(/lineageTag:\s*([^\s\n]+)/);
                const sourceColumnMatch = columnContent.match(/sourceColumn:\s*(.+?)(?:\n|$)/);
                const summarizeByMatch = columnContent.match(/summarizeBy:\s*(\w+)/);
                const isHiddenMatch = columnContent.match(/isHidden:\s*(\w+)/);

                columns.push({
                    name: currentMatch.name,
                    dataType: dataTypeMatch ? dataTypeMatch[1] : null,
                    formatString: formatStringMatch ? formatStringMatch[1].trim() : null,
                    lineageTag: lineageTagMatch ? lineageTagMatch[1] : null,
                    sourceColumn: sourceColumnMatch ? sourceColumnMatch[1].trim() : null,
                    summarizeBy: summarizeByMatch ? summarizeByMatch[1] : null,
                    isHidden: isHiddenMatch ? isHiddenMatch[1] === 'true' : false
                });
            }

            console.log(`Parsed table "${tableName}" with ${columns.length} columns`);

            return {
                tableName: tableName,
                columns: columns
            };

        } catch (error) {
            console.error(`Error parsing table TMDL (${fileName}):`, error);
            return {
                tableName: fileName.replace('.tmdl', ''),
                columns: []
            };
        }
    }

    /**
     * Parse relationships.tmdl to extract relationship definitions
     * @param {string} tmdlContent - Content of relationships.tmdl file
     * @returns {Array<Object>} Array of relationship objects
     */
    static parseRelationshipsTMDL(tmdlContent) {
        const relationships = [];

        try {
            // Pattern: relationship <id> or relationship '<name>'
            const relationshipPattern = /relationship\s+(?:'([^']+)'|([^\s\n]+))\s*/g;

            let match;
            const matches = [];

            while ((match = relationshipPattern.exec(tmdlContent)) !== null) {
                matches.push({
                    name: match[1] || match[2],
                    startIndex: match.index,
                    endIndex: relationshipPattern.lastIndex
                });
            }

            // Extract relationship properties
            for (let i = 0; i < matches.length; i++) {
                const currentMatch = matches[i];
                const nextMatch = matches[i + 1];

                const relationshipContent = nextMatch
                    ? tmdlContent.substring(currentMatch.endIndex, nextMatch.startIndex)
                    : tmdlContent.substring(currentMatch.endIndex);

                // Extract from/to columns
                const fromColumnMatch = relationshipContent.match(/fromColumn:\s*(.+?)\.(.+?)(?:\s|\n|$)/);
                const toColumnMatch = relationshipContent.match(/toColumn:\s*(.+?)\.(.+?)(?:\s|\n|$)/);
                const fromCardinalityMatch = relationshipContent.match(/fromCardinality:\s*(\w+)/);
                const toCardinalityMatch = relationshipContent.match(/toCardinality:\s*(\w+)/);
                const crossFilteringMatch = relationshipContent.match(/crossFilteringBehavior:\s*(\w+)/);
                const isActiveMatch = relationshipContent.match(/isActive:\s*(\w+)/);

                relationships.push({
                    name: currentMatch.name,
                    fromTable: fromColumnMatch ? fromColumnMatch[1] : null,
                    fromColumn: fromColumnMatch ? fromColumnMatch[2] : null,
                    toTable: toColumnMatch ? toColumnMatch[1] : null,
                    toColumn: toColumnMatch ? toColumnMatch[2] : null,
                    fromCardinality: fromCardinalityMatch ? fromCardinalityMatch[1] : null,
                    toCardinality: toCardinalityMatch ? toCardinalityMatch[1] : null,
                    crossFilteringBehavior: crossFilteringMatch ? crossFilteringMatch[1] : null,
                    isActive: isActiveMatch ? isActiveMatch[1] === 'true' : true
                });
            }

            console.log(`Parsed ${relationships.length} relationships from relationships.tmdl`);
            return relationships;

        } catch (error) {
            console.error('Error parsing relationships.tmdl:', error);
            return [];
        }
    }
}

class JSONParser {
    /**
     * Parse pages.json to get list of pages
     * @param {string} jsonContent - Content of pages.json
     * @returns {Array<Object>} Array of page objects
     */
    static parsePages(jsonContent) {
        try {
            const data = JSON.parse(jsonContent);
            return data.pages || [];
        } catch (error) {
            console.error('Error parsing pages.json:', error);
            return [];
        }
    }

    /**
     * Parse page.json to get page metadata
     * @param {Object} pageData - Parsed page.json data
     * @returns {Object} Page metadata
     */
    static parsePage(pageData) {
        try {
            return {
                name: pageData.name,
                displayName: pageData.displayName,
                width: pageData.width,
                height: pageData.height,
                filters: pageData.filters || []
            };
        } catch (error) {
            console.error('Error parsing page.json:', error);
            return {};
        }
    }

    /**
     * Parse visual.json to extract visual type and field references
     * @param {Object} visualData - Parsed visual.json data
     * @returns {Object} Visual metadata with field references
     */
    static parseVisual(visualData) {
        try {
            // visualType can be at root level or nested inside visual object
            const visualType = visualData.visual?.visualType || visualData.visualType || 'unknown';
            const fields = this.extractFieldReferences(visualData);
            const visualName = this.extractVisualName(visualData);

            return {
                visualType: visualType,
                visualName: visualName,
                fields: fields,
                title: visualData.title || '',
                config: visualData.config || {}
            };
        } catch (error) {
            console.error('Error parsing visual.json:', error);
            return {
                visualType: 'unknown',
                visualName: null,
                fields: []
            };
        }
    }

    /**
     * Extract visual name from visualContainerObjects
     * @param {Object} visualData - Parsed visual.json data
     * @returns {string|null} Visual name or null if not found
     */
    static extractVisualName(visualData) {
        try {
            // Navigate to visualContainerObjects
            const containerObjects = visualData.visual?.visualContainerObjects;

            if (!containerObjects) return null;

            // Look for title in common locations
            // Option 1: visualContainerObjects.title
            if (containerObjects.title && containerObjects.title.length > 0) {
                const titleObj = containerObjects.title[0];
                if (titleObj.properties?.text?.expr?.Literal?.Value) {
                    // Extract string value, removing quotes
                    const value = titleObj.properties.text.expr.Literal.Value;
                    return value.replace(/^['"]|['"]$/g, '');
                }
            }

            // Option 2: visualContainerObjects.general (alternative location)
            if (containerObjects.general && containerObjects.general.length > 0) {
                const generalObj = containerObjects.general[0];
                if (generalObj.properties?.title?.expr?.Literal?.Value) {
                    const value = generalObj.properties.title.expr.Literal.Value;
                    return value.replace(/^['"]|['"]$/g, '');
                }
            }

            return null; // No name found
        } catch (error) {
            console.error('Error extracting visual name:', error);
            return null;
        }
    }

    /**
     * Extract field references from visual queryState, sortDefinition, filterConfig, and objects
     * @param {Object} visualData - Parsed visual.json data
     * @returns {Array<Object>} Array of field references
     */
    static extractFieldReferences(visualData) {
        const fieldMap = new Map(); // Use Map for deduplication by "type|entity|property"

        try {
            // Scan queryState projections (existing)
            this.extractFromQueryState(visualData.query?.queryState, fieldMap);

            // Scan sortDefinition (NEW)
            this.extractFromSortDefinition(visualData.visual?.query?.sortDefinition, fieldMap);

            // Scan filterConfig (NEW)
            this.extractFromFilterConfig(visualData.filterConfig, fieldMap);

            // Scan visual objects for dynamic expressions (NEW)
            this.extractFromVisualObjects(visualData.visual?.objects, fieldMap);

        } catch (error) {
            console.error('Error extracting field references:', error);
        }

        return Array.from(fieldMap.values());
    }

    /**
     * Extract field references from queryState projections
     * @param {Object} queryState - The query.queryState object
     * @param {Map} fieldMap - Map to store unique fields
     */
    static extractFromQueryState(queryState, fieldMap) {
        if (!queryState) return;

        // Iterate through all projection groups (Category, Y, X, Values, Columns, Rows, etc.)
        for (const [projectionName, projection] of Object.entries(queryState)) {
            if (!projection.projections) continue;

            for (const proj of projection.projections) {
                this.extractFieldFromProjection(proj, projectionName, 'queryState', fieldMap);
            }
        }
    }

    /**
     * Extract field references from sort definitions
     * @param {Object} sortDefinition - The query.sortDefinition object
     * @param {Map} fieldMap - Map to store unique fields
     */
    static extractFromSortDefinition(sortDefinition, fieldMap) {
        if (!sortDefinition?.sort) return;

        for (const sortItem of sortDefinition.sort) {
            if (!sortItem.field) continue;

            // Extract field using same pattern as queryState
            this.extractFieldFromProjection(
                { field: sortItem.field },
                'sortDefinition',
                'sort',
                fieldMap
            );
        }
    }

    /**
     * Extract field references from filter configurations
     * @param {Object} filterConfig - The filterConfig object
     * @param {Map} fieldMap - Map to store unique fields
     */
    static extractFromFilterConfig(filterConfig, fieldMap) {
        if (!filterConfig?.filters) return;

        for (const filter of filterConfig.filters) {
            if (!filter.field) continue;

            // Extract field using same pattern
            this.extractFieldFromProjection(
                { field: filter.field },
                'filterConfig',
                'filter',
                fieldMap
            );
        }
    }

    /**
     * Extract field references from visual objects (buttons, conditional formatting, etc.)
     * @param {Object} objects - The visual.objects object
     * @param {Map} fieldMap - Map to store unique fields
     */
    static extractFromVisualObjects(objects, fieldMap) {
        if (!objects) return;

        // Recursively search for field references in nested objects
        const searchForFields = (obj, depth = 0) => {
            // Limit recursion depth to avoid performance issues
            if (!obj || typeof obj !== 'object' || depth > 10) return;

            // Check if this object contains a Column or Measure reference
            if (obj.Column) {
                const entity = obj.Column.Expression?.SourceRef?.Entity;
                const property = obj.Column.Property;
                if (entity && property) {
                    this.addFieldToMap('column', entity, property, 'visualObjects', 'object', fieldMap);
                }
            } else if (obj.Measure) {
                const entity = obj.Measure.Expression?.SourceRef?.Entity;
                const property = obj.Measure.Property;
                if (entity && property) {
                    this.addFieldToMap('measure', entity, property, 'visualObjects', 'object', fieldMap);
                }
            }

            // Recurse into nested objects and arrays
            for (const value of Object.values(obj)) {
                if (typeof value === 'object') {
                    searchForFields(value, depth + 1);
                }
            }
        };

        searchForFields(objects);
    }

    /**
     * Extract a field from a projection object and add to map
     * @param {Object} proj - Projection object with field property
     * @param {string} projectionName - Name of the projection (e.g., "Category", "Y")
     * @param {string} location - Location type (e.g., "queryState", "sort")
     * @param {Map} fieldMap - Map to store unique fields
     */
    static extractFieldFromProjection(proj, projectionName, location, fieldMap) {
        // Column reference
        if (proj.field?.Column) {
            const entity = proj.field.Column.Expression?.SourceRef?.Entity;
            const property = proj.field.Column.Property;

            if (entity && property) {
                this.addFieldToMap(
                    'column',
                    entity,
                    property,
                    projectionName,
                    location,
                    fieldMap,
                    proj.queryRef
                );
            }
        }
        // Measure reference
        else if (proj.field?.Measure) {
            const entity = proj.field.Measure.Expression?.SourceRef?.Entity;
            const property = proj.field.Measure.Property;

            if (entity && property) {
                this.addFieldToMap(
                    'measure',
                    entity,
                    property,
                    projectionName,
                    location,
                    fieldMap,
                    proj.queryRef
                );
            }
        }
        // Hierarchy reference
        else if (proj.field?.Hierarchy) {
            const entity = proj.field.Hierarchy.Expression?.SourceRef?.Entity;
            const hierarchy = proj.field.Hierarchy.Hierarchy;

            if (entity && hierarchy) {
                this.addFieldToMap(
                    'hierarchy',
                    entity,
                    hierarchy,
                    projectionName,
                    location,
                    fieldMap,
                    proj.queryRef
                );
            }
        }
    }

    /**
     * Add a field to the map with deduplication
     * @param {string} type - Field type (column, measure, hierarchy)
     * @param {string} entity - Entity/table name
     * @param {string} property - Property/column/measure name
     * @param {string} projectionName - Projection name
     * @param {string} location - Location type
     * @param {Map} fieldMap - Map to store unique fields
     * @param {string} queryRef - Optional query reference
     */
    static addFieldToMap(type, entity, property, projectionName, location, fieldMap, queryRef = null) {
        // Create unique key for deduplication
        // For measures: "measure|Measure|Total Sales"
        // For columns: "column|customer|Gender"
        const key = `${type}|${entity}|${property}`;

        // If already exists, just add the new location to metadata
        if (fieldMap.has(key)) {
            const existing = fieldMap.get(key);
            // Add location info if not already present
            if (!existing.locations) existing.locations = [];
            existing.locations.push({ projectionName, location });
            return;
        }

        // Create new field entry
        const fieldEntry = {
            type: type,
            queryRef: queryRef,
            projectionName: projectionName,
            location: location,
            locations: [{ projectionName, location }]
        };

        // Add type-specific properties
        if (type === 'measure') {
            fieldEntry.entity = entity;
            fieldEntry.name = property;
        } else if (type === 'column') {
            fieldEntry.table = entity;
            fieldEntry.column = property;
        } else if (type === 'hierarchy') {
            fieldEntry.table = entity;
            fieldEntry.hierarchy = property;
        }

        fieldMap.set(key, fieldEntry);
    }
}

class DAXParser {
    /**
     * Clean DAX expression by removing comments and string literals
     * @param {string} daxExpression
     * @returns {string}
     */
    static cleanDAX(daxExpression) {
        // Remove multi-line comments /* ... */
        let cleaned = daxExpression.replace(/\/\*[\s\S]*?\*\//g, '');

        // Remove single-line comments // ...
        cleaned = cleaned.replace(/\/\/.*/g, '');

        // Remove string literals "..." to avoid false positives
        cleaned = cleaned.replace(/"[^"]*"/g, '""');

        return cleaned;
    }

    /**
     * Extract measure references from DAX expression
     * @param {string} daxExpression
     * @returns {Array<string>} Array of measure names
     */
    static extractMeasureReferences(daxExpression) {
        const measureRefs = new Set();

        try {
            const cleaned = this.cleanDAX(daxExpression);

            // Pattern: [MeasureName] - most common pattern
            const bracketPattern = /\[([^\]]+)\]/g;
            let match;

            while ((match = bracketPattern.exec(cleaned)) !== null) {
                const ref = match[1].trim();
                // Exclude column references (they contain table name)
                // This is a heuristic - measure refs in [] without table prefix
                if (!ref.includes('[') && ref.length > 0) {
                    measureRefs.add(ref);
                }
            }

        } catch (error) {
            console.error('Error extracting measure references:', error);
        }

        return Array.from(measureRefs);
    }

    /**
     * Extract column references from DAX expression
     * @param {string} daxExpression
     * @returns {Array<Object>} Array of {table, column} objects
     */
    static extractColumnReferences(daxExpression) {
        const columnRefs = [];

        try {
            const cleaned = this.cleanDAX(daxExpression);

            // Pattern: TableName[ColumnName]
            const columnPattern = /(\w+|\'.+?\')\[([^\]]+)\]/g;
            let match;

            while ((match = columnPattern.exec(cleaned)) !== null) {
                let table = match[1].trim();
                const column = match[2].trim();

                // Remove quotes from table name if present
                if (table.startsWith("'") && table.endsWith("'")) {
                    table = table.slice(1, -1);
                }

                columnRefs.push({
                    table: table,
                    column: column
                });
            }

        } catch (error) {
            console.error('Error extracting column references:', error);
        }

        return columnRefs;
    }

    /**
     * Extract function calls from DAX expression
     * @param {string} daxExpression
     * @returns {Array<string>} Array of function names
     */
    static extractFunctionCalls(daxExpression) {
        const functions = new Set();

        try {
            const cleaned = this.cleanDAX(daxExpression);

            // Pattern: FUNCTIONNAME( - uppercase function names
            const functionPattern = /\b([A-Z][A-Z0-9_]*)\s*\(/g;
            let match;

            while ((match = functionPattern.exec(cleaned)) !== null) {
                functions.add(match[1]);
            }

        } catch (error) {
            console.error('Error extracting function calls:', error);
        }

        return Array.from(functions);
    }

    /**
     * Extract table references from DAX expression (for COUNTROWS, ALL, etc.)
     * @param {string} daxExpression
     * @returns {Array<string>} Array of table names
     */
    static extractTableReferences(daxExpression) {
        const tableRefs = new Set();

        try {
            const cleaned = this.cleanDAX(daxExpression);

            // Pattern: COUNTROWS(TableName), ALL(TableName), VALUES(TableName), etc.
            // Handles both quoted and unquoted table names
            const tableFunctionPattern = /(?:COUNTROWS|RELATEDTABLE|VALUES|ALL|DISTINCT|SUMMARIZE|ADDCOLUMNS|FILTER|CALCULATETABLE)\s*\(\s*(?:'([^']+)'|(\w+))\s*(?:[,)])/gi;

            let match;
            while ((match = tableFunctionPattern.exec(cleaned)) !== null) {
                const tableName = match[1] || match[2];  // Quoted or unquoted
                tableRefs.add(tableName);
            }

        } catch (error) {
            console.error('Error extracting table references:', error);
        }

        return Array.from(tableRefs);
    }

    /**
     * Extract all references (measures and columns) from DAX
     * @param {string} daxExpression
     * @returns {Object} Object with measureRefs and columnRefs
     */
    static extractReferences(daxExpression) {
        return {
            measureRefs: this.extractMeasureReferences(daxExpression),
            columnRefs: this.extractColumnReferences(daxExpression),
            tableRefs: this.extractTableReferences(daxExpression),
            functions: this.extractFunctionCalls(daxExpression)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TMDLParser, JSONParser, DAXParser };
}
