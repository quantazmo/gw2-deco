/**
 * Handler for ExportLayersCommand
 * Orchestrates the export: fetches map metadata and layers from AppStore,
 * delegates serialisation to XmlExportAdapter, and triggers the browser download.
 */
import { XmlExportAdapter } from '../../infrastructure/XmlExportAdapter.js';
import { AppStore } from '../../ui/stores/AppStore.ts';

type ExportStore = Pick<AppStore, 'getState'>;
type DownloadFunction = (xmlString: string, filename: string) => void | Promise<void>;
type SaveFilePickerWindow = Window & {
    showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<{
        createWritable(): Promise<{
            write(data: string): Promise<void>;
            close(): Promise<void>;
        }>;
    }>;
};

export class ExportLayersHandler {
    appStore: ExportStore;
    _downloadFn: DownloadFunction | null;

    /**
     * @param {Object} appStore - AppStore with getState() method
     * @param {Function} [_downloadFn] - Optional override for the download trigger (used in tests)
     */
    constructor(appStore: ExportStore, _downloadFn: DownloadFunction | null = null) {
        this.appStore = appStore;
        this._downloadFn = _downloadFn;
    }

    /**
     * Execute the export command.
     * @param {{ selectedLayerIds: string[] }} payload
     * @returns {Promise<{ success: true, filename: string, decorationCount: number }>}
     */
    async execute(payload: { selectedLayerIds: string[] }): Promise<{ success: true; filename: string; decorationCount: number }> {
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
    async _triggerDownload(xmlString: string, filename: string): Promise<void> {
        if (this._downloadFn) {
            this._downloadFn(xmlString, filename);
            return;
        }

        // Use native Save As dialog when available (Chrome 86+, Edge 86+)
        const showSaveFilePicker = typeof window !== 'undefined'
            ? (window as SaveFilePickerWindow).showSaveFilePicker
            : undefined;
        if (typeof showSaveFilePicker === 'function') {
            try {
                const handle = await showSaveFilePicker.call(window, {
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
                if (err instanceof Error && err.name === 'AbortError') return;
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
