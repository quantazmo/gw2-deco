// @ts-nocheck
/**
 * AppStore
 * Central state management for the application
 * Manages: layout, layers, activeLayer, map
 * Provides: getState(), subscribe(), dispatch()
 */

class AppStore {
    constructor() {
        this.state = {
            layout: null,           // HomesteadLayout instance
            layers: [],              // Layer[] instances
            activeLayerId: null,     // Currently selected layer ID
            map: null,               // GW2Map instance
            isDirty: false           // Has unsaved changes
        };

        this.listeners = [];
        this.debugEnabled = true; // Enable debug logging
        console.log('[AppStore] 🚀 AppStore initialized');
    }

    /**
     * Get current state (read-only to encourage dispatch usage)
     * @returns {Object} Current state
     */
    getState() {
        return Object.freeze({ ...this.state });
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function (called with new state)
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        this.listeners.push(listener);

        if (this.debugEnabled) {
            console.log(`[AppStore] 📥 SUBSCRIBE: ${this.listeners.length} listener${this.listeners.length > 1 ? 's' : ''} registered`);
            if (this.listeners.length > 3) {
                console.log(`[AppStore] ⚠️  WARNING: Many listeners (${this.listeners.length}) - possible duplicate subscriptions`);
            }
        }

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
            if (this.debugEnabled) {
                console.log(`[AppStore] 📤 UNSUBSCRIBE: ${this.listeners.length} listener${this.listeners.length !== 1 ? 's' : ''} remaining`);
            }
        };
    }

    /**
     * Dispatch an action to update state
     * @param {string} action - Action type
     * @param {any} payload - Action payload
     */
    dispatch(action, payload) {
        if (this.debugEnabled) {
            console.log(`[AppStore] ⚡ DISPATCH: "${action}"`, payload);
        }

        const previousState = { ...this.state };

        switch (action) {
            case 'LOAD_LAYOUT':
                this.state.layout = payload;
                // Convert layers Map to array
                this.state.layers = Array.from(payload.layers.values());
                this.state.map = payload.map || null;
                this.state.activeLayerId = this.state.layers.length > 0 ? this.state.layers[0].id : null;
                this.state.isDirty = false;
                break;

            case 'CREATE_LAYER':
                if (this.state.layout) {
                    const newLayer = payload;
                    this.state.layers.push(newLayer);
                    this.state.activeLayerId = newLayer.id;
                    this.state.isDirty = true;
                }
                break;

            case 'LOAD_ADDITIONAL_LAYOUT':
                if (this.state.layout) {
                    const addedLayer = payload;
                    this.state.layers.push(addedLayer);
                    this.state.activeLayerId = addedLayer.id;
                    this.state.isDirty = true;
                }
                break;

            case 'MAP_SWITCHED':
                // Full state reset + new layout load after map switch
                if (payload && payload.layout) {
                    this.state.layout = payload.layout;
                    this.state.layers = Array.from(payload.layout.layers.values());
                    this.state.map = payload.layout.map || null;
                    this.state.activeLayerId = this.state.layers.length > 0 ? this.state.layers[0].id : null;
                    this.state.isDirty = false;
                }
                break;

            case 'DELETE_LAYER':
                const layerId = payload;
                this.state.layers = this.state.layers.filter(l => l.id !== layerId);
                if (this.state.activeLayerId === layerId) {
                    this.state.activeLayerId = this.state.layers.length > 0 ? this.state.layers[0].id : null;
                }
                this.state.isDirty = true;
                break;

            case 'RENAME_LAYER':
                const { layerId: rLayerId, newName } = payload;
                const layer = this.state.layers.find(l => l.id === rLayerId);
                if (layer) {
                    layer.name = newName;
                    this.state.isDirty = true;
                }
                break;

            case 'UPDATE_LAYER_VISIBILITY':
                const { layerId: vLayerId, isVisible } = payload;
                const visibilityLayer = this.state.layers.find(l => l.id === vLayerId);
                if (visibilityLayer) {
                    visibilityLayer.isVisible = isVisible;
                    this.state.isDirty = true;
                }
                break;

            case 'SET_ACTIVE_LAYER':
                this.state.activeLayerId = payload;
                break;

            case 'ADD_DECORATION':
                const { layerId: dLayerId, decoration } = payload;
                const targetLayer = this.state.layers.find(l => l.id === dLayerId);
                if (targetLayer) {
                    targetLayer.addDecoration(decoration);
                    this.state.isDirty = true;
                }
                break;

            case 'DELETE_DECORATION':
                const { layerId: ddLayerId, decorationId } = payload;
                const deleteLayer = this.state.layers.find(l => l.id === ddLayerId);
                if (deleteLayer) {
                    deleteLayer.removeDecoration(decorationId);
                    this.state.isDirty = true;
                }
                break;

            case 'UPDATE_DECORATION':
                const { layerId: udLayerId, decoration: updatedDecoration } = payload;
                const updateLayer = this.state.layers.find(l => l.id === udLayerId);
                if (updateLayer) {
                    const existingDecoration = updateLayer.getDecoration(updatedDecoration.uid ?? updatedDecoration.id);
                    if (existingDecoration) {
                        existingDecoration.x = updatedDecoration.x;
                        existingDecoration.y = updatedDecoration.y;
                        this.state.isDirty = true;
                    }
                }
                break;

            case 'TOGGLE_LAYER_VISIBILITY':
                const { layerId: tLayerId, isVisible: toggledVisible } = payload;
                const toggleLayer = this.state.layers.find(l => l.id === tLayerId);
                if (toggleLayer) {
                    toggleLayer.isVisible = toggledVisible;
                    this.state.isDirty = true;
                }
                break;

            case 'SET_LAYER_COLOR':
                const { layerId: colorLayerId, color: newColor } = payload;
                const colorLayer = this.state.layers.find(l => l.id === colorLayerId);
                if (colorLayer) {
                    colorLayer.color = newColor;
                    this.state.isDirty = true;
                }
                break;

            case 'MOVE_DECORATIONS':
                // Refresh layers from layout after decorations are moved
                // The domain model has already been updated; sync the store state
                if (this.state.layout) {
                    this.state.layers = Array.from(this.state.layout.layers.values());
                }
                this.state.isDirty = true;
                break;

            case 'DELETE_DECORATIONS':
                // Refresh layers from layout after decorations are deleted or restored
                // The domain model has already been updated; sync the store state
                if (this.state.layout) {
                    this.state.layers = Array.from(this.state.layout.layers.values());
                }
                this.state.isDirty = true;
                break;

            case 'SET_DIRTY':
                this.state.isDirty = payload;
                break;

            case 'RESET':
                this.state = {
                    layout: null,
                    layers: [],
                    activeLayerId: null,
                    map: null,
                    isDirty: false
                };
                break;

            default:
                console.warn(`[AppStore] ❌ Unknown action: ${action}`);
                return;
        }

        if (this.debugEnabled) {
            console.log(`[AppStore] ✅ State updated after "${action}":`, {
                layers: this.state.layers.length,
                activeLayerId: this.state.activeLayerId,
                hasLayout: !!this.state.layout,
                hasMap: !!this.state.map,
                isDirty: this.state.isDirty
            });
        }

        // Notify listeners
        this._notifyListeners();
    }

    /**
     * Get active layer
     * @returns {Layer|null}
     */
    getActiveLayer() {
        if (!this.state.activeLayerId) return null;
        return this.state.layers.find(l => l.id === this.state.activeLayerId) || null;
    }

    /**
     * Get layer by ID
     * @param {string} layerId
     * @returns {Layer|null}
     */
    getLayer(layerId) {
        return this.state.layers.find(l => l.id === layerId) || null;
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    _notifyListeners() {
        const state = this.getState();
        if (this.debugEnabled) {
            console.log(`[AppStore] 🔔 Notifying ${this.listeners.length} listener${this.listeners.length !== 1 ? 's' : ''}`);
        }
        this.listeners.forEach((listener, index) => {
            try {
                if (this.debugEnabled) {
                    console.log(`[AppStore]   ↳ Calling listener ${index + 1}/${this.listeners.length}`);
                }
                listener(state);
            } catch (error) {
                console.error(`[AppStore] ❌ Error notifying listener ${index + 1}/${this.listeners.length}:`, error);
            }
        });
    }
}

// Export as singleton
const appStore = new AppStore();

export { AppStore, appStore };
