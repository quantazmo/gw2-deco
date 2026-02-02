// @ts-nocheck
/**
 * Tests for src/application/handlers/ExportLayersHandler.js
 * Covers: filtering, ordering, filename derivation, error cases.
 */
import { ExportLayersHandler } from '../../src/application/handlers/ExportLayersHandler.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

function makeDecoration(id, name) {
    const pos = new WorldCoordinate(0, 0, 0, 0);
    return new Decoration(String(id), name, pos);
}

function makeLayer(id, name, decorations = []) {
    const layer = new Layer(id, name);
    for (const d of decorations) {
        layer.addDecoration(d);
    }
    return layer;
}

function makeMap(id = 1558, name = "Hearth's Glow") {
    return { id, name };
}

function makeLayout() {
    return {};
}

function makeStore({ layout = makeLayout(), map = makeMap(), layers = [] } = {}) {
    return {
        getState: () => ({ layout, map, layers })
    };
}

describe('ExportLayersHandler', () => {
    describe('validation', () => {
        test('throws when selectedLayerIds is empty', async () => {
            const store = makeStore();
            const handler = new ExportLayersHandler(store, () => { });
            await expect(handler.execute({ selectedLayerIds: [] }))
                .rejects.toThrow('selectedLayerIds must not be empty');
        });

        test('throws when selectedLayerIds is null', async () => {
            const store = makeStore();
            const handler = new ExportLayersHandler(store, () => { });
            await expect(handler.execute({ selectedLayerIds: null }))
                .rejects.toThrow('selectedLayerIds must not be empty');
        });

        test('throws when no layout is loaded (layout is null)', async () => {
            const store = makeStore({ layout: null });
            const handler = new ExportLayersHandler(store, () => { });
            await expect(handler.execute({ selectedLayerIds: ['l1'] }))
                .rejects.toThrow('no layout is loaded');
        });

        test('throws when no map is loaded (map is null)', async () => {
            const store = makeStore({ map: null });
            const handler = new ExportLayersHandler(store, () => { });
            await expect(handler.execute({ selectedLayerIds: ['l1'] }))
                .rejects.toThrow('no map is loaded');
        });
    });

    describe('layer filtering', () => {
        test('only includes layers whose ids are in selectedLayerIds', async () => {
            const dec1 = makeDecoration('d1', 'Alpha');
            const dec2 = makeDecoration('d2', 'Beta');
            const layer1 = makeLayer('l1', 'Layer 1', [dec1]);
            const layer2 = makeLayer('l2', 'Layer 2', [dec2]);
            const capturedArgs = [];
            const downloadFn = (xml) => capturedArgs.push(xml);
            const store = makeStore({ layers: [layer1, layer2] });
            const handler = new ExportLayersHandler(store, downloadFn);

            await handler.execute({ selectedLayerIds: ['l1'] });

            expect(capturedArgs.length).toBe(1);
            expect(capturedArgs[0]).toContain('name="Alpha"');
            expect(capturedArgs[0]).not.toContain('name="Beta"');
        });

        test('includes all layers when all ids are selected', async () => {
            const dec1 = makeDecoration('d1', 'Alpha');
            const dec2 = makeDecoration('d2', 'Beta');
            const layer1 = makeLayer('l1', 'Layer 1', [dec1]);
            const layer2 = makeLayer('l2', 'Layer 2', [dec2]);
            const capturedArgs = [];
            const store = makeStore({ layers: [layer1, layer2] });
            const handler = new ExportLayersHandler(store, (xml) => capturedArgs.push(xml));

            await handler.execute({ selectedLayerIds: ['l1', 'l2'] });

            expect(capturedArgs[0]).toContain('name="Alpha"');
            expect(capturedArgs[0]).toContain('name="Beta"');
        });
    });

    describe('layer ordering', () => {
        test('preserves store layer order regardless of selectedLayerIds order', async () => {
            const dec1 = makeDecoration('d1', 'First');
            const dec2 = makeDecoration('d2', 'Second');
            const layer1 = makeLayer('l1', 'Layer 1', [dec1]);
            const layer2 = makeLayer('l2', 'Layer 2', [dec2]);
            const capturedArgs = [];
            const store = makeStore({ layers: [layer1, layer2] });
            const handler = new ExportLayersHandler(store, (xml) => capturedArgs.push(xml));

            // Pass ids in reverse order — output should still follow store order
            await handler.execute({ selectedLayerIds: ['l2', 'l1'] });

            const xml = capturedArgs[0];
            expect(xml.indexOf('name="First"')).toBeLessThan(xml.indexOf('name="Second"'));
        });
    });

    describe('filename', () => {
        test('filename is derived from map.name with .xml extension', async () => {
            const store = makeStore({ map: makeMap(1, 'My Homestead') });
            let capturedFilename;
            const handler = new ExportLayersHandler(store, (_, filename) => {
                capturedFilename = filename;
            });

            const layer = makeLayer('l1', 'L', [makeDecoration('d1', 'Test')]);
            store.getState = () => ({ layout: {}, map: makeMap(1, 'My Homestead'), layers: [layer] });

            await handler.execute({ selectedLayerIds: ['l1'] });

            expect(capturedFilename).toBe('My Homestead.xml');
        });
    });

    describe('return value', () => {
        test('returns success:true with filename and decorationCount', async () => {
            const dec1 = makeDecoration('d1', 'A');
            const dec2 = makeDecoration('d2', 'B');
            const layer = makeLayer('l1', 'Layer 1', [dec1, dec2]);
            const store = makeStore({ layers: [layer] });
            const handler = new ExportLayersHandler(store, () => { });

            const result = await handler.execute({ selectedLayerIds: ['l1'] });

            expect(result.success).toBe(true);
            expect(result.decorationCount).toBe(2);
            expect(result.filename).toBe("Hearth's Glow.xml");
        });

        // Line 43: state.layers falsy → fallback to []
        test('handles missing state.layers gracefully (uses empty array)', async () => {
            const store = { getState: () => ({ layout: {}, map: makeMap(), layers: undefined }) };
            const handler = new ExportLayersHandler(store, () => { });
            const result = await handler.execute({ selectedLayerIds: ['l1'] });
            expect(result.decorationCount).toBe(0);
        });

        // Line 53: layer without getAllDecorations → ternary false branch → count 0
        test('counts zero decorations for layers without getAllDecorations', async () => {
            const plainLayer = { id: 'l1' }; // no getAllDecorations
            const store = makeStore({ layers: [plainLayer] });
            const handler = new ExportLayersHandler(store, () => { });
            const result = await handler.execute({ selectedLayerIds: ['l1'] });
            expect(result.decorationCount).toBe(0);
        });
    });

    describe('download trigger', () => {
        test('calls the download function with xml string and filename', async () => {
            const layer = makeLayer('l1', 'Layer 1', [makeDecoration('d1', 'Test')]);
            const store = makeStore({ layers: [layer] });
            const calls = [];
            const handler = new ExportLayersHandler(store, (xml, filename) => calls.push({ xml, filename }));

            await handler.execute({ selectedLayerIds: ['l1'] });

            expect(calls.length).toBe(1);
            expect(typeof calls[0].xml).toBe('string');
            expect(calls[0].xml).toContain('<?xml');
            expect(calls[0].filename).toContain('.xml');
        });

        // Lines 93-102: Blob + anchor click fallback (no _downloadFn, no showSaveFilePicker)
        test('falls back to Blob anchor click when no _downloadFn and no showSaveFilePicker', async () => {
            const layer = makeLayer('l1', 'Layer 1');
            const store = makeStore({ layers: [layer] });

            // jsdom does not implement URL.createObjectURL – mock it
            const originalCreate = URL.createObjectURL;
            const originalRevoke = URL.revokeObjectURL;
            URL.createObjectURL = vi.fn(() => 'blob:mock-url');
            URL.revokeObjectURL = vi.fn();

            // Ensure showSaveFilePicker is not set
            const savedPicker = window.showSaveFilePicker;
            delete window.showSaveFilePicker;

            const handler = new ExportLayersHandler(store); // no _downloadFn
            const result = await handler.execute({ selectedLayerIds: ['l1'] });

            expect(result.success).toBe(true);
            expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

            // Restore
            URL.createObjectURL = originalCreate;
            URL.revokeObjectURL = originalRevoke;
            if (savedPicker !== undefined) window.showSaveFilePicker = savedPicker;
        });

        // Lines 73-84: showSaveFilePicker success path
        test('uses showSaveFilePicker when available', async () => {
            const layer = makeLayer('l1', 'Layer 1');
            const store = makeStore({ layers: [layer] });

            const writableMock = { write: vi.fn(), close: vi.fn() };
            const handleMock = { createWritable: vi.fn(() => Promise.resolve(writableMock)) };
            window.showSaveFilePicker = vi.fn(() => Promise.resolve(handleMock));

            const handler = new ExportLayersHandler(store); // no _downloadFn
            const result = await handler.execute({ selectedLayerIds: ['l1'] });

            expect(result.success).toBe(true);
            expect(window.showSaveFilePicker).toHaveBeenCalledTimes(1);
            expect(writableMock.write).toHaveBeenCalledTimes(1);
            expect(writableMock.close).toHaveBeenCalledTimes(1);

            delete window.showSaveFilePicker;
        });

        // Line 87: showSaveFilePicker throws AbortError → silently returns
        test('ignores AbortError from showSaveFilePicker (user dismissed dialog)', async () => {
            const layer = makeLayer('l1', 'Layer 1');
            const store = makeStore({ layers: [layer] });

            const abortErr = new Error('User dismissed');
            abortErr.name = 'AbortError';
            window.showSaveFilePicker = vi.fn(() => Promise.reject(abortErr));

            const handler = new ExportLayersHandler(store); // no _downloadFn
            const result = await handler.execute({ selectedLayerIds: ['l1'] });

            expect(result.success).toBe(true);

            delete window.showSaveFilePicker;
        });

        // Lines 89-90 + 93-102: showSaveFilePicker throws non-AbortError → falls back to Blob
        test('falls back to Blob when showSaveFilePicker throws non-AbortError', async () => {
            const layer = makeLayer('l1', 'Layer 1');
            const store = makeStore({ layers: [layer] });

            const originalCreate = URL.createObjectURL;
            const originalRevoke = URL.revokeObjectURL;
            URL.createObjectURL = vi.fn(() => 'blob:fallback-url');
            URL.revokeObjectURL = vi.fn();

            const networkErr = new Error('NetworkError');
            networkErr.name = 'NetworkError';
            window.showSaveFilePicker = vi.fn(() => Promise.reject(networkErr));

            const handler = new ExportLayersHandler(store); // no _downloadFn
            const result = await handler.execute({ selectedLayerIds: ['l1'] });

            expect(result.success).toBe(true);
            expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

            URL.createObjectURL = originalCreate;
            URL.revokeObjectURL = originalRevoke;
            delete window.showSaveFilePicker;
        });
    });
});
