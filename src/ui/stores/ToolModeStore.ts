// @ts-nocheck
/**
 * ToolModeStore
 * Tracks the active tool mode (e.g. 'pan' or 'select').
 * Default mode is 'pan'.
 * Notifies listeners on mode change.
 */
export class ToolModeStore {
    constructor() {
        this._mode = 'pan';
        this._listeners = [];
    }

    /**
     * Get the current tool mode.
     * @returns {'pan'|'select'}
     */
    getMode() {
        return this._mode;
    }

    /**
     * Set the tool mode.
     * @param {'pan'|'select'} mode
     */
    setMode(mode) {
        if (mode !== 'pan' && mode !== 'select') {
            throw new Error(`Invalid tool mode: "${mode}". Must be 'pan' or 'select'.`);
        }
        if (this._mode !== mode) {
            this._mode = mode;
            this._notify();
        }
    }

    /**
     * Subscribe to mode changes.
     * @param {Function} listener - Called with the new mode string.
     * @returns {Function} Unsubscribe function.
     */
    subscribe(listener) {
        this._listeners.push(listener);
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    }

    /** @private */
    _notify() {
        for (const listener of this._listeners) {
            listener(this._mode);
        }
    }
}
