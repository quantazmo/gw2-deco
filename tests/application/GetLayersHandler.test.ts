// @ts-nocheck
/**
 * Tests for src/application/handlers/GetLayersHandler.js
 * Tests the application layer query handling for retrieving layers
 */
import { GetLayersHandler } from '../../src/application/handlers/GetLayersHandler.js';
import { GetLayersQuery } from '../../src/application/queries/GetLayersQuery.js';
import { HomesteadLayout } from '../../src/domain/HomesteadLayout.js';
import { GW2Map } from '../../src/domain/GW2Map.js';
import { Layer } from '../../src/domain/Layer.js';
import { LayerId } from '../../src/domain/LayerId.js';
import { WorldCoordinate } from '../../src/domain/WorldCoordinate.js';
import { Decoration } from '../../src/domain/Decoration.js';

describe('GetLayersHandler', () => {

    test('constructor should create handler instance', () => {
        const handler = new GetLayersHandler();
        expect(handler).toBeTruthy();
    });

    test('handle should return empty list for layout with no layers', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        const query = new GetLayersQuery(layout);

        const result = handler.handle(query);

        expect(result).toBeTruthy();
        expect(Array.isArray(result.layers)).toBe(true);
        expect(result.layers.length).toBe(0);
    });

    test('handle should return all layers from layout', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layer1 = new Layer('layer-1', 'Layer 1');
        const layer2 = new Layer('layer-2', 'Layer 2');
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        layout.addLayer(layer1);
        layout.addLayer(layer2);
        const query = new GetLayersQuery(layout);

        const result = handler.handle(query);

        expect(result.layers.length).toBe(2);
        expect(result.layers[0].name).toBe('Layer 1');
        expect(result.layers[1].name).toBe('Layer 2');
    });

    test('handle should return layer DTOs', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layer = new Layer('layer-1', 'Test Layer');
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        layout.addLayer(layer);
        const query = new GetLayersQuery(layout);

        const result = handler.handle(query);

        const layerDto = result.layers[0];
        expect(layerDto.id).toBeTruthy();
        expect(layerDto.name).toBeTruthy();
        expect(layerDto.isVisible).toBeDefined();
        expect(Array.isArray(layerDto.decorations)).toBe(true);
    });

    test('handle should throw on null query', () => {
        const handler = new GetLayersHandler();

        expect(() => {
            handler.handle(null);
        }).toThrow();
    });

    test('handle should throw on null layout in query', () => {
        const handler = new GetLayersHandler();

        expect(() => {
            const query = new GetLayersQuery(null);
        }).toThrow();
    });

    test('handle should preserve layer order', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0); map.addTile({ x: 0, y: 0 }); const layer1 = new Layer('layer-1', 'First');
        const layer2 = new Layer('layer-2', 'Second');
        const layer3 = new Layer('layer-3', 'Third');
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        layout.addLayer(layer1);
        layout.addLayer(layer2);
        layout.addLayer(layer3);
        const query = new GetLayersQuery(layout);

        const result = handler.handle(query);

        expect(result.layers[0].name).toBe('First');
        expect(result.layers[1].name).toBe('Second');
        expect(result.layers[2].name).toBe('Third');
    });

    test('handle should include layer visibility state', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0); map.addTile({ x: 0, y: 0 }); const layer1 = new Layer('layer-1', 'Visible Layer');
        layer1.toggleVisibility(); // Make it hidden
        const layer2 = new Layer('layer-2', 'Visible Layer 2');
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        layout.addLayer(layer1);
        layout.addLayer(layer2);
        const query = new GetLayersQuery(layout);

        const result = handler.handle(query);

        expect(result.layers[0].isVisible).toBe(false);
        expect(result.layers[1].isVisible).toBe(true);
    });

    test('handle should include decoration count', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layer = new Layer('layer-1', 'Test Layer');
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        layout.addLayer(layer);

        const coord1 = new WorldCoordinate(100, 200, 0, 0);
        const coord2 = new WorldCoordinate(150, 250, 0, 0);
        const deco1 = new Decoration('deco-1', 'Torch', coord1);
        const deco2 = new Decoration('deco-2', 'Flower', coord2);

        layer.addDecoration(deco1);
        layer.addDecoration(deco2);

        const query = new GetLayersQuery(layout);
        const result = handler.handle(query);

        expect(result.layers[0].decorations.length).toBe(2);
    });

    test('handle should work with multiple different layouts', () => {
        const handler = new GetLayersHandler();
        const map1 = new GW2Map(1, 'Map 1', 1, 0);
        map1.addTile({ x: 0, y: 0 });
        const map2 = new GW2Map(2, 'Map 2', 1, 0);
        map2.addTile({ x: 0, y: 0 });

        const layer1 = new Layer('layer-1', 'Layer A');
        const layer2 = new Layer('layer-2', 'Layer B');

        const layout1 = new HomesteadLayout('layout-1', 'Layout 1');
        layout1.setMap(map1);
        layout1.addLayer(layer1);

        const layout2 = new HomesteadLayout('layout-2', 'Layout 2');
        layout2.setMap(map2);
        layout2.addLayer(layer2);

        const query1 = new GetLayersQuery(layout1);
        const query2 = new GetLayersQuery(layout2);

        const result1 = handler.handle(query1);
        const result2 = handler.handle(query2);

        expect(result1.layers[0].name).toBe('Layer A');
        expect(result2.layers[0].name).toBe('Layer B');
    });

    test('handle should return result with layout reference', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layer = new Layer('layer-1', 'Test Layer');
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        layout.addLayer(layer);
        const query = new GetLayersQuery(layout);

        const result = handler.handle(query);

        expect(result.layout).toBeTruthy();
        expect(result.layout.id).toBe('layout-1');
    });

    test('handle should not modify layout state', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0); map.addTile({ x: 0, y: 0 }); const layer = new Layer('layer-1', 'Test Layer');
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        layout.addLayer(layer);
        const originalLayerCount = layout.layers.size;

        const query = new GetLayersQuery(layout);
        handler.handle(query);

        expect(layout.layers.size).toBe(originalLayerCount);
    });

    test('handle should include all layer properties in DTO', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Test Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layer = new Layer('layer-1', 'Test Layer');
        layer.toggleVisibility();
        const layout = new HomesteadLayout('layout-1', 'Test Layout');
        layout.setMap(map);
        layout.addLayer(layer);

        const query = new GetLayersQuery(layout);
        const result = handler.handle(query);
        const dto = result.layers[0];

        expect(dto.id).toBe('layer-1');
        expect(dto.name).toBe('Test Layer');
        expect(dto.isVisible).toBe(false);
        expect(Array.isArray(dto.decorations)).toBe(true);
    });

    test('handle should handle empty layout gracefully', () => {
        const handler = new GetLayersHandler();
        const map = new GW2Map(1, 'Empty Map', 1, 0);
        map.addTile({ x: 0, y: 0 });
        const layout = new HomesteadLayout('layout-1', 'Empty Layout');
        layout.setMap(map);

        const query = new GetLayersQuery(layout);
        const result = handler.handle(query);

        expect(result).toBeTruthy();
        expect(result.layers.length).toBe(0);
        expect(result.layout).toBeTruthy();
    });

});
