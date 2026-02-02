// @ts-nocheck
/**
 * Tests for SwitchMapHandler
 * Covers: clear all layers, load new map, undo history cleared
 */
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { MapBoundary } from '../../src/domain/MapBoundary.js';
import { Layer } from '../../src/domain/Layer.js';
import { Decoration } from '../../src/domain/Decoration.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { UndoRedoManager } from '../../src/application/UndoRedoManager.js';
import { UndoRecord } from '../../src/application/UndoRecord.js';
import { XmlLayoutAdapter } from '../../src/infrastructure/XmlLayoutAdapter.js';
import { SwitchMapHandler } from '../../src/application/handlers/SwitchMapHandler.js';

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
 * Helper: create a HomesteadLayout with a map and layers loaded
 */
function createLayoutWithMapAndLayers(mapId = 1395, mapName = 'Isle of Reflection') {
    const layout = new HomesteadLayout('test-layout', 'Test');
    const map = new GW2Map(mapId, mapName, 1, 1);
    map.boundary = new MapBoundary([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
    map.validateState = () => ({ isValid: true, errors: [] });
    layout.setMap(map);

    // Add two layers with decorations
    const layer1 = new Layer('layer-1', 'Layer 1');
    layer1.addDecoration(new Decoration('d1', 'Flower Pot', new WorldCoordinate(10, 20, 0, 0), 0, 1));
    layer1.addDecoration(new Decoration('d2', 'Stone Wall', new WorldCoordinate(30, 40, 0, 0), 0, 1));
    layout.addLayer(layer1);

    const layer2 = new Layer('layer-2', 'Layer 2');
    layer2.addDecoration(new Decoration('d3', 'Tree', new WorldCoordinate(50, 60, 0, 0), 0, 1));
    layout.addLayer(layer2);

    return layout;
}

describe('SwitchMapHandler', () => {
    let xmlAdapter;
    let undoRedoManager;

    beforeEach(() => {
        xmlAdapter = new XmlLayoutAdapter();
        undoRedoManager = new UndoRedoManager();
        UndoRecord._resetIdCounter();
    });

    describe('constructor', () => {
        test('should create handler instance', () => {
            const layout = new HomesteadLayout('t1', 'Test');
            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);
            expect(handler).toBeTruthy();
            expect(handler.layout).toBe(layout);
        });
    });

    describe('execute', () => {
        test('should clear all existing layers', () => {
            const layout = createLayoutWithMapAndLayers();
            expect(layout.getLayerCount()).toBe(2);

            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);
            const xml = createLayoutXml(1465, 'Shimmering Equinox', [
                { id: 10, name: 'Lamp Post', x: 100, y: 200 }
            ]);

            handler.execute({ xmlContent: xml, fileName: 'new-layout.xml' });

            // Old layers should be gone — only the new one should exist
            const layers = layout.getAllLayers();
            expect(layers.length).toBe(1);
            expect(layers[0].name).toBe('new-layout');
        });

        test('should load the new map', () => {
            const layout = createLayoutWithMapAndLayers(1395, 'Isle of Reflection');
            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);

            const xml = createLayoutXml(1465, 'Shimmering Equinox', [
                { id: 10, name: 'Lamp Post', x: 100, y: 200 }
            ]);

            const result = handler.execute({ xmlContent: xml, fileName: 'new-layout.xml' });

            expect(result.success).toBe(true);
            expect(result.decorationCount).toBe(1);
        });

        test('should create a layer from the new layout', () => {
            const layout = createLayoutWithMapAndLayers();
            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);

            const xml = createLayoutXml(1465, 'Shimmering Equinox', [
                { id: 10, name: 'Lamp Post', x: 100, y: 200 },
                { id: 11, name: 'Bench', x: 150, y: 250 }
            ]);

            const result = handler.execute({ xmlContent: xml, fileName: 'equinox-layout.xml' });

            expect(result.success).toBe(true);
            expect(result.layerId).toBeDefined();
            expect(result.layerName).toBe('equinox-layout');
            expect(result.decorationCount).toBe(2);
        });

        test('should clear undo/redo history', () => {
            const layout = createLayoutWithMapAndLayers();
            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);

            // Push some undo records
            undoRedoManager.push(new UndoRecord({
                label: 'Some action',
                commandType: 'TEST',
                forwardData: { a: 1 },
                reverseData: { a: 0 }
            }));
            expect(undoRedoManager.canUndo()).toBe(true);

            const xml = createLayoutXml(1465, 'Shimmering Equinox', [
                { id: 10, name: 'Lamp Post', x: 100, y: 200 }
            ]);

            handler.execute({ xmlContent: xml, fileName: 'new.xml' });

            expect(undoRedoManager.canUndo()).toBe(false);
            expect(undoRedoManager.canRedo()).toBe(false);
        });

        test('should emit AllLayersClearedEvent and MapSwitchedEvent', () => {
            const layout = createLayoutWithMapAndLayers(1395, 'Isle of Reflection');
            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);

            const xml = createLayoutXml(1465, 'Shimmering Equinox', [
                { id: 10, name: 'Lamp Post', x: 100, y: 200 }
            ]);

            handler.execute({ xmlContent: xml, fileName: 'new.xml' });

            const events = layout.getPendingEvents();
            const clearedEvent = events.find(e => e.eventType === 'AllLayersCleared');
            expect(clearedEvent).toBeDefined();
            expect(clearedEvent.previousLayerCount).toBe(2);

            const layerCreatedEvent = events.find(e => e.eventType === 'LayerCreated');
            expect(layerCreatedEvent).toBeDefined();
        });

        test('should throw on empty xmlContent', () => {
            const layout = createLayoutWithMapAndLayers();
            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);

            expect(() => handler.execute({ xmlContent: '', fileName: 'f.xml' }))
                .toThrow();
        });

        test('should throw on null xmlContent', () => {
            const layout = createLayoutWithMapAndLayers();
            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);

            expect(() => handler.execute({ xmlContent: null, fileName: 'f.xml' }))
                .toThrow();
        });

        test('should set the first layer as active layer', () => {
            const layout = createLayoutWithMapAndLayers();
            const handler = new SwitchMapHandler(layout, xmlAdapter, undoRedoManager);

            const xml = createLayoutXml(1465, 'Shimmering Equinox', [
                { id: 10, name: 'Lamp Post', x: 100, y: 200 }
            ]);

            const result = handler.execute({ xmlContent: xml, fileName: 'new.xml' });

            expect(layout.activeLayerId).toBe(result.layerId);
        });
    });
});
