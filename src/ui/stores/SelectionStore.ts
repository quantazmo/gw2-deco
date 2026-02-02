// @ts-nocheck
/**
 * SelectionStore
 * Tracks user selections in the UI — supports multi-select via SelectionSet
 * Manages: activeLayerId, selectedDecorationIds (via SelectionSet)
 * Publishes: SELECTION_CHANGED events via EventBus
 */
import { SelectionSet } from '../../domain/SelectionSet.js';

class SelectionStore {
    constructor(eventBus) {
        this.eventBus = eventBus;

        this.state = {
            activeLayerId: null
        };

        this._selection = new SelectionSet();
        this.listeners = [];
    }

    /**
     * Get current selection state (backward-compatible + new fields)
     * @returns {Object} Selection state
     */
    getState() {
        return Object.freeze({
            activeLayerId: this.state.activeLayerId,
            selectedIds: this._selection.toArray(),
            selectionCount: this._selection.size,
            // backward compat: single selection returns first selected or null
            selectedDecorationId: this._selection.size === 1 ? this._selection.toArray()[0] : null
        });
    }

    /**
     * Set active layer
     * @param {string|null} layerId
     */
    setActiveLayer(layerId) {
        if (this.state.activeLayerId !== layerId) {
            this.state.activeLayerId = layerId;
            this._notifyListeners();
            this._publishEvent('LAYER_SELECTED', { layerId });
        }
    }

    /**
     * Get active layer ID
     * @returns {string|null}
     */
    getActiveLayerId() {
        return this.state.activeLayerId;
    }

    /**
     * Select a single decoration (clears previous selection)
     * @param {string} id - Decoration ID
     */
    selectDecoration(id) {
        if (typeof id !== 'string' || id.trim().length === 0) return;
        this._selection = new SelectionSet([id]);
        this._notifyListeners();
        this._publishEvent('SELECTION_CHANGED', { selectedIds: this._selection.toArray() });
    }

    /**
     * Toggle a decoration in/out of the selection (Ctrl+Click)
     * @param {string} id - Decoration ID
     */
    toggleDecoration(id) {
        if (typeof id !== 'string' || id.trim().length === 0) return;
        this._selection = this._selection.toggle(id);
        this._notifyListeners();
        this._publishEvent('SELECTION_CHANGED', { selectedIds: this._selection.toArray() });
    }

    /**
     * Select a range of decorations (Shift+Click)
     * @param {string} fromId - Anchor decoration ID
     * @param {string} toId - Target decoration ID
     * @param {string[]} orderedIds - All decoration IDs in display order
     */
    selectRange(fromId, toId, orderedIds) {
        if (!Array.isArray(orderedIds)) return;
        const fromIndex = orderedIds.indexOf(fromId);
        const toIndex = orderedIds.indexOf(toId);
        if (fromIndex === -1 || toIndex === -1) return;

        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        const rangeIds = orderedIds.slice(start, end + 1);

        this._selection = new SelectionSet(rangeIds);
        this._notifyListeners();
        this._publishEvent('SELECTION_CHANGED', { selectedIds: this._selection.toArray() });
    }

    /**
     * Select all provided decoration IDs
     * @param {string[]} ids - Decoration IDs to select
     */
    selectAll(ids) {
        if (!Array.isArray(ids)) return;
        this._selection = new SelectionSet(ids);
        this._notifyListeners();
        this._publishEvent('SELECTION_CHANGED', { selectedIds: this._selection.toArray() });
    }

    /**
     * Add decoration IDs to the current selection (additive, no duplicates)
     * @param {string[]} ids - Decoration IDs to add
     */
    addToSelection(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        this._selection = this._selection.addRange(ids);
        this._notifyListeners();
        this._publishEvent('SELECTION_CHANGED', { selectedIds: this._selection.toArray() });
    }

    /**
     * Remove decoration IDs from the current selection
     * @param {string[]} ids - Decoration IDs to remove
     */
    removeFromSelection(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        this._selection = this._selection.removeRange(ids);
        this._notifyListeners();
        this._publishEvent('SELECTION_CHANGED', { selectedIds: this._selection.toArray() });
    }

    /**
     * Clear all decoration selections
     */
    clearSelection() {
        if (this._selection.isEmpty()) return;
        this._selection = new SelectionSet();
        this._notifyListeners();
        this._publishEvent('SELECTION_CHANGED', { selectedIds: [] });
    }

    /**
     * Get array of selected decoration IDs
     * @returns {string[]}
     */
    getSelectedIds() {
        return this._selection.toArray();
    }

    /**
     * Check if a decoration is selected
     * @param {string} id
     * @returns {boolean}
     */
    isSelected(id) {
        return this._selection.contains(id);
    }

    /**
     * Get the number of selected decorations
     * @returns {number}
     */
    getSelectionCount() {
        return this._selection.size;
    }

    /**
     * Deselect all decorations belonging to a specific layer.
     * @param {string} layerId - Layer ID
     * @param {function} decorationBelongsToLayer - Predicate: (decorationId) => boolean
     */
    deselectByLayer(layerId, decorationBelongsToLayer) {
        if (typeof decorationBelongsToLayer !== 'function') return;
        const before = this._selection.size;
        this._selection = this._selection.removeByFilter(decorationBelongsToLayer);
        if (this._selection.size !== before) {
            this._notifyListeners();
            this._publishEvent('SELECTION_CHANGED', { selectedIds: this._selection.toArray() });
        }
    }

    /**
     * Get selected decoration ID (backward compatibility for single-select consumers)
     * @returns {string|null}
     */
    getSelectedDecorationId() {
        if (this._selection.size === 1) {
            return this._selection.toArray()[0];
        }
        return null;
    }

    /**
     * Subscribe to selection changes
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify listeners of state change
     * @private
     */
    _notifyListeners() {
        const state = this.getState();
        this.listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                console.error('[SelectionStore] Error notifying listener:', error);
            }
        });
    }

    /**
     * Subscribe to selection changes (alternative API)
     * @param {string} event - Event name (only 'change' supported)
     * @param {Function} callback - Called with state when selection changes
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (event === 'change' || !event) {
            this.listeners.push(callback);
            return () => {
                this.listeners = this.listeners.filter(l => l !== callback);
            };
        }
        return () => { };
    }

    /**
     * Publish event via event bus
     * @private
     */
    _publishEvent(eventType, data) {
        if (this.eventBus) {
            this.eventBus.publish(eventType, data);
        }
    }
}

export { SelectionStore };
