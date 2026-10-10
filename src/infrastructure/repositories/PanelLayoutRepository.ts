/**
 * PanelLayoutRepository
 * Persists and restores LayoutConfiguration to/from localStorage.
 *
 * Storage format:
 *   { "version": 1, "tree": <LayoutNode> }
 *
 * Falls back to the default layout on any of:
 *   - Missing key
 *   - Corrupt JSON
 *   - Invalid tree (fails LayoutConfiguration.validate())
 *   - Unsupported schema version (anything other than 1)
 */

import { DockLayoutConfiguration } from '../../domain/DockLayoutConfiguration.js';
import type { DockLayoutNode } from '../../domain/DockLayoutConfiguration.js';
import { LAYOUT } from '../../config/constants.js';

const SUPPORTED_VERSION = 1;

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export class PanelLayoutRepository {
    private readonly _storage: StorageLike;
    private readonly _key: string;

    /**
     * @param {Storage|object} [storage]  localStorage-compatible storage.
     *   Defaults to globalThis.localStorage when omitted.
     */
    constructor(storage: StorageLike | null = null) {
        this._storage = storage || (typeof localStorage !== 'undefined' ? localStorage : globalThis.localStorage);
        this._key = LAYOUT.LAYOUT_STORAGE_KEY;
    }

    /**
     * Serialize a LayoutConfiguration and write it to localStorage.
     * @param {DockLayoutConfiguration} layout
     */
    save(layout: DockLayoutConfiguration): void {
        try {
            const doc = {
                version: layout.version ?? SUPPORTED_VERSION,
                tree: layout.tree,
            };
            this._storage.setItem(this._key, JSON.stringify(doc));
        } catch (err) {
            // Storage quota exceeded or unavailable — degrade gracefully
            console.warn('[LayoutRepository] Failed to save layout:', err instanceof Error ? err.message : String(err));
        }
    }

    /**
     * Read and deserialize a LayoutConfiguration from localStorage.
     * Returns the default layout if the data is missing, corrupt, or invalid.
     * @returns {DockLayoutConfiguration}
     */
    load(): DockLayoutConfiguration {
        try {
            const raw = this._storage.getItem(this._key);
            if (!raw) return DockLayoutConfiguration.createDefault();

            const doc: { version?: unknown; tree?: unknown } = JSON.parse(raw);

            if (!doc || typeof doc !== 'object') return DockLayoutConfiguration.createDefault();
            if (doc.version !== SUPPORTED_VERSION) return DockLayoutConfiguration.createDefault();
            if (!doc.tree) return DockLayoutConfiguration.createDefault();

            const candidate = new DockLayoutConfiguration(doc.tree as DockLayoutNode, doc.version);
            const { valid } = candidate.validate();
            if (!valid) return DockLayoutConfiguration.createDefault();

            return candidate;
        } catch (err) {
            // JSON.parse failure or unexpected error
            console.warn('[LayoutRepository] Failed to load layout, using default:', err instanceof Error ? err.message : String(err));
            return DockLayoutConfiguration.createDefault();
        }
    }

    /**
     * Remove the persisted layout from localStorage.
     */
    clear(): void {
        try {
            this._storage.removeItem(this._key);
        } catch (err) {
            console.warn('[LayoutRepository] Failed to clear layout:', err instanceof Error ? err.message : String(err));
        }
    }
}
