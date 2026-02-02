// @ts-nocheck
/**
 * Handler for ExportLayersCommand
 * Orchestrates the export: fetches map metadata and layers from AppStore,
 * delegates serialisation to XmlExportAdapter, and triggers the browser download.
 */
import { XmlExportAdapter } from '../../infrastructure/XmlExportAdapter.js';

export class ExportLayersHandler {
    appStore: any; // JS domain object � fully typed once domain migrates to TypeScript
    _downloadFn: any; // JS domain object � fully typed once domain migrates to TypeScript

    /**
     * @param {Object} appStore - AppStore with getState() method
     * @param {Function} [_downloadFn] - Optional override for the download trigger (used in tests)
     */
    constructor(appStore: unknown, _downloadFn: unknown = null) {
        this.appStore = appStore;
        this._downloadFn = _downloadFn;
    }

    /**
     * Execute the export command.
     * @param {{ selectedLayerIds: string[] }} payload
     * @returns {Promise<{ success: true, filename: string, decorationCount: number }>}
     */
    async execute(payload) {
        const { selectedLayerIds } = payload;

        if (!selectedLayerIds || selectedLayerIds.length === 0) {
            throw new Error('ExportLayersHandler: selectedLayerIds must not be empty');
        }

        const state = this.appStore.getState();

        if (!state.layout) {
            throw new Error('ExportLayersHandler: no layout is loaded');
        }

        const map = state.map;
        if (!map) {
            throw new Error('ExportLayersHandler: no map is loaded');
        }

        // Filter layers to only those whose id is in selectedLayerIds,
        // preserving the panel order from the store.
        const allLayers = state.layers || [];
        const idSet = new Set(selectedLayerIds);
        const filteredLayers = allLayers.filter(l => idSet.has(l.id));

        const xmlString = XmlExportAdapter.serialize(map, filteredLayers);

        const filename = `${map.name}.xml`;
        await this._triggerDownload(xmlString, filename);

        const decorationCount = filteredLayers.reduce((sum, l) => {
            const decs = l.getAllDecorations ? l.getAllDecorations() : [];
            return sum + decs.length;
        }, 0);

        return { success: true, filename, decorationCount };
    }

    /**
     * Trigger a Save As dialog (File System Access API) with fallback to
     * auto-download for browsers that do not support showSaveFilePicker.
     * @private
     */
    async _triggerDownload(xmlString, filename) {
        if (this._downloadFn) {
            this._downloadFn(xmlString, filename);
            return;
        }

        // Use native Save As dialog when available (Chrome 86+, Edge 86+)
        if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'GW2 Homestead XML',
                        accept: { 'application/xml': ['.xml'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(xmlString);
                await writable.close();
                return;
            } catch (err) {
                // User dismissed the dialog (AbortError) — treat as cancellation
                if (err.name === 'AbortError') return;
                // Any other error: fall through to the anchor-click fallback
                console.warn('[ExportLayersHandler] showSaveFilePicker failed, falling back:', err);
            }
        }

        // Fallback: Blob + anchor click (auto-downloads to the browser's default folder)
        const blob = new Blob([xmlString], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

export default ExportLayersHandler;
