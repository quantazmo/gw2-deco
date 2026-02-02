// @ts-nocheck
/**
 * LayoutStore
 * Flux-pattern store for layout state.
 * Holds a LayoutConfiguration instance, notifies subscribers on change,
 * and publishes 'layout:changed' events via EventBus.
 */

import { DockLayoutConfiguration } from '../../domain/DockLayoutConfiguration.js';

export class DockPanelLayoutStore {
    /**
     * @param {object} [eventBus]  EventBus instance for publishing domain events.
     *                             Optional — if omitted, only local listeners are notified.
     * @param {object} [repository]  LayoutRepository instance for auto-persist.
     *                               Optional — if omitted, layout is not persisted automatically.
     */
    constructor(eventBus = null, repository = null) {
        this._state = DockLayoutConfiguration.createDefault();
        this._listeners = [];
        this._eventBus = eventBus;
        this._repository = repository;
    }

    /**
     * Get the current LayoutConfiguration.
     * @returns {DockLayoutConfiguration}
     */
    getState(): DockLayoutConfiguration {
        return this._state;
    }

    /**
     * Replace the layout state and notify all subscribers.
     * @param {DockLayoutConfiguration} newLayout
     */
    setState(newLayout: DockLayoutConfiguration): void {
        this._state = newLayout;
        this._notify(newLayout);
        if (this._repository) {
            this._repository.save(newLayout);
        }
        if (this._eventBus) {
            this._eventBus.publish('layout:changed', newLayout);
        }
    }

    /**
     * Subscribe to layout state changes.
     * @param {Function} listener  Called with the new LayoutConfiguration on each change.
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener: (state: DockLayoutConfiguration) => void): () => void {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }
        this._listeners.push(listener);
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    }

    _notify(state: DockLayoutConfiguration): void {
        this._listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                console.error('[LayoutStore] Error in listener:', error);
            }
        });
    }
}
