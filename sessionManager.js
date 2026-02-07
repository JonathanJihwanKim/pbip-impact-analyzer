/**
 * Session Manager Module
 * Handles persistence of recent analyses, favorites, and user settings via localStorage
 */

class SessionManager {
    /**
     * @param {string} storageKey - The localStorage key prefix
     */
    constructor(storageKey = 'pbip-impact-analyzer') {
        this.storageKey = storageKey;
        this.data = this._load();
    }

    // ── Recent Analyses ─────────────────────────────────────────

    /**
     * Add a recent analysis entry
     * @param {string} nodeId - The analyzed node ID
     * @param {string} nodeName - Display name
     * @param {string} nodeType - 'measure', 'column', or 'visual'
     * @param {number} [timestamp] - Unix timestamp (defaults to now)
     */
    addRecentAnalysis(nodeId, nodeName, nodeType, timestamp = Date.now()) {
        // Remove duplicate if it already exists
        this.data.recentAnalyses = this.data.recentAnalyses.filter(a => a.nodeId !== nodeId);

        // Add to front
        this.data.recentAnalyses.unshift({
            nodeId,
            name: nodeName,
            type: nodeType,
            timestamp
        });

        // Keep only last 10
        if (this.data.recentAnalyses.length > 10) {
            this.data.recentAnalyses = this.data.recentAnalyses.slice(0, 10);
        }

        this._save();
    }

    /**
     * Get recent analyses
     * @param {number} [limit=10] - Maximum entries to return
     * @returns {Array<Object>}
     */
    getRecentAnalyses(limit = 10) {
        return this.data.recentAnalyses.slice(0, limit);
    }

    /**
     * Clear all recent analyses
     */
    clearRecentAnalyses() {
        this.data.recentAnalyses = [];
        this._save();
    }

    // ── Favorites ───────────────────────────────────────────────

    /**
     * Add a favorite
     * @param {string} nodeId
     * @param {string} nodeName
     * @param {string} nodeType
     */
    addFavorite(nodeId, nodeName, nodeType) {
        if (this.isFavorite(nodeId)) return;

        this.data.favorites.push({
            nodeId,
            name: nodeName,
            type: nodeType
        });

        this._save();
    }

    /**
     * Remove a favorite by nodeId
     * @param {string} nodeId
     */
    removeFavorite(nodeId) {
        this.data.favorites = this.data.favorites.filter(f => f.nodeId !== nodeId);
        this._save();
    }

    /**
     * Get all favorites
     * @returns {Array<Object>}
     */
    getFavorites() {
        return this.data.favorites;
    }

    /**
     * Check if a nodeId is favorited
     * @param {string} nodeId
     * @returns {boolean}
     */
    isFavorite(nodeId) {
        return this.data.favorites.some(f => f.nodeId === nodeId);
    }

    /**
     * Toggle favorite state, returns new state
     * @param {string} nodeId
     * @param {string} nodeName
     * @param {string} nodeType
     * @returns {boolean} true if now favorited, false if removed
     */
    toggleFavorite(nodeId, nodeName, nodeType) {
        if (this.isFavorite(nodeId)) {
            this.removeFavorite(nodeId);
            return false;
        }
        this.addFavorite(nodeId, nodeName, nodeType);
        return true;
    }

    // ── Settings ────────────────────────────────────────────────

    /**
     * Save user settings
     * @param {Object} settings - e.g. { lastTab, lastObjectType }
     */
    saveSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this._save();
    }

    /**
     * Get saved settings
     * @returns {Object}
     */
    getSettings() {
        return this.data.settings;
    }

    // ── Last Folder ─────────────────────────────────────────────

    /**
     * Save last opened folder metadata (display only, no handles)
     * @param {string} folderName
     * @param {string} semanticModelName
     * @param {string} reportName
     */
    saveLastFolder(folderName, semanticModelName, reportName) {
        this.data.lastFolder = { folderName, semanticModelName, reportName };
        this._save();
    }

    /**
     * Get last opened folder metadata
     * @returns {Object|null}
     */
    getLastFolder() {
        return this.data.lastFolder;
    }

    // ── Internal Helpers ────────────────────────────────────────

    /**
     * Load data from localStorage
     * @returns {Object}
     * @private
     */
    _load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return this._defaults();

            const parsed = JSON.parse(raw);

            // Version check — if schema changes, reset gracefully
            if (!parsed.version || parsed.version < 1) {
                return this._defaults();
            }

            return {
                version: parsed.version || 1,
                recentAnalyses: Array.isArray(parsed.recentAnalyses) ? parsed.recentAnalyses : [],
                favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
                settings: parsed.settings || {},
                lastFolder: parsed.lastFolder || null
            };
        } catch {
            return this._defaults();
        }
    }

    /**
     * Save data to localStorage
     * @private
     */
    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.warn('SessionManager: unable to persist to localStorage', e);
        }
    }

    /**
     * Return the default data structure
     * @returns {Object}
     * @private
     */
    _defaults() {
        return {
            version: 1,
            recentAnalyses: [],
            favorites: [],
            settings: {},
            lastFolder: null
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
}
