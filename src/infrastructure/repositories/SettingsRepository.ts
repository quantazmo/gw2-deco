// @ts-nocheck
/**
 * SettingsRepository
 * Persists and restores application settings to/from localStorage.
 *
 * Storage format:
 *   { "version": 1, "apiKey": "", "theme": "system" }
 *
 * Falls back to default settings on any of:
 *   - Missing key
 *   - Corrupt JSON
 *   - Unsupported schema version (anything other than 1)
 */

import { SETTINGS } from '../../config/constants.js';

const SUPPORTED_VERSION = 1;

const DEFAULT_SETTINGS = Object.freeze({
    apiKey: '',
    theme: 'system',
});

export class SettingsRepository {
    /**
     * @param {Storage|object} [storage]  localStorage-compatible storage.
     *   Defaults to globalThis.localStorage when omitted.
     */
    constructor(storage = null) {
        this._storage = storage || (typeof localStorage !== 'undefined' ? localStorage : globalThis.localStorage);
        this._key = SETTINGS.SETTINGS_STORAGE_KEY;
    }

    /**
     * Serialize settings and write them to localStorage.
     * @param {{ apiKey: string, theme: string }} settings
     */
    save(settings) {
        try {
            const doc = {
                version: SUPPORTED_VERSION,
                apiKey: settings.apiKey ?? '',
                theme: settings.theme ?? 'system',
            };
            this._storage.setItem(this._key, JSON.stringify(doc));
        } catch (err) {
            console.warn('[SettingsRepository] Failed to save settings:', err.message);
        }
    }

    /**
     * Read and deserialize settings from localStorage.
     * Returns default settings if the data is missing, corrupt, or invalid.
     * @returns {{ apiKey: string, theme: string }}
     */
    load() {
        try {
            const raw = this._storage.getItem(this._key);
            if (!raw) return { ...DEFAULT_SETTINGS };

            const doc = JSON.parse(raw);

            if (!doc || typeof doc !== 'object') return { ...DEFAULT_SETTINGS };
            if (doc.version !== SUPPORTED_VERSION) return { ...DEFAULT_SETTINGS };

            const validThemes = ['light', 'dark', 'system'];
            return {
                apiKey: typeof doc.apiKey === 'string' ? doc.apiKey : '',
                theme: validThemes.includes(doc.theme) ? doc.theme : 'system',
            };
        } catch (err) {
            console.warn('[SettingsRepository] Failed to load settings, using defaults:', err.message);
            return { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Remove the persisted settings from localStorage.
     */
    clear() {
        try {
            this._storage.removeItem(this._key);
        } catch (err) {
            console.warn('[SettingsRepository] Failed to clear settings:', err.message);
        }
    }
}
