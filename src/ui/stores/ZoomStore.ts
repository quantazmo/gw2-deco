/**
 * ZoomStore
 * Manages zoom and pan state encapsulated in a single object
 * Replaces global variables (xZoom, yZoom, xZoomBase, yZoomBase)
 * Provides event emitter pattern for state changes
 */

export interface ZoomScale {
    (value: number): number;
    copy(): ZoomScale;
    domain(): number[];
    domain(values: number[]): ZoomScale;
    range(): number[];
}

export type ZoomTransformState = {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
};

type ZoomEventData = Record<string, unknown>;
type ZoomHistoryEntry = {
    transform: ZoomTransformState;
    xZoom: ZoomScale | null;
    yZoom: ZoomScale | null;
};

/**
 * Simple event emitter for zoom changes
 */
class ZoomEventEmitter {
    listeners: Record<string, Array<(data: ZoomEventData) => void>>;

    constructor() {
        this.listeners = {
            change: []
        };
    }

    /**
     * Register a listener for an event
     * @param {string} event - Event name ('change', 'pan', 'zoom')
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event: string, callback: (data: ZoomEventData) => void): () => void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    /**
     * Emit an event and notify all listeners
     * @param {string} event - Event name
    * @param {unknown} data - Data to pass to listeners
     */
    emit(event: string, data: ZoomEventData): void {
        const listenerCount = this.listeners[event] ? this.listeners[event].length : 0;
        console.log(`[ZoomEventEmitter] 📤 EMIT: "${event}" (${listenerCount} listener${listenerCount !== 1 ? 's' : ''})`, data);

        if (this.listeners[event]) {
            this.listeners[event].forEach((callback, index) => {
                try {
                    console.log(`[ZoomEventEmitter]   ↳ Calling listener ${index + 1}/${listenerCount}`);
                    callback(data);
                } catch (error) {
                    console.error(`[ZoomEventEmitter] ❌ Error in ${event} listener ${index + 1}/${listenerCount}:`, error);
                }
            });
        }
    }

    /**
     * Register a one-time listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(event: string, callback: (data: ZoomEventData) => void): () => void {
        const unsubscribe = this.on(event, (data) => {
            callback(data);
            unsubscribe();
        });
        return unsubscribe;
    }
}

/**
 * ZoomStore - Manages zoom and pan state
 */
export class ZoomStore {
    xZoom: ZoomScale | null = null;
    yZoom: ZoomScale | null = null;
    xZoomBase: ZoomScale | null = null;
    yZoomBase: ZoomScale | null = null;
    transform: ZoomTransformState = { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };
    minZoom: number = 0.1;
    maxZoom: number = 10;
    history: ZoomHistoryEntry[] = [];
    historyIndex: number = -1;
    emitter: ZoomEventEmitter = new ZoomEventEmitter();
    debugEnabled: boolean = true;

    /**
     * Create a new ZoomStore
     * Initializes with identity transforms
     */
    constructor() {
        // Current zoom/pan states for X and Y axes
        // Typically these are scale objects from scaleFactory
        this.xZoom = null;
        this.yZoom = null;

        // Base scales without zoom/pan applied
        // Used to restore original scales when needed
        this.xZoomBase = null;
        this.yZoomBase = null;

        // Transform state (combined zoom and pan)
        this.transform = {
            scaleX: 1,
            scaleY: 1,
            translateX: 0,
            translateY: 0
        };

        // Zoom limits
        this.minZoom = 0.1;
        this.maxZoom = 10;

        // Undo/Redo history
        this.history = [];
        this.historyIndex = -1;

        // Event emitter for state changes
        this.emitter = new ZoomEventEmitter();

        this.debugEnabled = true; // Enable debug logging
        console.log('[ZoomStore] 🚀 ZoomStore initialized');
    }

    /**
     * Initialize zoom stores with scale objects
     * Usually called after domain/range are set up
     * @param {Object} xZoomScale - The x zoom scale object
     * @param {Object} yZoomScale - The y zoom scale object
     * @param {Object} xBaseScale - The original x scale (for reset)
     * @param {Object} yBaseScale - The original y scale (for reset)
     */
    initialize(xZoomScale: ZoomScale, yZoomScale: ZoomScale, xBaseScale: ZoomScale, yBaseScale: ZoomScale): void {
        if (this.debugEnabled) {
            console.log('[ZoomStore] ⚡ INITIALIZE called');
        }

        if (!xZoomScale || !yZoomScale || !xBaseScale || !yBaseScale) {
            throw new Error('ZoomStore.initialize requires all four scale objects (xZoom, yZoom, xBase, yBase)');
        }

        this.xZoom = xZoomScale;
        this.yZoom = yZoomScale;
        this.xZoomBase = xBaseScale;
        this.yZoomBase = yBaseScale;

        // Initialize history with current state
        this.history = [{
            transform: { ...this.transform },
            xZoom: this.xZoom.copy(),
            yZoom: this.yZoom.copy()
        }];
        this.historyIndex = 0;

        if (this.debugEnabled) {
            console.log('[ZoomStore] ✅ Initialized with scales, emitting change event');
        }

        this.emitter.emit('change', {
            type: 'initialize',
            xZoom: this.xZoom,
            yZoom: this.yZoom,
            transform: { ...this.transform }
        });
    }

    /**
     * Update zoom scales (typically called during zoom/pan)
     * @param {Object} newXZoom - Updated x scale
     * @param {Object} newYZoom - Updated y scale
     */
    setZoom(newXZoom: ZoomScale, newYZoom: ZoomScale): void {
        if (this.debugEnabled) {
            console.log('[ZoomStore] ⚡ SETZOOM called');
        }

        if (!newXZoom || !newYZoom) {
            throw new Error('setZoom requires both x and y zoom scales');
        }

        this.xZoom = newXZoom;
        this.yZoom = newYZoom;

        if (this.debugEnabled) {
            console.log('[ZoomStore] ✅ Zoom updated, emitting change event');
        }

        this.emitter.emit('change', {
            type: 'zoom',
            xZoom: this.xZoom,
            yZoom: this.yZoom
        });
    }

    /**
     * Get the current X zoom scale
     * @returns {Object|null} The x zoom scale
     */
    getXZoom(): ZoomScale | null {
        return this.xZoom;
    }

    /**
     * Get the current Y zoom scale
     * @returns {Object|null} The y zoom scale
     */
    getYZoom(): ZoomScale | null {
        return this.yZoom;
    }

    /**
     * Get the base X scale (unzoomed/unpanned)
     * @returns {Object|null} The base x scale
     */
    getXZoomBase(): ZoomScale | null {
        return this.xZoomBase;
    }

    /**
     * Get the base Y scale (unzoomed/unpanned)
     * @returns {Object|null} The base y scale
     */
    getYZoomBase(): ZoomScale | null {
        return this.yZoomBase;
    }

    /**
     * Get all zoom state as an object
     * @returns {Object} Object with xZoom, yZoom, xZoomBase, yZoomBase
     */
    getState(): { xZoom: ZoomScale | null; yZoom: ZoomScale | null; xZoomBase: ZoomScale | null; yZoomBase: ZoomScale | null } {
        return {
            xZoom: this.xZoom,
            yZoom: this.yZoom,
            xZoomBase: this.xZoomBase,
            yZoomBase: this.yZoomBase
        };
    }

    /**
     * Apply zoom transformation
     * @param {number} factor - Zoom factor (1 = no change, >1 = zoom in, <1 = zoom out)
     * @param {number} centerX - X coordinate of zoom center
     * @param {number} centerY - Y coordinate of zoom center
     */
    zoom(factor: number, centerX: number = 0, centerY: number = 0): void {
        // Constrain zoom factor to limits
        const constrainedFactor = Math.max(this.minZoom, Math.min(this.maxZoom, this.transform.scaleX * factor));
        const actualFactor = constrainedFactor / this.transform.scaleX;

        if (actualFactor === 1) {
            return; // No zoom change
        }

        // Calculate new transform
        const oldScale = this.transform.scaleX;
        this.transform.scaleX = constrainedFactor;
        this.transform.scaleY = constrainedFactor;

        // Adjust translation to maintain zoom center
        this.transform.translateX = centerX - (centerX - this.transform.translateX) * actualFactor;
        this.transform.translateY = centerY - (centerY - this.transform.translateY) * actualFactor;

        // Save post-change state to history
        this.pushHistory();

        // Emit zoom event
        this.emitter.emit('change', {
            type: 'zoom',
            factor: actualFactor,
            transform: { ...this.transform },
            xZoom: this.xZoom,
            yZoom: this.yZoom
        });
    }

    /**
     * Apply pan (translation) transformation
     * @param {number} deltaX - Amount to pan in X direction
     * @param {number} deltaY - Amount to pan in Y direction
     */
    pan(deltaX: number, deltaY: number): void {
        if (deltaX === 0 && deltaY === 0) {
            return; // No pan change
        }

        this.transform.translateX += deltaX;
        this.transform.translateY += deltaY;

        // Save post-change state to history
        this.pushHistory();

        // Emit pan event
        this.emitter.emit('change', {
            type: 'pan',
            delta: { x: deltaX, y: deltaY },
            transform: { ...this.transform },
            xZoom: this.xZoom,
            yZoom: this.yZoom
        });
    }

    /**
     * Save current state to history for undo
     * @private
     */
    pushHistory(): void {
        // Remove any redo history if we're making a new change
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add current state to history
        this.history.push({
            transform: { ...this.transform },
            xZoom: this.xZoom?.copy ? this.xZoom.copy() : this.xZoom,
            yZoom: this.yZoom?.copy ? this.yZoom.copy() : this.yZoom
        });

        this.historyIndex = this.history.length - 1;
    }

    /**
     * Undo the last zoom/pan operation
     * @returns {boolean} True if undo was performed, false if at history start
     */
    undo(): boolean {
        if (this.historyIndex <= 0) {
            return false;
        }

        this.historyIndex--;
        const state = this.history[this.historyIndex];

        this.transform = { ...state.transform };
        this.xZoom = state.xZoom?.copy ? state.xZoom.copy() : state.xZoom;
        this.yZoom = state.yZoom?.copy ? state.yZoom.copy() : state.yZoom;

        this.emitter.emit('change', {
            type: 'undo',
            transform: { ...this.transform },
            xZoom: this.xZoom,
            yZoom: this.yZoom
        });

        return true;
    }

    /**
     * Redo the last undone operation
     * @returns {boolean} True if redo was performed, false if at history end
     */
    redo(): boolean {
        if (this.historyIndex >= this.history.length - 1) {
            return false;
        }

        this.historyIndex++;
        const state = this.history[this.historyIndex];

        this.transform = { ...state.transform };
        this.xZoom = state.xZoom?.copy ? state.xZoom.copy() : state.xZoom;
        this.yZoom = state.yZoom?.copy ? state.yZoom.copy() : state.yZoom;

        this.emitter.emit('change', {
            type: 'redo',
            transform: { ...this.transform },
            xZoom: this.xZoom,
            yZoom: this.yZoom
        });

        return true;
    }

    /**
     * Get current transform state
     * @returns {Object} Transform object with scaleX, scaleY, translateX, translateY
     */
    getTransform(): ZoomTransformState {
        return { ...this.transform };
    }

    /**
     * Set zoom limits
     * @param {number} min - Minimum zoom factor
     * @param {number} max - Maximum zoom factor
     */
    setZoomLimits(min: number, max: number): void {
        if (min >= max || min <= 0 || max <= 0) {
            throw new Error('Invalid zoom limits: min must be > 0 and < max');
        }
        this.minZoom = min;
        this.maxZoom = max;
    }

    /**
     * Get zoom limits
     * @returns {Object} Object with min and max zoom factors
     */
    getZoomLimits(): { min: number; max: number } {
        return {
            min: this.minZoom,
            max: this.maxZoom
        };
    }

    /**
     * Check if undo is available
     * @returns {boolean}
     */
    canUndo(): boolean {
        return this.historyIndex > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean}
     */
    canRedo(): boolean {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Clear history (useful when loading new layout)
     */
    clearHistory(): void {
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Reset zoom/pan to original scales
     * Restores the base scales
     */
    reset(): void {
        if (!this.xZoomBase || !this.yZoomBase) {
            throw new Error('Cannot reset: base scales not initialized');
        }

        // Copy the base scales
        this.xZoom = this.xZoomBase.copy();
        this.yZoom = this.yZoomBase.copy();

        // Reset transform
        this.transform = {
            scaleX: 1,
            scaleY: 1,
            translateX: 0,
            translateY: 0
        };

        // Reset history
        this.history = [{
            transform: { ...this.transform },
            xZoom: this.xZoom.copy(),
            yZoom: this.yZoom.copy()
        }];
        this.historyIndex = 0;

        this.emitter.emit('change', {
            type: 'reset',
            xZoom: this.xZoom,
            yZoom: this.yZoom,
            transform: { ...this.transform }
        });
    }

    /**
     * Check if zoom/pan is initialized
     * @returns {boolean}
     */
    isInitialized(): boolean {
        return this.xZoom !== null && this.yZoom !== null;
    }

    /**
     * Register a listener for zoom/pan changes
     * @param {Function} callback - Function called when state changes
     * @returns {Function} Unsubscribe function
     */
    onChange(callback: (data: ZoomEventData) => void): () => void {
        return this.emitter.on('change', callback);
    }

    /**
     * Register a one-time listener
     * @param {Function} callback - Function called once when state changes
     * @returns {Function} Unsubscribe function
     */
    onceChange(callback: (data: ZoomEventData) => void): () => void {
        return this.emitter.once('change', callback);
    }

    /**
     * Get event emitter for advanced usage
     * @returns {ZoomEventEmitter}
     */
    getEmitter(): ZoomEventEmitter {
        return this.emitter;
    }
}

/**
 * Create a singleton instance for application-wide use
 */
export const zoomStore = new ZoomStore();
