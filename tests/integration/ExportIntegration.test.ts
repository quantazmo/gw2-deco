// @ts-nocheck
/**
 * Integration tests for the Export XML pipeline.
 * Tests the full chain: build state → ExportLayersHandler → XmlExportAdapter → parse XML output.
 */
import { ExportLayersHandler } from '../../src/application/handlers/ExportLayersHandler.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';

/** Build a minimal AppStore stub from a state snapshot */
function makeStore(state) {
    return { getState: () => state };
}

/** Build a lightweight map object matching what AppStore exposes */
function makeMap(id = 38, name = 'Gilded Hollow') {
    return { id, name };
}

/** Build a Layer with named decorations */
function makeLayer(id, name, visible = true, decs = []) {
    const layer = new Layer(id, name);
    layer.isVisible = visible;
    for (const { decId, decName, x = 0, y = 0, mapX = 0, mapY = 0 } of decs) {
        const coord = new WorldCoordinate(x, y, mapX, mapY);
        const dec = new Decoration(decId, decName, coord);
        layer.addDecoration(dec);
    }
    return layer;
}

describe('Export XML Integration', () => {
    describe('Full pipeline — build state → handler → serialize → parse', () => {
        test('produces valid XML with correct root attributes', async () => {
            const map = makeMap(38, 'Gilded Hollow');
            const layer = makeLayer('l1', 'Layer 1', true, [
                { decId: '101', decName: 'Flower Bed', x: 1.5, y: 2.0 }
            ]);
            const downloads = [];
            const store = makeStore({ layout: {}, map, layers: [layer] });
            const handler = new ExportLayersHandler(store, (xml) => downloads.push(xml));

            await handler.execute({ selectedLayerIds: ['l1'] });

            expect(downloads.length).toBe(1);
            const xml = downloads[0];
            expect(xml).toContain('mapId="38"');
            expect(xml).toContain('mapName="Gilded Hollow"');
            expect(xml).toContain('version="1"');
        });

        test('output contains a <prop> entry for each decoration', async () => {
            const map = makeMap(38, 'Gilded Hollow');
            const layer = makeLayer('l1', 'Layer 1', true, [
                { decId: '101', decName: 'Flower Bed' },
                { decId: '102', decName: 'Stone Path' }
            ]);
            const downloads = [];
            const store = makeStore({ layout: {}, map, layers: [layer] });
            const handler = new ExportLayersHandler(store, (xml) => downloads.push(xml));

            await handler.execute({ selectedLayerIds: ['l1'] });

            const xml = downloads[0];
            const propMatches = xml.match(/<prop /g) || [];
            expect(propMatches.length).toBe(2);
        });

        test('only selected layers are included in output', async () => {
            const map = makeMap(38, 'Test Map');
            const layerA = makeLayer('l1', 'Layer A', true, [
                { decId: '1', decName: 'Dec A' }
            ]);
            const layerB = makeLayer('l2', 'Layer B', true, [
                { decId: '2', decName: 'Dec B' }
            ]);
            const downloads = [];
            const store = makeStore({ layout: {}, map, layers: [layerA, layerB] });
            const handler = new ExportLayersHandler(store, (xml) => downloads.push(xml));

            await handler.execute({ selectedLayerIds: ['l1'] }); // only layer A

            const xml = downloads[0];
            expect(xml).toContain('Dec A');
            expect(xml).not.toContain('Dec B');
        });

        test('preserves store layer order in output', async () => {
            const map = makeMap(38, 'Test Map');
            const layerA = makeLayer('l1', 'Layer A', true, [
                { decId: '1', decName: 'Alpha' }
            ]);
            const layerB = makeLayer('l2', 'Layer B', true, [
                { decId: '2', decName: 'Beta' }
            ]);
            const downloads = [];
            const store = makeStore({ layout: {}, map, layers: [layerA, layerB] });
            const handler = new ExportLayersHandler(store, (xml) => downloads.push(xml));

            await handler.execute({ selectedLayerIds: ['l2', 'l1'] }); // reversed selection

            const xml = downloads[0];
            const alphaIdx = xml.indexOf('Alpha');
            const betaIdx = xml.indexOf('Beta');
            // Store order (A before B) should be preserved regardless of selection order
            expect(alphaIdx).toBeLessThan(betaIdx);
        });

        test('returns correct decorationCount and filename', async () => {
            const map = makeMap(38, 'Gilded Hollow');
            const layer = makeLayer('l1', 'Layer 1', true, [
                { decId: '1', decName: 'A' },
                { decId: '2', decName: 'B' },
                { decId: '3', decName: 'C' }
            ]);
            const store = makeStore({ layout: {}, map, layers: [layer] });
            const handler = new ExportLayersHandler(store, () => { });

            const result = await handler.execute({ selectedLayerIds: ['l1'] });

            expect(result.success).toBe(true);
            expect(result.decorationCount).toBe(3);
            expect(result.filename).toBe('Gilded Hollow.xml');
        });

        test('XML-escapes map name and decoration names', async () => {
            const map = makeMap(38, 'A & B <Map>');
            const layer = makeLayer('l1', 'L', true, [
                { decId: '1', decName: 'Rose "Garden"' }
            ]);
            const downloads = [];
            const store = makeStore({ layout: {}, map, layers: [layer] });
            const handler = new ExportLayersHandler(store, (xml) => downloads.push(xml));

            await handler.execute({ selectedLayerIds: ['l1'] });

            const xml = downloads[0];
            expect(xml).toContain('mapName="A &amp; B &lt;Map&gt;"');
            expect(xml).toContain('name="Rose &quot;Garden&quot;"');
        });

        test('empty layer selection throws an error', async () => {
            const map = makeMap(38, 'Test Map');
            const store = makeStore({ layout: {}, map, layers: [] });
            const handler = new ExportLayersHandler(store, () => { });

            await expect(handler.execute({ selectedLayerIds: [] })).rejects.toThrow();
        });

        test('null layout throws an error', async () => {
            const map = makeMap(38, 'Test Map');
            const store = makeStore({ layout: null, map, layers: [] });
            const handler = new ExportLayersHandler(store, () => { });

            await expect(handler.execute({ selectedLayerIds: ['l1'] })).rejects.toThrow();
        });

        test('null map throws an error', async () => {
            const store = makeStore({ layout: {}, map: null, layers: [] });
            const handler = new ExportLayersHandler(store, () => { });

            await expect(handler.execute({ selectedLayerIds: ['l1'] })).rejects.toThrow();
        });
    });
});
