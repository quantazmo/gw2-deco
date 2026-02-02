// @ts-nocheck
/**
 * Tests for LoadAdditionalLayoutHandler
 * Covers: same-map layer addition, different-map confirmation return, first-load behavior
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
function createLayoutXml(mapId = 1395, mapName = 'Isle of Reflection', decorations = []) {
    const props = decorations.map(d =>
        `<prop id="${d.id}" name="${d.name}" pos="${d.x} ${d.y} ${d.z || 0}" rot="0 0 0" scl="${d.scale || 1}"/>`
    ).join('\n        ');

    return `<?xml version="1.0" encoding="utf-8"?>
<homestead mapId="${mapId}" mapName="${mapName}">
        ${props}
</homestead>`;
}

/**
 * Helper: create a HomesteadLayout with a map loaded
 */
function createLayoutWithMap(mapId = 1395, mapName = 'Isle of Reflection') {
    const layout = new HomesteadLayout('test-layout', 'Test');
    const map = new GW2Map(mapId, mapName, 1, 1);
    // GW2Map needs boundary for setMap validation
    map.boundary = new MapBoundary([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
    // Override validateState to return valid for test simplicity
    map.validateState = () => ({ isValid: true, errors: [] });

    layout.setMap(map);
    return layout;
}

describe('LoadAdditionalLayoutHandler', () => {
    let xmlAdapter;

    beforeEach(() => {
        xmlAdapter = new XmlLayoutAdapter();
    });

    describe('constructor', () => {
        test('should create handler instance with layout and xmlAdapter', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);
            expect(handler).toBeTruthy();
            expect(handler.layout).toBe(layout);
            expect(handler.xmlAdapter).toBe(xmlAdapter);
        });
    });

    describe('first-load behavior (no map loaded)', () => {
        test('should create a layer when no map is currently loaded', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(1395, 'Isle of Reflection', [
                { id: 1, name: 'Flower Pot', x: 100, y: 200, z: 0 }
            ]);

            const result = handler.execute({ xmlContent: xml, fileName: 'my-layout.xml' });

            expect(result.success).toBe(true);
            expect(result.layerId).toBeDefined();
            expect(result.layerName).toBe('my-layout');
            expect(result.decorationCount).toBe(1);
            expect(layout.getLayerCount()).toBe(1);
        });

        test('should use layout name if no fileName provided', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(1395, 'Isle of Reflection');
            const result = handler.execute({ xmlContent: xml });

            expect(result.success).toBe(true);
            expect(result.layerName).toBe('Layer 1');
        });
    });

    describe('same-map layer addition', () => {
        test('should add a new layer for the same map', () => {
            const layout = createLayoutWithMap(1395, 'Isle of Reflection');
            // Add an existing layer
            layout.addLayer(new Layer('existing-layer', 'Existing Layer'));

            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(1395, 'Isle of Reflection', [
                { id: 10, name: 'Bench', x: 50, y: 60, z: 0 },
                { id: 11, name: 'Lamp', x: 70, y: 80, z: 0 }
            ]);

            const result = handler.execute({ xmlContent: xml, fileName: 'additions.xml' });

            expect(result.success).toBe(true);
            expect(result.decorationCount).toBe(2);
            expect(result.layerName).toBe('additions');
            // Now should have 2 layers
            expect(layout.getLayerCount()).toBe(2);
        });

        test('should preserve existing layers when adding another', () => {
            const layout = createLayoutWithMap(1395, 'Isle of Reflection');
            const existingLayer = new Layer('layer-1', 'First Layer');
            layout.addLayer(existingLayer);

            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(1395, 'Isle of Reflection', [
                { id: 20, name: 'Tree', x: 10, y: 20, z: 0 }
            ]);

            handler.execute({ xmlContent: xml, fileName: 'second.xml' });

            // Original layer should still be there
            expect(layout.getLayer('layer-1')).toBe(existingLayer);
            expect(layout.getLayerCount()).toBe(2);
        });

        test('should emit LayerCreatedEvent on successful addition', () => {
            const layout = createLayoutWithMap(1395, 'Isle of Reflection');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(1395, 'Isle of Reflection', [
                { id: 5, name: 'Statue', x: 30, y: 40, z: 0 }
            ]);

            handler.execute({ xmlContent: xml, fileName: 'test.xml' });

            const events = layout.getPendingEvents();
            expect(events.length).toBe(1);
            expect(events[0].constructor.name).toBe('LayerCreatedEvent');
            expect(events[0].layerName).toBe('test');
        });

        test('should add decorations to the new layer correctly', () => {
            const layout = createLayoutWithMap(1395, 'Isle of Reflection');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(1395, 'Isle of Reflection', [
                { id: 100, name: 'Fountain', x: 500, y: 600, z: 10 },
                { id: 101, name: 'Hedge', x: 700, y: 800, z: 0 }
            ]);

            const result = handler.execute({ xmlContent: xml, fileName: 'deco.xml' });

            const layer = layout.getLayer(result.layerId);
            expect(layer).toBeTruthy();
            expect(layer.getDecorationCount()).toBe(2);
            const decorations = layer.getAllDecorations();
            // decoration.id is the XML prop-type id; decoration.uid is the unique instance id
            const fountain = decorations.find(d => d.id === '100');
            const hedge = decorations.find(d => d.id === '101');
            expect(fountain).toBeTruthy();
            expect(hedge).toBeTruthy();
            expect(fountain.name).toBe('Fountain');
            // Each decoration must have a unique uid (counter-based)
            expect(fountain.uid).not.toBe(hedge.uid);
            expect(Number(fountain.uid)).not.toBeNaN();
        });
    });

    describe('different-map confirmation return', () => {
        test('should return requiresConfirmation when map IDs differ', () => {
            const layout = createLayoutWithMap(1395, 'Isle of Reflection');
            layout.addLayer(new Layer('layer-1', 'Layer 1'));

            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(1465, 'Shimmering Equinox', [
                { id: 1, name: 'Flower', x: 10, y: 20, z: 0 }
            ]);

            const result = handler.execute({ xmlContent: xml, fileName: 'other-map.xml' });

            expect(result.success).toBe(false);
            expect(result.requiresConfirmation).toBe(true);
            expect(result.currentMapId).toBe(1395);
            expect(result.currentMapName).toBe('Isle of Reflection');
            expect(result.newMapId).toBe(1465);
            expect(result.newMapName).toBe('Shimmering Equinox');
        });

        test('should not add a layer when confirmation is needed', () => {
            const layout = createLayoutWithMap(1395, 'Isle of Reflection');
            layout.addLayer(new Layer('layer-1', 'Layer 1'));

            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(9999, 'Different Map');
            handler.execute({ xmlContent: xml, fileName: 'diff.xml' });

            // Should still have only 1 layer
            expect(layout.getLayerCount()).toBe(1);
        });

        test('should include xmlContent and fileName in confirmation result for later use', () => {
            const layout = createLayoutWithMap(1395, 'Isle of Reflection');
            layout.addLayer(new Layer('layer-1', 'Layer 1'));

            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const xml = createLayoutXml(1465, 'Shimmering Equinox');
            const result = handler.execute({ xmlContent: xml, fileName: 'switch.xml' });

            expect(result.xmlContent).toBe(xml);
            expect(result.fileName).toBe('switch.xml');
        });
    });

    describe('validation', () => {
        test('should throw on empty xmlContent', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            expect(() => handler.execute({ xmlContent: '', fileName: 'test.xml' }))
                .toThrow('xmlContent is required');
        });

        test('should throw on null xmlContent', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            expect(() => handler.execute({ xmlContent: null, fileName: 'test.xml' }))
                .toThrow('xmlContent is required');
        });

        test('should throw on invalid XML', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            expect(() => handler.execute({ xmlContent: 'not xml at all', fileName: 'bad.xml' }))
                .toThrow();
        });
    });

    describe('rotX and rotZ propagation', () => {
        function createLayoutXmlWithRot(rotStr) {
            return `<?xml version="1.0" encoding="utf-8"?>
<homestead mapId="1395" mapName="Isle of Reflection">
    <prop id="1" name="TestProp" pos="0 0 0" rot="${rotStr}" scl="1"/>
</homestead>`;
        }

        test('rotX is set from rot[0] (first component)', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);
            const result = handler.execute({ xmlContent: createLayoutXmlWithRot('1.234567 0.000000 0.000000'), fileName: 'r.xml' });
            const layer = layout.getLayer(result.layerId);
            const dec = layer.getAllDecorations()[0];
            expect(dec.rotX).toBeCloseTo(1.234567, 5);
        });

        test('rotZ is set from rot[2] (third component)', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);
            const result = handler.execute({ xmlContent: createLayoutXmlWithRot('0.000000 0.000000 4.614214'), fileName: 'r.xml' });
            const layer = layout.getLayer(result.layerId);
            const dec = layer.getAllDecorations()[0];
            expect(dec.rotZ).toBeCloseTo(4.614214, 5);
        });

        test('rotation (ry) is still set from rot[1] (second component)', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);
            const result = handler.execute({ xmlContent: createLayoutXmlWithRot('0.000000 0.098175 0.000000'), fileName: 'r.xml' });
            const layer = layout.getLayer(result.layerId);
            const dec = layer.getAllDecorations()[0];
            expect(dec.rotation).toBeCloseTo(0.098175, 5);
        });

        test('all three rotation components are populated correctly', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);
            const result = handler.execute({ xmlContent: createLayoutXmlWithRot('1.0 2.0 3.0'), fileName: 'r.xml' });
            const layer = layout.getLayer(result.layerId);
            const dec = layer.getAllDecorations()[0];
            expect(dec.rotX).toBeCloseTo(1.0, 5);
            expect(dec.rotation).toBeCloseTo(2.0, 5);
            expect(dec.rotZ).toBeCloseTo(3.0, 5);
        });

        test('rotX and rotZ default to 0 when rot is all zeros', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);
            const result = handler.execute({ xmlContent: createLayoutXmlWithRot('0 0 0'), fileName: 'r.xml' });
            const layer = layout.getLayer(result.layerId);
            const dec = layer.getAllDecorations()[0];
            expect(dec.rotX).toBe(0);
            expect(dec.rotZ).toBe(0);
        });
    });

    describe('layer color assignment on load', () => {
        test('should assign a palette color to the created layer', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const result = handler.execute({ xmlContent: createLayoutXml(), fileName: 'test.xml' });

            const layer = layout.getLayer(result.layerId);
            expect(LAYER_COLORS).toContain(layer.color);
        });

        test('should not reuse a color already used when unused palette colors exist', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = createLayoutWithMap();
            // Pre-add a layer with a known palette color
            const existingLayer = new Layer('existing', 'Existing', true, LAYER_COLORS[0]);
            layout.addLayer(existingLayer);

            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);
            const result = handler.execute({ xmlContent: createLayoutXml(), fileName: 'new.xml' });

            const newLayer = layout.getLayer(result.layerId);
            expect(newLayer.color).not.toBe(LAYER_COLORS[0]);
            expect(LAYER_COLORS).toContain(newLayer.color);
        });

        test('should assign unique colors across multiple sequential loads', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = createLayoutWithMap();
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            const layerIds: string[] = [];
            for (let i = 0; i < LAYER_COLORS.length; i++) {
                const result = handler.execute({ xmlContent: createLayoutXml(), fileName: `layer${i}.xml` });
                layerIds.push(result.layerId);
            }

            const colors = layerIds.map(id => layout.getLayer(id).color);
            const uniqueColors = new Set(colors);
            expect(uniqueColors.size).toBe(LAYER_COLORS.length);
        });

        test('should fall back to a palette color when all palette colors are exhausted', async () => {
            const { LAYER_COLORS } = await import('../../src/config/constants.js');
            const layout = createLayoutWithMap();
            const handler = new LoadAdditionalLayoutHandler(layout, xmlAdapter);

            for (let i = 0; i < LAYER_COLORS.length; i++) {
                handler.execute({ xmlContent: createLayoutXml(), fileName: `l${i}.xml` });
            }

            const result = handler.execute({ xmlContent: createLayoutXml(), fileName: 'extra.xml' });
            const extraLayer = layout.getLayer(result.layerId);
            expect(LAYER_COLORS).toContain(extraLayer.color);
        });
    });
});
