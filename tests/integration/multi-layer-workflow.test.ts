// @ts-nocheck
/**
 * Integration tests for multi-layer loading workflow
 * Covers: load first layout, load second same-map layout, verify both layers' decorations exist
 */
import { LoadAdditionalLayoutHandler } from '../../src/application/handlers/LoadAdditionalLayoutHandler.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { MapBoundary } from '../../src/domain/MapBoundary.js';
import { Layer } from '../../src/domain/Layer.js';
import { XmlLayoutAdapter } from '../../src/infrastructure/XmlLayoutAdapter.js';

/**
 * Helper: create a minimal valid XML layout string
 */
function createLayoutXml(mapId, mapName, decorations = []) {
    const props = decorations.map(d =>
        `<prop id="${d.id}" name="${d.name}" pos="${d.x} ${d.y} ${d.z || 0}" rot="0 0 0" scl="${d.scale || 1}"/>`
    ).join('\n    ');

    return `<?xml version="1.0" encoding="utf-8"?>
<homestead mapId="${mapId}" mapName="${mapName}">
    ${props}
</homestead>`;
}

/**
 * Helper: create a HomesteadLayout and simulate first load by setting map
 */
function setupLayoutWithFirstLoad(mapId = 1395, mapName = 'Isle of Reflection') {
    const layout = new HomesteadLayout('test-layout', 'Test');
    const map = new GW2Map(mapId, mapName, 1, 1);
    map.boundary = new MapBoundary([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
    map.validateState = () => ({ isValid: true, errors: [] });
    layout.setMap(map);
    return layout;
}

describe('Multi-Layer Loading Integration Tests', () => {
    let xmlAdapter;

    beforeEach(() => {
        xmlAdapter = new XmlLayoutAdapter();
    });

    test('loading first layout should create first layer with decorations', () => {
        const layout = new HomesteadLayout('t1', 'Test');
        const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

        const xml = createLayoutXml(1395, 'Isle of Reflection', [
            { id: 1, name: 'Oak Tree', x: 100, y: 200, z: 5 },
            { id: 2, name: 'Stone Bench', x: 300, y: 400, z: 0 },
            { id: 3, name: 'Lamp Post', x: 500, y: 600, z: 0 }
        ]);

        const result = handler.execute({ xmlContent: xml, fileName: 'first-layout.xml' });

        expect(result.success).toBe(true);
        expect(result.decorationCount).toBe(3);
        expect(layout.getLayerCount()).toBe(1);

        const layer = layout.getLayer(result.layerId);
        expect(layer).toBeTruthy();
        expect(layer.getDecorationCount()).toBe(3);
        // decoration.id is the XML prop-type; uid is the unique Map key
        const decorations = layer.getAllDecorations();
        expect(decorations.find(d => d.id === '1').name).toBe('Oak Tree');
        expect(decorations.find(d => d.id === '2').name).toBe('Stone Bench');
        expect(decorations.find(d => d.id === '3').name).toBe('Lamp Post');
    });

    test('loading second same-map layout should add second layer alongside first', () => {
        const layout = setupLayoutWithFirstLoad(1395, 'Isle of Reflection');
        const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

        // First load
        const xml1 = createLayoutXml(1395, 'Isle of Reflection', [
            { id: 1, name: 'Oak Tree', x: 100, y: 200, z: 0 },
            { id: 2, name: 'Bench', x: 300, y: 400, z: 0 }
        ]);
        const result1 = handler.execute({ xmlContent: xml1, fileName: 'layer-a.xml' });

        // Second load (same map)
        const xml2 = createLayoutXml(1395, 'Isle of Reflection', [
            { id: 10, name: 'Fountain', x: 150, y: 250, z: 0 },
            { id: 11, name: 'Hedge', x: 350, y: 450, z: 0 }
        ]);
        const result2 = handler.execute({ xmlContent: xml2, fileName: 'layer-b.xml' });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(layout.getLayerCount()).toBe(2);

        // Verify both layers exist independently
        const layerA = layout.getLayer(result1.layerId);
        const layerB = layout.getLayer(result2.layerId);

        expect(layerA).toBeTruthy();
        expect(layerB).toBeTruthy();
        expect(layerA.name).toBe('layer-a');
        expect(layerB.name).toBe('layer-b');

        // Verify decorations in each layer
        expect(layerA.getDecorationCount()).toBe(2);
        expect(layerB.getDecorationCount()).toBe(2);
        // decoration.id is the XML prop-type; look up by id, not Map key
        expect(layerA.getAllDecorations().find(d => d.id === '1').name).toBe('Oak Tree');
        expect(layerB.getAllDecorations().find(d => d.id === '10').name).toBe('Fountain');
    });

    test('both layers\' decorations should all be visible in the layout', () => {
        const layout = setupLayoutWithFirstLoad(1395, 'Isle of Reflection');
        const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

        // Load two layers
        const xml1 = createLayoutXml(1395, 'Isle of Reflection', [
            { id: 1, name: 'Dec A', x: 10, y: 20, z: 0 }
        ]);
        const xml2 = createLayoutXml(1395, 'Isle of Reflection', [
            { id: 5, name: 'Dec B', x: 30, y: 40, z: 0 }
        ]);

        handler.execute({ xmlContent: xml1, fileName: 'a.xml' });
        handler.execute({ xmlContent: xml2, fileName: 'b.xml' });

        // All visible decoration prop-type IDs should include both layers
        const allDecorations = layout.getAllLayers()
            .filter(l => l.isVisible)
            .flatMap(l => l.getAllDecorations());
        const visiblePropIds = allDecorations.map(d => d.id);
        expect(visiblePropIds).toContain('1');
        expect(visiblePropIds).toContain('5');
        expect(visiblePropIds.length).toBe(2);
    });

    test('loading three layers sequentially should all coexist', () => {
        const layout = setupLayoutWithFirstLoad(1395, 'Isle of Reflection');
        const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

        const results = [];
        for (let i = 0; i < 3; i++) {
            const xml = createLayoutXml(1395, 'Isle of Reflection', [
                { id: i * 10 + 1, name: `Dec ${i}-1`, x: i * 100, y: i * 100, z: 0 },
                { id: i * 10 + 2, name: `Dec ${i}-2`, x: i * 100 + 50, y: i * 100 + 50, z: 0 }
            ]);
            results.push(handler.execute({ xmlContent: xml, fileName: `layer-${i}.xml` }));
        }

        expect(layout.getLayerCount()).toBe(3);
        expect(layout.getTotalDecorationCount()).toBe(6);

        // Each layer should have 2 decorations
        for (const result of results) {
            const layer = layout.getLayer(result.layerId);
            expect(layer.getDecorationCount()).toBe(2);
        }
    });

    test('loading a different-map layout should return confirmation, not add layer', () => {
        const layout = setupLayoutWithFirstLoad(1395, 'Isle of Reflection');
        layout.addLayer(new Layer('existing', 'Existing Layer'));

        const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

        const xml = createLayoutXml(1465, 'Shimmering Equinox', [
            { id: 1, name: 'Palm Tree', x: 50, y: 60, z: 0 }
        ]);

        const result = handler.execute({ xmlContent: xml, fileName: 'diff-map.xml' });

        expect(result.requiresConfirmation).toBe(true);
        expect(result.success).toBe(false);
        // Layer count should remain unchanged
        expect(layout.getLayerCount()).toBe(1);
    });

    test('layer creation should emit domain events for each load', () => {
        const layout = setupLayoutWithFirstLoad(1395, 'Isle of Reflection');
        const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

        const xml1 = createLayoutXml(1395, 'Isle of Reflection', [
            { id: 1, name: 'D1', x: 0, y: 0, z: 0 }
        ]);
        const xml2 = createLayoutXml(1395, 'Isle of Reflection', [
            { id: 2, name: 'D2', x: 1, y: 1, z: 0 }
        ]);

        handler.execute({ xmlContent: xml1, fileName: 'a.xml' });
        handler.execute({ xmlContent: xml2, fileName: 'b.xml' });

        const events = layout.getPendingEvents();
        expect(events.length).toBe(2);
        expect(events[0].eventType).toBe('LayerCreated');
        expect(events[1].eventType).toBe('LayerCreated');
        expect(events[0].layerName).toBe('a');
        expect(events[1].layerName).toBe('b');
    });

    test('active layer should be set to first layer added', () => {
        const layout = setupLayoutWithFirstLoad(1395, 'Isle of Reflection');
        const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

        const xml = createLayoutXml(1395, 'Isle of Reflection', [
            { id: 1, name: 'D1', x: 0, y: 0, z: 0 }
        ]);

        const result = handler.execute({ xmlContent: xml, fileName: 'first.xml' });

        // First layer should become active
        expect(layout.activeLayerId).toBe(result.layerId);
    });
});
